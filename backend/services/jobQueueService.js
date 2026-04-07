const { getQueueForJobType, QUEUE_PRIORITY } = require('../queues');

const JOB_TYPES = {
  GROQ_CHAT: 'groq_chat',
  PATCH_GENERATION: 'patch_generation',
  TEST_EXECUTION: 'test_execution',
  GITHUB_PR: 'github_pr',
  SYNC_SOURCES: 'sync_sources',
  AGENT_LOOP: 'agent_loop',
  INSIGHTS_UPDATE: 'insights_update',
  INSPECT_ISSUE: 'inspect_issue',
  INSPECT_HEALTH: 'inspect_health',
  PLAYWRIGHT_INSPECTION: 'playwright_inspection',
  FEEDBACK_RECEIVED: 'feedback_received',
  FEEDBACK_CLUSTERED: 'feedback_clustered',
  INSPECTION_TRIGGERED: 'inspection_triggered',
  GITHUB_ANALYSIS: 'github_analysis',
  ISSUE_CREATED: 'issue_created',
  AGENT_ACTION: 'agent_action',
};

const QUEUE_NAMES = {
  REALTIME: 'realtime',
  AGENT: 'agent',
  GITHUB: 'github',
  SYNC: 'sync',
  MAINTENANCE: 'maintenance',
  INSPECT: 'inspect',
};

function normalizePriority(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && QUEUE_PRIORITY[value]) {
    return QUEUE_PRIORITY[value];
  }
  return QUEUE_PRIORITY.medium;
}

function mapJobName(jobType, payload = {}) {
  if (payload.jobName) {
    return payload.jobName;
  }

  switch (jobType) {
    case JOB_TYPES.GROQ_CHAT:
      return 'chat';
    case JOB_TYPES.PATCH_GENERATION:
      return 'patch_generation';
    case JOB_TYPES.TEST_EXECUTION:
      return 'test_execution';
    case JOB_TYPES.GITHUB_PR:
      return 'create_pr';
    case JOB_TYPES.SYNC_SOURCES:
      return payload.provider ? `sync_${String(payload.provider).replace(/-/g, '_')}` : 'sync_all';
    case JOB_TYPES.AGENT_LOOP:
      return payload.mode === 'anomaly_detection' ? 'detect_anomalies' : 'process_feedback';
    case JOB_TYPES.INSIGHTS_UPDATE:
      return 'update_insights';
    case JOB_TYPES.INSPECT_ISSUE:
    case JOB_TYPES.INSPECT_HEALTH:
    case JOB_TYPES.PLAYWRIGHT_INSPECTION:
      return 'playwright_inspection';
    case JOB_TYPES.FEEDBACK_RECEIVED:
    case JOB_TYPES.FEEDBACK_CLUSTERED:
    case JOB_TYPES.INSPECTION_TRIGGERED:
    case JOB_TYPES.GITHUB_ANALYSIS:
    case JOB_TYPES.ISSUE_CREATED:
    case JOB_TYPES.AGENT_ACTION:
      return String(jobType);
    default:
      return String(jobType);
  }
}

async function enqueueJob(input) {
  const queue = getQueueForJobType(input.jobType);
  const job = await queue.add(
    mapJobName(input.jobType, input.payload),
    {
      userId: input.userId || null,
      ...(input.payload || {}),
    },
    {
      priority: normalizePriority(input.priority),
      jobId: input.jobId,
    }
  );

  return {
    id: job.id,
    queueName: queue.name,
    jobName: job.name,
  };
}

async function enqueueUniqueJob(input) {
  return enqueueJob({
    ...input,
    jobId: input.dedupeKey || input.jobId,
  });
}

module.exports = {
  JOB_TYPES,
  QUEUE_NAMES,
  enqueueJob,
  enqueueUniqueJob,
};
