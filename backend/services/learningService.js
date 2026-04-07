const supabase = require('../lib/supabaseClient');
const { findGroup } = require('../lib/issueAggregator');
const { getOutcomeGuidance } = require('./selfHealingService');

const CONFIDENCE_CACHE_TTL_MS = 1000 * 60 * 5;
const confidenceCache = new Map();

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function normalizeIssueType(issue) {
  const text = `${issue?.title || ''} ${issue?.summary || ''}`.trim();
  const group = findGroup(text);

  return {
    slug: group.slug,
    title: group.title,
    category: group.category,
    matchers: Array.isArray(group.matchers) ? group.matchers : [],
  };
}

function calculateSimilarityScore(issue, issueType, repeatedKeywords = []) {
  const haystack = `${issue?.title || ''} ${issue?.summary || ''}`.toLowerCase();
  const issueMatchers = issueType.matchers || [];
  const matcherHits = issueMatchers.filter((matcher) =>
    haystack.includes(String(matcher).toLowerCase())
  ).length;
  const matcherScore = issueMatchers.length
    ? matcherHits / issueMatchers.length
    : issueType.slug === 'customer-feedback-signals'
      ? 0.35
      : 0.7;

  const repeatedKeywordHits = repeatedKeywords.filter(({ keyword }) =>
    haystack.includes(String(keyword).toLowerCase())
  ).length;
  const repeatedKeywordScore = repeatedKeywords.length
    ? repeatedKeywordHits / repeatedKeywords.length
    : 0;

  return Number(
    clamp(matcherScore * 0.7 + repeatedKeywordScore * 0.3, 0, 1).toFixed(3)
  );
}

async function getLearningStats(userId, issueType) {
  const { data, error } = await supabase
    .from('learning_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('issue_type', issueType)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }

  return data || null;
}

async function upsertIssueMetrics(userId, issueId, metrics) {
  const payload = {
    user_id: userId,
    issue_id: issueId,
    frequency_count: metrics.frequencyCount,
    source_count: metrics.sourceCount,
    similarity_score: metrics.similarityScore,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('issue_metrics')
    .upsert(payload, { onConflict: 'issue_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return payload;
    }
    throw error;
  }

  return data || payload;
}

function buildConfidenceReasoning({
  confidenceScore,
  confidenceLevel,
  frequencyCount,
  sourceCount,
  similarityScore,
  acceptanceRate,
  issueType,
}) {
  const patternStrength =
    similarityScore >= 0.7 ? 'strong' : similarityScore >= 0.4 ? 'moderate' : 'light';

  return [
    `Confidence: ${confidenceScore}% (${confidenceLevel.charAt(0).toUpperCase()}${confidenceLevel.slice(1)})`,
    'Based on:',
    `- ${frequencyCount} similar report${frequencyCount === 1 ? '' : 's'}`,
    `- ${sourceCount} source${sourceCount === 1 ? '' : 's'}`,
    `- ${patternStrength} pattern match in ${issueType.title.toLowerCase()}`,
    `- ${Math.round(acceptanceRate * 100)}% past acceptance rate`,
  ].join('\n');
}

function calculateConfidenceFromMetrics({
  frequencyCount,
  sourceCount,
  similarityScore,
  learningStats,
  issue,
}) {
  const frequencyScore = clamp(frequencyCount / 20, 0, 1);
  const normalizedSourceScore = clamp(sourceCount / 5, 0, 1);
  const normalizedSimilarityScore = clamp(similarityScore, 0, 1);
  const historyScore =
    learningStats && Number(learningStats.total_cases || 0) > 0
      ? clamp(
          Number(learningStats.accepted_count || 0) /
            Number(learningStats.total_cases || 1),
          0,
          1
        )
      : 0.5;
  const issueConfidenceScore = clamp(
    Number(issue?.confidence_score ?? issue?.confidenceScore ?? 0),
    0,
    1
  );
  const severitySignal = clamp(
    Number(issue?.severity_score ?? issue?.severityScore ?? 0),
    0,
    1
  );
  const trendSignal = clamp(
    (Number(issue?.trend_score ?? issue?.trendScore ?? 1) - 0.55) / 1.85,
    0,
    1
  );
  const issueCategory = String(issue?.category || '').toLowerCase();
  const categoryGuardrail =
    issueCategory === 'praise'
      ? 0.78
      : issueCategory === 'feature request'
        ? 0.88
        : 1;

  const rawScore =
    frequencyScore * 0.2 +
    normalizedSourceScore * 0.12 +
    normalizedSimilarityScore * 0.16 +
    historyScore * 0.16 +
    issueConfidenceScore * 0.16 +
    severitySignal * 0.1 +
    trendSignal * 0.1;

  const confidenceScore = Math.round(clamp(rawScore * categoryGuardrail, 0, 1) * 100);
  const confidenceLevel =
    confidenceScore < 40 ? 'low' : confidenceScore <= 70 ? 'medium' : 'high';

  return {
    confidenceScore,
    confidenceLevel,
    acceptanceRate: historyScore,
    inputs: {
      frequencyScore,
      sourceScore: normalizedSourceScore,
      similarityScore: normalizedSimilarityScore,
      historyScore,
      issueConfidenceScore,
      severitySignal,
      trendSignal,
    },
  };
}

async function calculateConfidence(userId, issue, options = {}) {
  const issueType = normalizeIssueType(issue);
  const frequencyCount = Number(
    options.frequencyCount ?? issue?.report_count ?? issue?.reportCount ?? 0
  );
  const sourceCount = Number(
    options.sourceCount ??
      (Array.isArray(issue?.sources)
        ? issue.sources.length
        : issue?.source_breakdown
          ? Object.keys(issue.source_breakdown).length
          : 0)
  );
  const similarityScore = Number(
    options.similarityScore ??
      calculateSimilarityScore(issue, issueType, options.repeatedKeywords || [])
  );

  const cacheKey = `${userId}:${issue?.id || issue?.title || issueType.slug}:${frequencyCount}:${sourceCount}:${similarityScore.toFixed(3)}`;
  const cached = confidenceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const learningStats = await getLearningStats(userId, issueType.slug);
  const computed = calculateConfidenceFromMetrics({
    frequencyCount,
    sourceCount,
    similarityScore,
    learningStats,
    issue,
  });
  const selfHealing = await getOutcomeGuidance(userId, {
    issueType: issueType.slug,
    actionType: 'agent_decision',
    confidence: computed.confidenceScore / 100,
  });
  const tunedConfidenceScore = Math.round(
    clamp(selfHealing.adjustedConfidence, 0, 1) * 100
  );
  const tunedConfidenceLevel =
    tunedConfidenceScore < 40
      ? 'low'
      : tunedConfidenceScore <= 70
        ? 'medium'
        : 'high';

  await upsertIssueMetrics(userId, issue.id, {
    frequencyCount,
    sourceCount,
    similarityScore,
  });

  const result = {
    issueType: issueType.slug,
    issueTypeLabel: issueType.title,
    confidenceScore: tunedConfidenceScore,
    confidenceLevel: tunedConfidenceLevel,
    frequencyCount,
    sourceCount,
    similarityScore,
    acceptanceRate: computed.acceptanceRate,
    reasoning: buildConfidenceReasoning({
      confidenceScore: tunedConfidenceScore,
      confidenceLevel: tunedConfidenceLevel,
      frequencyCount,
      sourceCount,
      similarityScore,
      acceptanceRate: computed.acceptanceRate,
      issueType,
    }).concat(`\n- ${selfHealing.summary}`),
    metrics: computed.inputs,
    selfHealing,
  };

  confidenceCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CONFIDENCE_CACHE_TTL_MS,
  });

  return result;
}

