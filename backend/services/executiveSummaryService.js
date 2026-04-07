const { getDashboardSnapshot } = require('../lib/dashboardSnapshot');
const { listMemoryHighlights } = require('./agentMemoryService');
const { listAgentActions } = require('./agentService');
const { getAnomalies } = require('./anomalyService');
const { getPredictions } = require('./predictionService');
const { getTrends } = require('./trendService');
const { getProductSetupStatus } = require('./productSetupService');
const { listChurnRisks } = require('./churnDetectionService');

function pickTopIssues(issues) {
  return [...(issues || [])]
    .sort((left, right) => {
      const priorityLeft = String(left.priority || 'LOW').toUpperCase();
      const priorityRight = String(right.priority || 'LOW').toUpperCase();
      const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDelta =
        (priorityScore[priorityRight] || 1) - (priorityScore[priorityLeft] || 1);
      if (priorityDelta !== 0) return priorityDelta;
      return Number(right.reportCount || 0) - Number(left.reportCount || 0);
    })
    .slice(0, 3);
}

async function generateExecutiveSummary(user) {
  const [snapshot, actions, anomalies, predictions, trends, memories, productSetup, churnRisks] = await Promise.all([
    getDashboardSnapshot(user),
    listAgentActions(user.id, 20),
    getAnomalies(user.id),
    getPredictions(user.id),
    getTrends(user.id),
    listMemoryHighlights(user.id, {
      limit: 5,
      since: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    }),
    getProductSetupStatus(user),
    listChurnRisks(user.id, { limit: 5 }),
  ]);

  const productName = productSetup.productName || 'your product';

  const topIssues = pickTopIssues(snapshot.issues);
  const actionItems = actions
    .filter((action) =>
      ['ticket_created', 'reminder_created', 'calendar_event_created', 'predictive_alert'].includes(
        action.actionType
      )
    )
    .slice(0, 5);

  const risks = [
    ...predictions.slice(0, 2).map((entry) => entry.prediction),
    ...anomalies
      .slice(0, 2)
      .map(
        (entry) =>
          `${entry.issue_type_label} is showing a ${entry.spike_level} anomaly spike right now.`
      ),
  ].slice(0, 3);

  const recommendations = [
    ...topIssues.map((issue) => `Review ${issue.title} and validate the latest fix path.`),
    ...trends
      .filter((trend) => trend.trend_direction === 'up')
      .slice(0, 2)
      .map((trend) => `Watch ${trend.issue_type_label} because it is trending upward.`),
    ...churnRisks
      .filter((entry) => entry.churn_level !== 'safe')
      .slice(0, 1)
      .map((entry) => `Follow up with ${entry.user_email} because their churn risk is ${entry.churn_level.replace('_', ' ')}.`),
  ].slice(0, 3);

  const summary = topIssues.length
    ? `Today, the system detected pressure around ${topIssues
        .map((issue) => issue.title)
        .slice(0, 2)
        .join(' and ')} for ${productName}. ${actionItems.length > 0 ? `${actionItems.length} follow-up action${actionItems.length === 1 ? '' : 's'} ${actionItems.length === 1 ? 'was' : 'were'} taken automatically.` : 'The agent is still monitoring before acting.'} ${risks[0] || 'Current risk is contained but being watched closely.'} ${churnRisks[0] ? `${churnRisks[0].user_email} is the highest churn-risk user right now.` : ''}`.trim()
    : `The system is active for ${productName}, but there are not enough high-signal issues yet to generate a strong executive summary.`;

  return {
    generatedAt: new Date().toISOString(),
    mode: snapshot.mode,
    summary,
    topIssues: topIssues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      priority: issue.priority,
      reportCount: issue.reportCount,
      trendPercent: issue.trendPercent,
    })),
    actionsTaken: actionItems.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      reason: action.reason,
      createdAt: action.createdAt,
    })),
    risks,
    recommendations,
    churnRisks: churnRisks.map((entry) => ({
      userEmail: entry.user_email,
      churnScore: entry.churn_score,
      churnLevel: entry.churn_level,
      summary: entry.summary,
      recommendedActions: entry.recommended_actions,
    })),
    memoryHighlights: memories.map((memory) => ({
      id: memory.id,
      memoryType: memory.memory_type,
      content: memory.content,
      importanceScore: memory.importance_score,
      createdAt: memory.created_at,
    })),
  };
}

module.exports = {
  generateExecutiveSummary,
};
