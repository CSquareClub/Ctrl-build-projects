const crypto = require('crypto');
const { Worker } = require('bullmq');
const supabase = require('../lib/supabaseClient');
const { getRedisConnection } = require('../lib/redis');
const { eventQueue } = require('../queues/eventQueue');
const { claimAndProcessFeedback } = require('./feedbackProcessingService');
const { enqueueInspectionJob } = require('./inspectionService');
const { getProductSetup } = require('./productSetupService');
const {
  buildIssueSnapshot,
  getClusterTriggerState,
  getIssueReportCount,
  markClusterTriggered,
  shouldTriggerInspection,
} = require('./feedbackClusterService');

const EVENT_JOB_NAME = 'system:event';
const EVENT_QUEUE_NAME = 'event-pipeline';

const EVENT_TYPES = {
  FEEDBACK_RECEIVED: 'feedback_received',
  FEEDBACK_CLUSTERED: 'feedback_clustered',
  INSPECTION_TRIGGERED: 'inspection_triggered',
  GITHUB_ANALYSIS: 'github_analysis',
  ISSUE_CREATED: 'issue_created',
  AGENT_ACTION: 'agent_action',
};

let workerInstance = null;

function isValidInspectionUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildTimestamp(value = null) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function buildHash(value) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, 12);
}

function buildEventJobId(event) {
  if (event.dedupeKey) {
    return String(event.dedupeKey);
  }

  const payloadKey = buildHash(JSON.stringify(event.payload || {}));
  return [
    'event',
    event.type,
    event.userId,
    event.source || 'system',
    payloadKey,
  ].join(':');
}

async function resolveUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error('Event pipeline user not found.');
  }

  return data;
}

async function enqueueSystemEvent(input) {
  const event = {
    type: input.type,
    userId: input.userId,
    source: input.source || 'system',
    payload: input.payload || {},
    timestamp: buildTimestamp(input.timestamp),
    dedupeKey: input.dedupeKey || null,
  };

  if (!process.env.REDIS_URL) {
    return processEventJob({
      id: buildEventJobId(event),
      name: EVENT_JOB_NAME,
      data: event,
    });
  }

  const job = await eventQueue.add(EVENT_JOB_NAME, event, {
    jobId: buildEventJobId(event),
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    priority: input.priority || 2,
  });

  return {
    queued: true,
    jobId: job.id,
    type: event.type,
  };
}

async function processFeedbackReceivedEvent(event) {
  const user = await resolveUser(event.userId);
  const result = await claimAndProcessFeedback(user, {
    ...(event.payload || {}),
    background: true,
    eventDriven: true,
    skipAutoInspection: true,
  });

  const issues = Array.isArray(result?.rebuildResult?.issues)
    ? result.rebuildResult.issues.map(buildIssueSnapshot)
    : [];

  if (issues.length > 0) {
    await enqueueSystemEvent({
      type: EVENT_TYPES.FEEDBACK_CLUSTERED,
      userId: event.userId,
      source: event.source,
      dedupeKey: [
        'cluster',
        event.userId,
        result?.processedCount || 0,
        buildHash(
          issues
            .map((issue) => `${issue.id}:${issue.reportCount}`)
            .join('|')
        ),
      ].join(':'),
      payload: {
        issues,
        origin: event.payload?.mode || event.source || 'feedback',
      },
    });
  }

  return {
    processedCount: result?.processedCount || 0,
    issuesUpdated: result?.issuesUpdated || 0,
    queuedClusters: issues.length,
  };
}

