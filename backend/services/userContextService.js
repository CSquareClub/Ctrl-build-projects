const supabase = require('../lib/supabaseClient');

const MAX_RECENT_ISSUES = 6;

const ISSUE_SUGGESTIONS = {
  'login-auth-friction': 'If possible, ask whether the issue starts after password reset, magic link sign-in, or standard email-password login.',
  'billing-and-payments': 'If they can share it, capture the payment method, plan, and approximate checkout time so billing logs can be traced quickly.',
  'performance-and-crashes': 'Ask whether the slowdown or crash is tied to a specific browser, device, or app version.',
  'feature-requests': 'Capture the workflow they were trying to complete so the team understands the missing capability in context.',
  'product-praise': 'Capture what part of the experience worked especially well so the team can reinforce it.',
  default: 'Capture one concrete reproduction detail so the next follow-up can move faster.',
};

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeIssueType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || 'general';
}

function normalizeIssueFrequency(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  return Object.entries(raw).reduce((acc, [key, value]) => {
    const issueType = normalizeIssueType(key);
    const count = Number(value);
    if (issueType && Number.isFinite(count) && count > 0) {
      acc[issueType] = Math.round(count);
    }
    return acc;
  }, {});
}

function normalizeLastIssues(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const occurredAt = entry.occurredAt
        ? new Date(entry.occurredAt).toISOString()
        : null;

      return {
        issueType: normalizeIssueType(entry.issueType),
        title: String(entry.title || '').trim() || null,
        occurredAt,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_RECENT_ISSUES);
}

function getTotalInteractions(issueFrequency) {
  return Object.values(normalizeIssueFrequency(issueFrequency)).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
}

function normalizeSentimentScore(value, fallbackTone = 'neutral') {
  if (Number.isFinite(Number(value))) {
    return clamp(Number(value), -1, 1);
  }

  const tone = String(fallbackTone || 'neutral').trim().toLowerCase();
  if (tone === 'angry') return -0.9;
  if (tone === 'positive') return 0.75;
  return 0;
}

function buildSuggestion(issueType) {
  return ISSUE_SUGGESTIONS[issueType] || ISSUE_SUGGESTIONS.default;
}

async function getUserContext(userId, userEmail) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_context')
    .select('*')
    .eq('user_id', userId)
    .eq('user_email', normalizedEmail)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    user_email: normalizedEmail,
    issue_frequency: normalizeIssueFrequency(data.issue_frequency),
    last_issues: normalizeLastIssues(data.last_issues),
    sentiment_score: Number(data.sentiment_score || 0),
  };
}

async function upsertUserContext(userId, userEmail, input = {}) {
  const normalizedEmail = normalizeEmail(userEmail);
  if (!normalizedEmail) {
    return null;
  }

  const existing = await getUserContext(userId, normalizedEmail);
  const issueType = normalizeIssueType(input.issueType);
  const issueFrequency = normalizeIssueFrequency(existing?.issue_frequency);
  issueFrequency[issueType] = Number(issueFrequency[issueType] || 0) + 1;

  const previousCount = getTotalInteractions(existing?.issue_frequency);
  const sentimentScore = normalizeSentimentScore(input.sentimentScore, input.tone);
  const averagedSentiment =
    previousCount <= 0
      ? sentimentScore
      : clamp(
          ((Number(existing?.sentiment_score || 0) * previousCount) + sentimentScore) /
            (previousCount + 1),
          -1,
          1
        );

  const latestIssue = {
    issueType,
    title: String(input.issueTitle || '').trim() || null,
    occurredAt: input.occurredAt
      ? new Date(input.occurredAt).toISOString()
      : new Date().toISOString(),
  };

  const lastIssues = [
    latestIssue,
    ...normalizeLastIssues(existing?.last_issues).filter(
      (entry) =>
        !(
          entry.issueType === latestIssue.issueType &&
          (entry.title || '') === (latestIssue.title || '')
        )
    ),
  ].slice(0, MAX_RECENT_ISSUES);

  const payload = {
    user_id: userId,
    user_email: normalizedEmail,
    last_issues: lastIssues,
    issue_frequency: issueFrequency,
    sentiment_score: Number(averagedSentiment.toFixed(3)),
    last_interaction_at: latestIssue.occurredAt,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_context')
    .upsert(payload, { onConflict: 'user_id,user_email' })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        ...payload,
        suggestion: buildSuggestion(issueType),
      };
    }
    throw error;
  }

  return {
    ...(data || payload),
    issue_frequency: issueFrequency,
    last_issues: lastIssues,
    suggestion: buildSuggestion(issueType),
  };
}

function buildPersonalDiagnosis(context, input = {}) {
  const issueType = normalizeIssueType(input.issueType);
  const issueFrequency = normalizeIssueFrequency(context?.issue_frequency);
  const repeatCount = Number(issueFrequency[issueType] || 0);
  const tone = String(input.tone || 'neutral').trim().toLowerCase();
  const sentimentScore = normalizeSentimentScore(context?.sentiment_score, tone);
  const recurringProblem = repeatCount >= 2;
  const stronglyNegative = sentimentScore <= -0.35 || tone === 'angry';
  const severeIssue = [
    'login-auth-friction',
    'billing-and-payments',
    'performance-and-crashes',
  ].includes(issueType);

  let priorityBoost = 0;
  if (recurringProblem) priorityBoost += 1;
  if (stronglyNegative) priorityBoost += 1;
  if (repeatCount >= 4) priorityBoost += 1;

  const priorityLevel =
    priorityBoost >= 3
      ? 'critical'
      : priorityBoost >= 2
        ? 'high'
        : priorityBoost >= 1
          ? 'medium'
          : 'low';

  const summaryParts = [];
  if (recurringProblem) {
    summaryParts.push(
      `This sender has already raised this ${repeatCount} time${repeatCount === 1 ? '' : 's'}.`
    );
  }
  if (stronglyNegative) {
    summaryParts.push('Their recent sentiment is negative, so the case should be handled more carefully.');
  }

  return {
    issueType,
    repeatCount,
    recurringProblem,
    stronglyNegative,
    sentimentScore,
    priorityBoost,
    priorityLevel,
    shouldEscalate: severeIssue && (recurringProblem || stronglyNegative),
    shouldFollowUp: recurringProblem || stronglyNegative,
    suggestion: buildSuggestion(issueType),
    summary:
      summaryParts.join(' ') ||
      `No personal escalation signal yet for this ${issueType.replace(/-/g, ' ')} thread.`,
  };
}

module.exports = {
  buildPersonalDiagnosis,
  buildSuggestion,
  getUserContext,
  normalizeSentimentScore,
  upsertUserContext,
};
