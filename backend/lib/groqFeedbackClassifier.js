const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const MAX_BATCH_SIZE = 8;
const {
  buildStructuredFeedback,
  classifyFeedback,
  matchesQueryTerms,
  isRelevantCategory,
} = require('./feedbackRuleEngine');

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
        'Reject anything that still looks transactional, promotional, automated, or not about real product experience.',
        'If uncertain, exclude the email.',
        'Return JSON only.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        'Return strict JSON with this shape:',
        '{"classifications":[{"externalId":"string","include":true,"sentiment":"positive|neutral|negative","reason":"string"}]}',
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

async function classifyFeedbackEvents(messages, context = {}) {
  const allResults = [];
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
      reason: context.query
        ? 'Filtered out by rule or keyword matching before Groq.'
        : 'Filtered out by rule-based classifier before Groq.',
    }));

  if (relevantMessages.length === 0) {
    return filteredOut;
  }

  for (const batch of chunk(relevantMessages, MAX_BATCH_SIZE)) {
    const structuredBatch = buildStructuredFeedback(batch, context);
    const batchResults = await sendToGroq(structuredBatch);
    allResults.push(...batchResults);
  }

  return [...allResults, ...filteredOut];
}

module.exports = {
  classifyFeedbackEvents,
  sendToGroq,
};
