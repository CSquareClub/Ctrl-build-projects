const RELEVANT_CATEGORIES = new Set(['BUG', 'FEATURE_REQUEST', 'COMPLAINT']);

const RULES = [
  {
    category: 'BUG',
    confidence: 'high',
    keywords: [
      'crash',
      'error',
      'not working',
      'failed',
      'broken',
      'bug',
      'issue with',
      'does not work',
      "doesn't work",
    ],
  },
  {
    category: 'FEATURE_REQUEST',
    confidence: 'medium',
    keywords: [
      'add',
      'feature',
      'request',
      'would like',
      'suggestion',
      'please include',
      'it would be great',
      'can you add',
    ],
  },
  {
    category: 'COMPLAINT',
    confidence: 'medium',
    keywords: [
      'slow',
      'bad',
      'terrible',
      'issue',
      'problem',
      'frustrating',
      'annoying',
      'feedback',
      'support',
      'help',
      'not able',
      'unable',
      'cannot',
      "can't",
      'trouble',
      'wrong',
      'failed payment',
      'payment failed',
    ],
  },
  {
    category: 'PRAISE',
    confidence: 'medium',
    keywords: ['love', 'great', 'amazing', 'good', 'awesome', 'fantastic'],
  },
];

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function extractQueryTerms(query) {
  return normalizeText(query)
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3)
    .filter((term) => !['the', 'and', 'for', 'with', 'app'].includes(term));
}

function matchesQueryTerms(text, subject, query) {
  const terms = extractQueryTerms(query);

  if (terms.length === 0) {
    return true;
  }

  const combined = `${normalizeText(subject)} ${normalizeText(text)}`;
  return terms.some((term) => combined.includes(term));
}

function classifyFeedback(text, subject) {
  const normalizedSubject = normalizeText(subject);
  const normalizedText = normalizeText(text);
  const combined = `${normalizedSubject} ${normalizedText}`.trim();

  if (
    ['otp', 'verification code', 'newsletter', 'invoice', 'receipt', 'domain', 'hosting', 'welcome'].some(
      (keyword) => combined.includes(keyword)
    )
  ) {
    return {
      category: 'IRRELEVANT',
      confidence: 'high',
    };
  }

  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => combined.includes(keyword))) {
      return {
        category: rule.category,
        confidence: rule.confidence,
      };
    }
  }

  if (
    normalizedSubject.includes('feedback') ||
    normalizedSubject.includes('support') ||
    normalizedSubject.includes('issue') ||
    normalizedSubject.includes('problem')
  ) {
    return {
      category: 'COMPLAINT',
      confidence: 'low',
    };
  }

  return {
    category: 'IRRELEVANT',
    confidence: 'low',
  };
}

function isRelevantCategory(category) {
  return RELEVANT_CATEGORIES.has(category);
}

function buildStructuredFeedback(messages, context = {}) {
  return messages.map((message) => ({
    source: context.source || message.source || 'unknown',
    subject: message.title || '',
    text: message.snippet || message.body || '',
    category: message.ruleCategory,
    timestamp: message.occurredAt || new Date().toISOString(),
    user_id: context.userId || null,
    externalId: message.externalId,
    query: context.query || null,
    metadata: message.metadata || null,
  }));
}

module.exports = {
  buildStructuredFeedback,
  classifyFeedback,
  extractQueryTerms,
  isRelevantCategory,
  matchesQueryTerms,
};
