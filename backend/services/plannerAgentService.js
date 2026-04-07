const supabase = require('../lib/supabaseClient');
const { getConfidenceForIssue } = require('./learningService');
const { getAnomalyForIssue } = require('./anomalyService');
const { getPredictionForIssue } = require('./predictionService');
const { getTrendForIssue } = require('./trendService');
const { getIssueSignalSummary } = require('./issueIntelligenceService');
const { getIssueChurnSignals } = require('./churnDetectionService');

function normalizePriorityScore(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function toPriorityLevel(score) {
  if (score >= 80) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

function getAnomalyWeight(spikeLevel) {
  if (spikeLevel === 'high') return 100;
  if (spikeLevel === 'medium') return 70;
  if (spikeLevel === 'low') return 35;
  return 0;
}

function buildPlanReasoning({ anomaly, confidence, trend, prediction, churn }) {
  const reasons = [];

  if (anomaly.spike_detected) {
    reasons.push(`Spike detected with ${anomaly.spike_level} anomaly pressure.`);
  }

  if (prediction.escalating) {
    reasons.push('Short-interval repeats suggest this issue is escalating.');
  }

  reasons.push(
    `Confidence is ${confidence.confidenceScore}% and trend growth is ${Math.round(
      trend.trend_growth_percent
    )}%.`
  );

  if (churn.affectedUsers > 0) {
    reasons.push(
      `${churn.affectedUsers} at-risk user${churn.affectedUsers === 1 ? '' : 's'} map to this issue, with peak churn risk at ${churn.highestRiskScore}%.`
    );
  }

  return reasons.join(' ');
}

function buildPlannerDecision({ issue, confidence, anomaly, trend, prediction, signals, churn }) {
  const frequencyScore = Math.min((Number(signals.frequencyCount || 0) / 20) * 100, 100);
  const trendGrowthScore = Math.min(Math.max(Number(trend.trend_growth_percent || 0), 0), 100);
  const anomalyScore = getAnomalyWeight(anomaly.spike_level);
  const churnScore = Math.min(Number(churn.highestRiskScore || 0), 100);
  const priorityScore = normalizePriorityScore(
    confidence.confidenceScore * 0.4 +
      frequencyScore * 0.3 +
      trendGrowthScore * 0.15 +
      anomalyScore * 0.1 +
      churnScore * 0.05
  );
  const priority = toPriorityLevel(priorityScore);

  let executionMode = 'observe';
  const actions = [];

  if (confidence.confidenceScore > 70) {
    executionMode = 'auto';
    if (priority === 'critical' || priority === 'high') {
      actions.push('create_ticket', 'schedule_reminder');
    }
    if (priority !== 'low') {
      actions.push('suggest_fix');
    }
    if (prediction.escalating || anomaly.spike_detected) {
      actions.push('notify_user');
    }
  } else if (confidence.confidenceScore >= 40) {
    executionMode = 'suggest';
    actions.push('suggest_fix');
    if (priority !== 'low') {
      actions.push('create_ticket', 'schedule_reminder');
    }
  }

  if (churn.highestRiskLevel === 'high_risk') {
    actions.push('notify_user', 'schedule_reminder');
  }

  return {
    issueId: issue.id,
    issueType: confidence.issueType,
    priority,
    priorityScore: Number(priorityScore.toFixed(1)),
    actions: [...new Set(actions)],
    executionMode,
    anomaly,
    trend,
    prediction,
    churn,
    reasoning: buildPlanReasoning({
      anomaly,
      confidence,
      trend,
      prediction,
      churn,
    }),
    confidence,
  };
}

async function planIssue(userId, issue, confidenceOverride = null) {
  const [confidence, anomaly, trend, prediction, signals, churn] = await Promise.all([
    confidenceOverride || getConfidenceForIssue(userId, issue.id),
    getAnomalyForIssue(userId, issue),
    getTrendForIssue(userId, issue),
    getPredictionForIssue(userId, issue),
    getIssueSignalSummary(userId, issue),
    getIssueChurnSignals(userId, issue),
  ]);

  return buildPlannerDecision({
    issue,
    confidence,
    anomaly,
    trend,
    prediction,
    signals,
    churn,
  });
}

async function getPriorityForIssue(userId, issueId) {
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

  const plan = await planIssue(userId, issue);

  return {
    issue_id: issue.id,
    priority_score: plan.priorityScore,
    priority_level: plan.priority,
    reasoning: plan.reasoning,
    confidence: {
      score: plan.confidence.confidenceScore,
      level: plan.confidence.confidenceLevel,
      reasoning: plan.confidence.reasoning,
    },
    anomaly: plan.anomaly,
    trend: plan.trend,
    prediction: plan.prediction,
    churn: plan.churn,
    actions: plan.actions,
    execution_mode: plan.executionMode,
  };
}

module.exports = {
  buildPlannerDecision,
  getPriorityForIssue,
  planIssue,
};