async function processFeedbackClusteredEvent(event) {
  const issues = Array.isArray(event.payload?.issues) ? event.payload.issues : [];
  if (!issues.length) {
    return {
      skipped: true,
      reason: 'no_issues',
    };
  }

  const setup = await getProductSetup(event.userId).catch(() => null);
  const targetUrl = String(setup?.website_url || '').trim();
  if (!isValidInspectionUrl(targetUrl)) {
    return {
      skipped: true,
      reason: 'no_target_url',
    };
  }

  let queued = 0;
  for (const issue of issues) {
    if (!shouldTriggerInspection(issue)) {
      continue;
    }

    const reportCount = getIssueReportCount(issue);
    const lastTriggeredCount = await getClusterTriggerState(event.userId, issue.id);
    if (reportCount <= lastTriggeredCount) {
      continue;
    }

    await enqueueSystemEvent({
      type: EVENT_TYPES.INSPECTION_TRIGGERED,
      userId: event.userId,
      source: 'feedback_cluster',
      dedupeKey: `inspection-trigger:${event.userId}:${issue.id}:${reportCount}`,
      payload: {
        issueId: issue.id,
        issue: issue.title || 'Recurring product issue',
        reportCount,
        url: targetUrl,
      },
      priority: 1,
    });

    await markClusterTriggered(event.userId, issue.id, reportCount);
    queued += 1;
  }

  return {
    queued,
    inspectedCandidates: issues.length,
  };
}

async function processInspectionTriggeredEvent(event) {
  const payload = event.payload || {};
  if (!isValidInspectionUrl(payload.url)) {
    return {
      skipped: true,
      reason: 'invalid_target_url',
    };
  }

  const job = await enqueueInspectionJob({
    jobType: 'inspect:issue',
    userId: event.userId,
    projectId: payload.projectId || null,
    issueId: payload.issueId || null,
    url: payload.url,
    issue: payload.issue || 'Recurring product issue',
    context: {
      page: payload.page || payload.issue || 'Product page',
      steps: Array.isArray(payload.steps) ? payload.steps : [],
      trigger: 'event_pipeline',
      clusterCount: payload.reportCount || 0,
    },
    dedupeKey: payload.dedupeKey || `inspect:event:${event.userId}:${payload.issueId || buildHash(payload.url)}`,
    priority: 1,
  });

  return {
    queued: true,
    jobId: job.id,
  };
}

async function processEventJob(job) {
  const event = job.data || {};

  switch (event.type) {
    case EVENT_TYPES.FEEDBACK_RECEIVED:
      return processFeedbackReceivedEvent(event);
    case EVENT_TYPES.FEEDBACK_CLUSTERED:
      return processFeedbackClusteredEvent(event);
    case EVENT_TYPES.INSPECTION_TRIGGERED:
      return processInspectionTriggeredEvent(event);
    case EVENT_TYPES.GITHUB_ANALYSIS:
    case EVENT_TYPES.ISSUE_CREATED:
    case EVENT_TYPES.AGENT_ACTION:
      return {
        acknowledged: true,
        type: event.type,
        deferred: true,
      };
    default:
      return {
        skipped: true,
        reason: 'unknown_event_type',
        type: event.type || 'unknown',
      };
  }
}

async function getEventPipelineHealth() {
  const queue = process.env.REDIS_URL
    ? await eventQueue.bull.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
    : {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };

  return {
    events: {
      queueName: EVENT_QUEUE_NAME,
      queue,
      workerEnabled: process.env.START_EVENTS_WORKER === 'true',
    },
  };
}

function startEventWorker() {
  if (workerInstance || !process.env.REDIS_URL) {
    return workerInstance;
  }

  workerInstance = new Worker(EVENT_QUEUE_NAME, processEventJob, {
    connection: getRedisConnection(),
    concurrency: 4,
  });

  workerInstance.on('completed', (job) => {
    console.log(`[event-worker] completed ${job.name} (${job.id})`);
  });

  workerInstance.on('failed', (job, error) => {
    console.error(
      `[event-worker] failed ${job?.name || 'unknown'} (${job?.id || 'n/a'}): ${error.message}`
    );
  });

  return workerInstance;
}

module.exports = {
  EVENT_JOB_NAME,
  EVENT_QUEUE_NAME,
  EVENT_TYPES,
  enqueueSystemEvent,
  getEventPipelineHealth,
  processEventJob,
  startEventWorker,
};
