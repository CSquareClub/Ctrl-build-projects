const { getRedisConnection } = require('../lib/redis');

const DEFAULT_CLUSTER_THRESHOLD = Math.max(
  3,
  Math.min(Number(process.env.FEEDBACK_CLUSTER_THRESHOLD || 3), 10)
);
const CLUSTER_STATE_TTL_SECONDS = 60 * 60 * 24 * 30;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIssueClassification(issue) {
  return String(
    issue?.classification ||
      issue?.issue_type ||
      issue?.issueType ||
      ''
  )
    .trim()
    .toLowerCase();
}

function isPositiveClassification(issue) {
  const classification = normalizeIssueClassification(issue);
  return classification === 'praise' || classification === 'positive';
}

function isResolvedIssue(issue) {
  return String(issue?.status || '').trim().toLowerCase() === 'resolved';
}

function getIssueReportCount(issue) {
  return Math.max(
    0,
    toNumber(
      issue?.report_count ??
        issue?.reportCount ??
        issue?.reports_count ??
        issue?.reportsCount ??
        issue?.count,
      0
    )
  );
}

function getIssuePriority(issue) {
  return String(issue?.priority || '').trim().toUpperCase();
}

function getIssueIntelligenceScore(issue) {
  return toNumber(
    issue?.intelligence_score ??
      issue?.intelligenceScore ??
      issue?.confidence_score ??
      0,
    0
  );
}

function shouldTriggerInspection(issue) {
  if (!issue || !issue.id || isResolvedIssue(issue) || isPositiveClassification(issue)) {
    return false;
  }

  const count = getIssueReportCount(issue);
  if (count < DEFAULT_CLUSTER_THRESHOLD) {
    return false;
  }

  return (
    getIssuePriority(issue) === 'HIGH' ||
    getIssueIntelligenceScore(issue) >= 6 ||
    count >= DEFAULT_CLUSTER_THRESHOLD
  );
}

function buildClusterStateKey(userId, issueId) {
  return `event:feedback-cluster:${userId}:${issueId}`;
}

async function getClusterTriggerState(userId, issueId) {
  if (!process.env.REDIS_URL) {
    return 0;
  }

  try {
    const redis = getRedisConnection();
    const raw = await redis.get(buildClusterStateKey(userId, issueId));
    return Math.max(0, toNumber(raw, 0));
  } catch {
    return 0;
  }
}

async function markClusterTriggered(userId, issueId, reportCount) {
  if (!process.env.REDIS_URL) {
    return;
  }

  try {
    const redis = getRedisConnection();
    await redis.set(
      buildClusterStateKey(userId, issueId),
      String(Math.max(0, reportCount)),
      'EX',
      CLUSTER_STATE_TTL_SECONDS
    );
  } catch {
    // Best effort. Queue/job dedupe still protects against accidental duplicates.
  }
}

function buildIssueSnapshot(issue) {
  return {
    id: issue.id,
    title: issue.title,
    status: issue.status || null,
    priority: issue.priority || null,
    classification:
      issue.classification ||
      issue.issue_type ||
      issue.issueType ||
      null,
    reportCount: getIssueReportCount(issue),
    intelligenceScore: getIssueIntelligenceScore(issue),
  };
}

module.exports = {
  DEFAULT_CLUSTER_THRESHOLD,
  buildIssueSnapshot,
  getClusterTriggerState,
  getIssueReportCount,
  markClusterTriggered,
  shouldTriggerInspection,
};