async function updateLearningStats(userId, issueType, action) {
  const normalizedAction = String(action || '').trim().toLowerCase();
  if (!['accept', 'reject', 'edit'].includes(normalizedAction)) {
    throw new Error('action must be one of accept, reject, or edit.');
  }

  const existing = await getLearningStats(userId, issueType);
  const nextRow = {
    user_id: userId,
    issue_type: issueType,
    total_cases: Number(existing?.total_cases || 0) + 1,
    accepted_count:
      Number(existing?.accepted_count || 0) + (normalizedAction === 'accept' ? 1 : 0),
    rejected_count:
      Number(existing?.rejected_count || 0) + (normalizedAction === 'reject' ? 1 : 0),
    edited_count:
      Number(existing?.edited_count || 0) + (normalizedAction === 'edit' ? 1 : 0),
    last_confidence: existing?.last_confidence || null,
    last_updated: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('learning_stats')
    .upsert(nextRow, { onConflict: 'user_id,issue_type' })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return nextRow;
    }
    throw error;
  }

  for (const [key, entry] of confidenceCache.entries()) {
    if (key.startsWith(`${userId}:`)) {
      confidenceCache.delete(key);
    }
  }

  return data || nextRow;
}

async function updateLearningConfidence(userId, issueType, confidenceScore) {
  const existing = await getLearningStats(userId, issueType);
  const payload = {
    user_id: userId,
    issue_type: issueType,
    total_cases: Number(existing?.total_cases || 0),
    accepted_count: Number(existing?.accepted_count || 0),
    rejected_count: Number(existing?.rejected_count || 0),
    edited_count: Number(existing?.edited_count || 0),
    last_confidence: confidenceScore,
    last_updated: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('learning_stats')
    .upsert(payload, { onConflict: 'user_id,issue_type' });

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

async function getConfidenceForIssue(userId, issueId) {
  const { data: issue, error } = await supabase
    .from('issues')
    .select('*')
    .eq('user_id', userId)
    .eq('id', issueId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!issue) {
    throw new Error('Issue not found.');
  }

  const { data: metrics, error: metricsError } = await supabase
    .from('issue_metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('issue_id', issueId)
    .maybeSingle();

  if (metricsError && !isMissingRelationError(metricsError)) {
    throw metricsError;
  }

  return calculateConfidence(userId, issue, {
    frequencyCount: metrics?.frequency_count,
    sourceCount: metrics?.source_count,
    similarityScore: metrics?.similarity_score,
  });
}

module.exports = {
  calculateConfidence,
  getConfidenceForIssue,
  normalizeIssueType,
  updateLearningConfidence,
  updateLearningStats,
};
