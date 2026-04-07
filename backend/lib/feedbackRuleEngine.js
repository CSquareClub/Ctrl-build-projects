const RELEVANT_CATEGORIES = new Set([
  'BUG',
  'FEATURE_REQUEST',
  'COMPLAINT',
  'PRAISE',
]);

const NOISE_KEYWORDS = [
  'verification code',
  'newsletter',
  'invoice attached',
  'receipt',
  'domain transfer',
  'hosting renewal',
  'welcome to',
  'reset your password',
  'unsubscribe',
  'promotional',
];

const ISSUE_PATTERNS = [
  {
    slug: 'login-auth-crashes',
    title: 'Login crashes and authentication failures',
    category: 'Bug',
    keywords: [
      'login crash',
      'app crashes on login',
      'crash after login',
      'sign in crash',
      'authentication crash',
      'login freezes',
      'stuck on login',
    ],
    required: [
      ['login', 'log in', 'sign in', 'signin', 'authentication', 'auth', 'otp', 'verification code'],
      ['crash', 'crashes', 'crashed', 'freeze', 'freezes', 'frozen', 'stuck', 'hang', 'blank screen', 'white screen', 'app closed'],
    ],
  },
  {
    slug: 'payment-failures',
    title: 'Payment failures and billing errors',
    category: 'Problem',
    keywords: [
      'payment failed',
      'billing failed',
      'transaction failed',
      'card declined',
      'charged twice',
      'double charged',
      'refund not received',
      'subscription failed',
      'purchase failed',
      'checkout failed',
    ],
    required: [
      ['payment', 'billing', 'card', 'checkout', 'subscription', 'invoice', 'refund', 'purchase'],
      ['failed', 'failure', 'declined', 'error', 'charged twice', 'double charged', 'stuck', 'did not go through'],
    ],
  },
  {
    slug: 'login-auth-friction',
    title: 'Login and authentication friction',
    category: 'Problem',
    keywords: [
      'login',
      'log in',
      'sign in',
      'signin',
      'authentication',
      'auth',
      'password reset',
      'verification code',
      'otp',
      'magic link',
      'account locked',
      'cannot login',
      "can't login",
      'unable to sign in',
    ],
  },
  {
    slug: 'billing-and-payments',
    title: 'Billing and payment friction',
    category: 'Problem',
    keywords: [
      'billing',
      'payment',
      'invoice',
      'refund',
      'subscription',
      'card declined',
      'charged',
      'checkout',
      'purchase',
      'renewal',
      'plan upgrade',
    ],
  },
  {
    slug: 'performance-and-crashes',
    title: 'Performance and crash issues',
    category: 'Bug',
    keywords: [
      'crash',
      'crashes',
      'crashed',
      'app closes',
      'force close',
      'freeze',
      'freezes',
      'frozen',
      'lag',
      'laggy',
      'slow',
      'sluggish',
      'timeout',
      'timed out',
      'loading forever',
      'spinner forever',
      'blank screen',
      'white screen',
      'unresponsive',
      'hang',
      'stuck',
    ],
  },
  {
    slug: 'feature-requests',
    title: 'Feature requests and product ideas',
    category: 'Feature Request',
    keywords: [
      'feature request',
      'would like',
      'please add',
      'can you add',
      'suggestion',
      'wish there was',
      'it would be great if',
      'missing feature',
      'need support for',
    ],
  },
  {
    slug: 'product-praise',
    title: 'Product love and praise',
    category: 'Praise',
    keywords: [
      'love',
      'great',
      'amazing',
      'awesome',
      'excellent',
      'helpful',
      'fantastic',
      'works well',
      'working well',
      'easy to use',
      'super useful',
    ],
  },
];

const CATEGORY_HINTS = {
  BUG: [
    'crash',
    'broken',
    'not working',
    'fails',
    'failed',
    'error',
    'bug',
    'freezes',
    'stuck',
    'timeout',
  ],
  FEATURE_REQUEST: [
    'feature',
    'request',
    'please add',
    'would like',
    'wish there was',
    'can you add',
  ],
  COMPLAINT: [
    'issue',
    'problem',
    'frustrating',
    'annoying',
    'unable',
    'cannot',
    "can't",
    'not able',
    'wrong',
    'failed payment',
  ],
  PRAISE: ['love', 'great', 'amazing', 'awesome', 'excellent', 'helpful'],
};

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

function countKeywordMatches(text, keywords) {
  return (keywords || []).reduce(
    (count, keyword) => count + (text.includes(String(keyword).toLowerCase()) ? 1 : 0),
    0
  );
}

