const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MAX_BATCH_SIZE = 8;
const {
  buildStructuredFeedback,
  classifyFeedback,
  matchesQueryTerms,
  isRelevantCategory,
} = require('./feedbackRuleEngine');
const { detectSentiment, findGroup } = require('./issueAggregator');
const { classifyFeedbackScope } = require('./feedbackScope');

function getGroqApiKey() {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY on the backend.');
  }

  return apiKey;
}

async function groqJsonRequest(messages) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getGroqApiKey()}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Groq request failed.');
  }

  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Groq returned an empty response.');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Groq returned invalid JSON.');
  }
}

function chunk(items, size) {
  const batches = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function normalizeDecision(message, rawDecision) {
  const include = rawDecision?.include === true;
  const sentiment =
    rawDecision?.sentiment === 'positive' ||
    rawDecision?.sentiment === 'negative' ||
    rawDecision?.sentiment === 'neutral'
      ? rawDecision.sentiment
      : 'neutral';
  const reason = String(
    rawDecision?.reason ||
      (include
        ? 'Classified as real product feedback.'
        : 'Excluded because it is not product feedback.')
  ).slice(0, 220);

  return {
    externalId: message.externalId,
    include,
    sentiment,
    issueType:
      rawDecision?.issueType === 'personal' || rawDecision?.issueType === 'global'
        ? rawDecision.issueType
        : message.issueType || 'global',
    issueGroupSlug: rawDecision?.issueGroupSlug || message.ruleIssueGroup?.slug || null,
    issueGroupTitle: rawDecision?.issueGroupTitle || message.ruleIssueGroup?.title || null,
    classificationConfidence:
      rawDecision?.classificationConfidence == null
        ? Number(message.ruleConfidenceScore || 0)
        : Number(rawDecision.classificationConfidence || 0),
    reason,
  };
}

async function sendToGroq(data) {
  if (data.length === 0) {
    return [];
  }

  const parsed = await groqJsonRequest([
    {
      role: 'system',
      content: [
        'You classify already pre-filtered user feedback for Product Pulse.',
        'The input has already passed a rule-based filter and contains only likely BUG, FEATURE_REQUEST, or COMPLAINT items.',
        'If a query or keyword context is present, only include items that are clearly about that query.',
        'Review the structured JSON and decide if each item should still be included as genuine product feedback.',
        'Also label the sentiment as positive, neutral, or negative based on the user message itself.',
        'Preserve the provided issueType unless the examples clearly show the opposite.',
        'Reject anything that still looks transactional, promotional, automated, or not about real product experience.',
        'If uncertain, exclude the email.',
        'Return JSON only.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        'Return strict JSON with this shape:',
        '{"classifications":[{"externalId":"string","include":true,"sentiment":"positive|neutral|negative","issueType":"personal|global","issueGroupSlug":"string","issueGroupTitle":"string","classificationConfidence":0.0,"reason":"string"}]}',
        'Classify these feedback items:',
        JSON.stringify(data),
      ].join('\n'),
    },
  ]);

  const byId = new Map(
    (Array.isArray(parsed?.classifications) ? parsed.classifications : []).map(
      (item) => [item?.externalId, item]
    )
  );

  return data.map((message) => normalizeDecision(message, byId.get(message.externalId)));
}

function createThemeKey(message, context = {}) {
  const theme = findGroup(`${message.title || ''} ${message.snippet || message.body || ''}`);
  const queryKey = String(context.query || '').trim().toLowerCase() || 'all';
  if (message.issueType === 'personal') {
    return `personal:${theme.slug}:${message.externalId}`;
  }
  return `${theme.slug}:${message.ruleCategory}:${queryKey}`;
}

function buildGroupedPayload(messages, context = {}) {
  return messages.map((group) => ({
    groupId: group.groupId,
    source: context.source || 'unknown',
    query: context.query || null,
    theme: group.theme.title,
    themeKey: group.theme.slug,
    category: group.ruleCategory,
    issueType: group.issueType,
    size: group.items.length,
    examples: group.items.slice(0, 3).map((message) => ({
      externalId: message.externalId,
      subject: message.title || '',
      text: message.snippet || message.body || '',
      timestamp: message.occurredAt || new Date().toISOString(),
    })),
  }));
}

async function sendGroupedToGroq(groups, context = {}) {
  if (groups.length === 0) {
    return [];
  }

  const parsed = await groqJsonRequest([
    {
      role: 'system',
      content: [
        'You classify grouped user feedback for Product Pulse.',
        'Each group already passed a rule-based filter and represents a likely shared theme.',
        'Decide once per group whether the theme should be kept as genuine product feedback.',
        'Also assign the dominant sentiment across the examples.',
        'Reject groups that are clearly transactional, promotional, automated, or unrelated to real product experience.',
        'Return JSON only.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        'Return strict JSON with this shape:',
        '{"groups":[{"groupId":"string","include":true,"sentiment":"positive|neutral|negative","issueType":"personal|global","classificationConfidence":0.0,"reason":"string"}]}',
        'Classify these grouped feedback themes:',
        JSON.stringify(buildGroupedPayload(groups, context)),
      ].join('\n'),
    },
  ]);

  const byGroupId = new Map(
    (Array.isArray(parsed?.groups) ? parsed.groups : []).map((group) => [group?.groupId, group])
  );

  return groups.flatMap((group) =>
    group.items.map((message) => normalizeDecision(message, byGroupId.get(group.groupId)))
  );
}

async function classifyFeedbackEvents(messages, context = {}) {
  const allResults = [];
  const directRuleResults = [];
  const relevantMessages = messages
    .map((message) => {
      const ruleResult = classifyFeedback(
        message.snippet || message.body || '',
        message.title || ''
      );

      return {
        ...message,
        ruleCategory: ruleResult.category,
        ruleConfidence: ruleResult.confidence,
        ruleConfidenceScore: Number(ruleResult.confidenceScore || 0),
        ruleIssueGroup: ruleResult.issueGroup || null,
        needsAiFallback: ruleResult.needsAiFallback === true,
        ...classifyFeedbackScope(message),
      };
    })
    .filter((message) => isRelevantCategory(message.ruleCategory))
    .filter((message) =>
      matchesQueryTerms(
        message.snippet || message.body || '',
        message.title || '',
        context.query || ''
      )
    );

  const filteredOut = messages
    .filter(
      (message) =>
        !relevantMessages.some((relevantMessage) => relevantMessage.externalId === message.externalId)
    )
    .map((message) => ({
      externalId: message.externalId,
      include: false,
      issueType: classifyFeedbackScope(message).issueType,
      issueGroupSlug: null,
      issueGroupTitle: null,
      classificationConfidence: 0,
      reason: context.query
        ? 'Filtered out by rule or keyword matching before Groq.'
        : 'Filtered out by rule-based classifier before Groq.',
    }));

  if (relevantMessages.length === 0) {
    return filteredOut;
  }

  const fallbackMessages = [];
  for (const message of relevantMessages) {
    if (message.needsAiFallback) {
      fallbackMessages.push(message);
      continue;
    }

    directRuleResults.push({
      externalId: message.externalId,
      include: true,
      sentiment: detectSentiment(`${message.title || ''} ${message.snippet || message.body || ''}`),
      issueType: message.issueType || 'global',
      issueGroupSlug: message.ruleIssueGroup?.slug || null,
      issueGroupTitle: message.ruleIssueGroup?.title || null,
      classificationConfidence: Number(message.ruleConfidenceScore || 0),
      reason: `High-confidence rule classification matched ${message.ruleIssueGroup?.title || message.ruleCategory}.`,
    });
  }

  if (fallbackMessages.length === 0) {
    return [...directRuleResults, ...filteredOut];
  }

  const groupedByTheme = fallbackMessages.reduce((acc, message) => {
    const key = createThemeKey(message, context);
    if (!acc.has(key)) {
      acc.set(key, {
        groupId: key,
        ruleCategory: message.ruleCategory,
        issueType: message.issueType,
        theme: findGroup(`${message.title || ''} ${message.snippet || message.body || ''}`),
        items: [],
      });
    }

    acc.get(key).items.push(message);
    return acc;
  }, new Map());

  const groupedBatches = [];
  const singletonMessages = [];
  for (const group of groupedByTheme.values()) {
    if (group.issueType === 'global' && group.items.length > 1) {
      groupedBatches.push(group);
    } else {
      singletonMessages.push(group.items[0]);
    }
  }

  for (const batch of chunk(groupedBatches, MAX_BATCH_SIZE)) {
    const batchResults = await sendGroupedToGroq(batch, context);
    allResults.push(...batchResults);
  }

  for (const batch of chunk(singletonMessages, MAX_BATCH_SIZE)) {
    const structuredBatch = buildStructuredFeedback(batch, context);
    const batchResults = await sendToGroq(structuredBatch);
    allResults.push(...batchResults);
  }

  return [...directRuleResults, ...allResults, ...filteredOut];
}

module.exports = {
  classifyFeedbackEvents,
  groqJsonRequest,
  sendToGroq,
};
