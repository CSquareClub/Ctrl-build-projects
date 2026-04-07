const supabase = require('../lib/supabaseClient');

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    String(error?.message || '').toLowerCase().includes('does not exist')
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeIssueFrequency(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  return Object.entries(raw).reduce((acc, [key, value]) => {
    const count = Number(value);
    if (Number.isFinite(count) && count > 0) {
      acc[String(key)] = Math.round(count);
    }
    return acc;
  }, {});
}

function buildChurnClassification(score) {
  if (score >= 70) return 'high_risk';
  if (score >= 40) return 'warning';
  return 'safe';
}

function computeChurnScore(context) {
  const issueFrequency = normalizeIssueFrequency(context.issue_frequency);
  const repeatedIssues = Object.values(issueFrequency).filter((count) => Number(count) >= 2).length;
  const totalIssues = Object.values(issueFrequency).reduce((sum, value) => sum + Number(value || 0), 0);
  const negativeSentiment = Math.max(0, Math.abs(Math.min(Number(context.sentiment_score || 0), 0)));
  const recencyHours = context.last_interaction_at
    ? (Date.now() - new Date(context.last_interaction_at).getTime()) / (1000 * 60 * 60)
    : 999;
  const recencyPressure =
    recencyHours <= 24 ? 1 : recencyHours <= 72 ? 0.6 : recencyHours <= 168 ? 0.25 : 0;

  const score = clamp(
    repeatedIssues * 18 +
      Math.min(totalIssues, 6) * 7 +
      negativeSentiment * 30 +
      recencyPressure * 16,
    0,
    100
  );

  return {
    score: Number(score.toFixed(1)),
    classification: buildChurnClassification(score),
    repeatedIssues,
    totalIssues,
    negativeSentiment: Number(negativeSentiment.toFixed(2)),
    recencyPressure: Number(recencyPressure.toFixed(2)),
  };
}

function buildRiskSummary(context, metrics) {
  const topIssue = Object.entries(normalizeIssueFrequency(context.issue_frequency)).sort(
    (left, right) => Number(right[1] || 0) - Number(left[1] || 0)
  )[0];
  const parts = [];

  if (metrics.repeatedIssues > 0 && topIssue) {
    parts.push(`${context.user_email} has repeated ${topIssue[0].replace(/-/g, ' ')} reports.`);
  }
  if (metrics.negativeSentiment >= 0.35) {
    parts.push('Recent sentiment trend is negative.');
  }
  if (metrics.recencyPressure >= 0.6) {
    parts.push('The interaction is recent enough to suggest active frustration.');
  }

  return parts.join(' ') || `${context.user_email} is currently low churn risk.`;
}

function mapRecommendedActions(metrics) {
  if (metrics.classification === 'high_risk') {
    return [
      'prioritize_personal_follow_up',
      'review_open_issue_path',
      'escalate_to_human_owner',
    ];
  }

  if (metrics.classification === 'warning') {
    return [
      'monitor_user_closely',
      'send_contextual_follow_up',
    ];
  }

  return ['continue_monitoring'];
}

async function listChurnRisks(userId, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 50);
  const { data, error } = await supabase
    .from('user_context')
    .select('*')
    .eq('user_id', userId)
    .order('last_interaction_at', { ascending: false })
    .limit(limit * 3);

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || [])
    .map((context) => {
      const metrics = computeChurnScore(context);
      return {
        user_email: context.user_email,
        churn_score: metrics.score,
        churn_level: metrics.classification,
        repeated_issue_count: metrics.repeatedIssues,
        total_issue_count: metrics.totalIssues,
        sentiment_score: Number(context.sentiment_score || 0),
        last_interaction_at: context.last_interaction_at,
        issue_frequency: normalizeIssueFrequency(context.issue_frequency),
        last_issues: Array.isArray(context.last_issues) ? context.last_issues.slice(0, 4) : [],
        summary: buildRiskSummary(context, metrics),
        recommended_actions: mapRecommendedActions(metrics),
      };
    })
    .sort((left, right) => right.churn_score - left.churn_score)
    .slice(0, limit);
}

async function getIssueChurnSignals(userId, issue) {
  const issueText = `${issue?.title || ''} ${issue?.summary || ''}`.toLowerCase();
  const churnRisks = await listChurnRisks(userId, { limit: 25 });
  const related = churnRisks.filter((entry) =>
    Object.keys(entry.issue_frequency || {}).some((key) =>
      issueText.includes(String(key).replace(/-/g, ' '))
    )
  );

  const highest = related[0] || null;
  return {
    highestRiskLevel: highest?.churn_level || 'safe',
    highestRiskScore: highest?.churn_score || 0,
    affectedUsers: related.length,
    topUsers: related.slice(0, 3),
  };
}

module.exports = {
  computeChurnScore,
  getIssueChurnSignals,
  listChurnRisks,
};