function hasRequiredCombination(text, requiredSets = []) {
  if (!Array.isArray(requiredSets) || requiredSets.length === 0) {
    return true;
  }

  return requiredSets.every((set) =>
    Array.isArray(set) && set.some((keyword) => text.includes(String(keyword).toLowerCase()))
  );
}

function scoreIssuePattern(text, pattern) {
  const keywordHits = countKeywordMatches(text, pattern.keywords);
  const comboBonus = hasRequiredCombination(text, pattern.required) ? 4 : 0;
  const categoryBoost =
    pattern.category === 'Bug' && ['crash', 'freez', 'stuck', 'timeout'].some((term) => text.includes(term))
      ? 2
      : 0;

  return {
    slug: pattern.slug,
    title: pattern.title,
    category: pattern.category,
    score: keywordHits + comboBonus + categoryBoost,
    keywordHits,
    comboBonus,
  };
}

function detectIssueSignals(text) {
  const normalized = normalizeText(text);
  const scores = ISSUE_PATTERNS.map((pattern) => scoreIssuePattern(normalized, pattern)).sort(
    (left, right) => right.score - left.score
  );
  const best = scores[0];

  if (!best || best.score <= 0) {
    return {
      slug: 'customer-feedback-signals',
      title: 'General customer feedback signals',
      category: 'Problem',
      confidenceScore: 0.28,
      confidence: 'low',
      matchedKeywords: [],
      needsAiFallback: true,
    };
  }

  const confidenceScore = Math.min(
    0.96,
    0.34 + best.keywordHits * 0.14 + best.comboBonus * 0.08
  );
  return {
    slug: best.slug,
    title: best.title,
    category: best.category,
    confidenceScore: Number(confidenceScore.toFixed(2)),
    confidence:
      confidenceScore >= 0.78 ? 'high' : confidenceScore >= 0.55 ? 'medium' : 'low',
    matchedKeywords: (ISSUE_PATTERNS.find((pattern) => pattern.slug === best.slug)?.keywords || [])
      .filter((keyword) => normalized.includes(String(keyword).toLowerCase()))
      .slice(0, 6),
    needsAiFallback: confidenceScore < 0.55,
  };
}

function detectCategory(text, issueSignals) {
  const normalized = normalizeText(text);
  const scores = Object.entries(CATEGORY_HINTS).map(([category, keywords]) => ({
    category,
    score: countKeywordMatches(normalized, keywords),
  }));
  scores.sort((left, right) => right.score - left.score);

  if (issueSignals.category === 'Bug') {
    return 'BUG';
  }

  if (issueSignals.category === 'Feature Request') {
    return 'FEATURE_REQUEST';
  }

  if (issueSignals.category === 'Praise') {
    return 'PRAISE';
  }

  return scores[0]?.score > 0 ? scores[0].category : 'COMPLAINT';
}

function classifyFeedback(text, subject) {
  const combined = `${normalizeText(subject)} ${normalizeText(text)}`.trim();

  if (NOISE_KEYWORDS.some((keyword) => combined.includes(keyword))) {
    return {
      category: 'IRRELEVANT',
      confidence: 'high',
      confidenceScore: 0.96,
      issueGroup: null,
      needsAiFallback: false,
    };
  }

  const issueSignals = detectIssueSignals(combined);
  const category = detectCategory(combined, issueSignals);
  const hasSupportIntent =
    combined.includes('support') ||
    combined.includes('help') ||
    combined.includes('problem') ||
    combined.includes('issue');

  if (category === 'PRAISE' && !hasSupportIntent && issueSignals.slug === 'customer-feedback-signals') {
    return {
      category,
      confidence: 'medium',
      confidenceScore: 0.6,
      issueGroup: {
        slug: 'product-praise',
        title: 'Product love and praise',
        category: 'Praise',
      },
      needsAiFallback: false,
    };
  }

  if (issueSignals.slug === 'customer-feedback-signals' && !hasSupportIntent) {
    return {
      category: 'IRRELEVANT',
      confidence: 'low',
      confidenceScore: 0.32,
      issueGroup: null,
      needsAiFallback: true,
    };
  }

  return {
    category,
    confidence: issueSignals.confidence,
    confidenceScore: issueSignals.confidenceScore,
    issueGroup: {
      slug: issueSignals.slug,
      title: issueSignals.title,
      category: issueSignals.category,
      matchedKeywords: issueSignals.matchedKeywords,
    },
    needsAiFallback: issueSignals.needsAiFallback,
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
    issueType: message.issueType || null,
    issueGroupSlug: message.ruleIssueGroup?.slug || null,
    issueGroupTitle: message.ruleIssueGroup?.title || null,
    ruleConfidenceScore: message.ruleConfidenceScore ?? null,
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
  detectIssueSignals,
  extractQueryTerms,
  isRelevantCategory,
  matchesQueryTerms,
};
