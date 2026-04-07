const PERSONAL_KEYWORDS = [
  'my account',
  'my payment',
  'my card',
  'my subscription',
  'my invoice',
  'my login',
  'my password',
  'my profile',
  'my workspace',
  'my team',
  'my order',
  'my plan',
  'my email',
  'my data',
  'charged me',
  'charged twice',
  'locked out',
  'cannot log in',
  "can't log in",
  'unable to log in',
];

const UNIQUE_CONTEXT_PATTERNS = [
  /\b(order|invoice|transaction|account|subscription|payment|charge|workspace|team|ticket|case)\b[\s:#-]*[a-z0-9-]{3,}/i,
  /\b(card ending|account id|invoice id|transaction id|order id)\b/i,
  /\bmy\b.{0,30}\b(error|issue|problem|account|payment|subscription|card|invoice|workspace|team)\b/i,
];

function normalizeFeedbackText(message) {
  return `${message?.title || ''} ${message?.snippet || message?.body || ''}`
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function classifyFeedbackScope(message) {
  const text = normalizeFeedbackText(message);
  const personalSignals = [];
  let score = 0;

  for (const keyword of PERSONAL_KEYWORDS) {
    if (text.includes(keyword)) {
      personalSignals.push(keyword);
      score += 2;
    }
  }

  if (/\b(i|me|my|mine)\b/i.test(text)) {
    score += 1;
    personalSignals.push('first-person context');
  }

  if (text.length >= 320) {
    score += 1;
    personalSignals.push('long-form context');
  }

  for (const pattern of UNIQUE_CONTEXT_PATTERNS) {
    if (pattern.test(text)) {
      score += 2;
      personalSignals.push('unique account/payment context');
      break;
    }
  }

  const issueType = score >= 3 ? 'personal' : 'global';
  return {
    issueType,
    score,
    reason:
      issueType === 'personal'
        ? `Personal issue detected from ${personalSignals.join(', ') || 'direct user-specific context'}.`
        : 'Global issue pattern detected from reusable shared theme signals.',
  };
}

function buildScopedIdentity(message) {
  return (
    message?.metadata?.threadId ||
    message?.threadId ||
    message?.metadata?.senderEmail ||
    message?.senderEmail ||
    message?.author ||
    message?.external_id ||
    message?.externalId ||
    'unknown'
  );
}

module.exports = {
  buildScopedIdentity,
  classifyFeedbackScope,
  normalizeFeedbackText,
};
