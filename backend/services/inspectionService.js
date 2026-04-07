const supabase = require('../lib/supabaseClient');
const { heavyJobsQueue } = require('../queues/heavyJobsQueue');
const { publishSystemEvent } = require('./liveEventsService');

const HEAVY_QUEUE_THRESHOLD = Math.max(
  1,
  Math.min(Number(process.env.HEAVY_JOBS_QUEUE_THRESHOLD || 5), 20)
);
const HEAVY_QUEUE_DELAY_MS = Math.max(
  5000,
  Math.min(Number(process.env.HEAVY_JOBS_DELAY_MS || 30000), 300000)
);

function isMissingRelationError(error) {
  return (
    error?.code === '23503' ||
    error?.code === '42P01' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function buildTempActivity(input) {
  return {
    id: `temp-activity-${Date.now()}`,
    userId: input.userId,
    projectId: input.projectId || null,
    issueId: input.issueId || null,
    message: input.message,
    status: input.status || 'info',
    metadata: input.metadata || {},
    timestamp: new Date().toISOString(),
  };
}

function buildTempResult(input) {
  return {
    id: `temp-result-${Date.now()}`,
    userId: input.userId,
    projectId: input.projectId || null,
    issueId: input.issueId || null,
    url: input.url || null,
    issue: input.issue || 'Inspection',
    observedBehavior: input.observedBehavior || 'Inspection completed.',
    suspectedCause: input.suspectedCause || 'No structured cause recorded.',
    suggestedFix: input.suggestedFix || 'Review the captured evidence.',
    confidence: Number(input.confidence || 0),
    rawData: input.rawData || {},
    createdAt: new Date().toISOString(),
  };
}

function normalizeActivity(row) {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    issueId: row.issue_id,
    message: row.message,
    status: row.status,
    metadata: row.metadata || {},
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
  };
}

function normalizeResult(row) {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    issueId: row.issue_id,
    url: row.url || null,
    issue: row.issue,
    observedBehavior: row.observed_behavior,
    suspectedCause: row.suspected_cause,
    suggestedFix: row.suggested_fix,
    confidence: Number(row.confidence || 0),
    rawData: row.raw_data || {},
    createdAt: row.created_at,
  };
}

function buildRuleBasedInspection(input) {
  const issue = String(input.issue || 'Product issue');
  const page = String(input.context?.page || 'Target page');
  const steps = Array.isArray(input.context?.steps) ? input.context.steps : [];

  return {
    issue_detected: true,
    confidence: steps.length > 0 ? 58 : 46,
    suggestions: steps.length > 0
      ? ['Background browser validation has been queued with the provided interaction steps.']
      : ['Background browser validation has been queued. Add guided steps for a sharper reproduction if needed.'],
    observedBehavior: `Prepared an inspection for ${issue} on ${page}. Rule-based triage queued a background validation run.`,
    suspectedCause: steps.length > 0
      ? 'A guided browser validation is needed to confirm the suspected flow failure.'
      : 'A browser validation is needed to confirm the runtime behavior for this issue.',
    suggestedFix: 'Wait for the background validation result before applying a final fix.',
  };
}

async function publishInspectionEvent(userId, type, payload, priority = 'normal') {
  await publishSystemEvent({
    userId,
    type,
    queueName: 'heavy-jobs',
    priority,
    payload,
  });
}

async function logInspectionActivity(input) {
  const record = {
    user_id: input.userId,
    project_id: input.projectId || null,
    issue_id: input.issueId || null,
    message: input.message,
    status: input.status || 'info',
    metadata: {
      inspectionType: 'web',
      ...(input.metadata || {}),
    },
  };

  const { data, error } = await supabase
    .from('agent_activity')
    .insert(record)
    .select('*')
    .maybeSingle();

  const activity = error
    ? isMissingRelationError(error)
      ? buildTempActivity(input)
      : null
    : normalizeActivity(data);

  if (!activity && error) {
    throw error;
  }

  await publishInspectionEvent(
    input.userId,
    'inspection.activity',
    activity,
    input.status === 'error' ? 'high' : 'normal'
  );
  return activity;
}

async function saveInspectionResult(input) {
  const record = {
    user_id: input.userId,
    project_id: input.projectId || null,
    issue_id: input.issueId || null,
    url: input.url || null,
    issue: input.issue,
    observed_behavior: input.observedBehavior,
    suspected_cause: input.suspectedCause,
    suggested_fix: input.suggestedFix,
    confidence: Number(input.confidence || 0),
    raw_data: input.rawData || {},
  };

  const { data, error } = await supabase
    .from('inspection_results')
    .insert(record)
    .select('*')
    .maybeSingle();

  const result = error
    ? isMissingRelationError(error)
      ? buildTempResult(input)
      : null
    : normalizeResult(data);

  if (!result && error) {
    throw error;
  }

  await publishInspectionEvent(input.userId, 'inspection.result', result, 'normal');
  return result;
}

async function listInspectionActivity(userId, options = {}) {
  let query = supabase
    .from('agent_activity')
    .select('*')
    .eq('user_id', userId)
    .eq('metadata->>inspectionType', 'web')
    .order('timestamp', { ascending: false })
    .limit(options.limit || 40);

  if (options.issueId) {
    query = query.eq('issue_id', options.issueId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeActivity);
}

async function listInspectionResults(userId, options = {}) {
  let query = supabase
    .from('inspection_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(options.limit || 10);

  if (options.issueId) {
    query = query.eq('issue_id', options.issueId);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeResult);
}

async function getHeavyQueueCounts() {
  if (!process.env.REDIS_URL) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }

  return heavyJobsQueue.bull.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused'
  );
}

async function enqueueInspectionJob(input) {
  const dedupeKey = input.dedupeKey || [
    'playwright_inspection',
    input.userId,
    input.projectId || 'default',
    input.issueId || input.issue || 'inspection',
    input.url || 'no-url',
  ].join(':');
  const quickAssessment = buildRuleBasedInspection(input);

  await logInspectionActivity({
    userId: input.userId,
    projectId: input.projectId || null,
    issueId: input.issueId || null,
    message: input.jobType === 'inspect:health'
      ? 'Prepared background health inspection'
      : 'Prepared background inspection',
    status: 'info',
    metadata: {
      url: input.url,
      issue: input.issue,
      inspectionMode: 'queued',
      quickAssessment,
    },
  });

  const queueCounts = await getHeavyQueueCounts();
  const backlog = Number(queueCounts.waiting || 0) + Number(queueCounts.active || 0);
  const shouldDelay = backlog >= HEAVY_QUEUE_THRESHOLD;

  const payload = {
    userId: input.userId,
    projectId: input.projectId || null,
    issueId: input.issueId || null,
    url: input.url,
    issue: input.issue,
    context: input.context || {},
    inspectionType: input.jobType || 'inspect:issue',
    quickAssessment,
    queuedAt: new Date().toISOString(),
  };

  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required for background inspection jobs.');
  }

  const job = await heavyJobsQueue.add(
    'playwright_inspection',
    payload,
    {
      jobId: dedupeKey,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      delay: shouldDelay ? HEAVY_QUEUE_DELAY_MS : 0,
      priority: input.priority || 2,
      removeOnComplete: 100,
      removeOnFail: 200,
    }
  );

  await publishInspectionEvent(
    input.userId,
    'inspection.status',
    {
      issueId: input.issueId || null,
      projectId: input.projectId || null,
      state: shouldDelay ? 'delayed' : 'queued',
      jobId: job.id,
      message: shouldDelay
        ? 'Inspection delayed to protect the heavy browser queue'
        : 'Inspection queued for background validation',
      quickAssessment,
      queue: {
        waiting: queueCounts.waiting || 0,
        active: queueCounts.active || 0,
      },
    },
    shouldDelay ? 'high' : 'normal'
  );

  return {
    id: job.id,
    name: job.name,
    queueName: heavyJobsQueue.name,
    delayed: shouldDelay,
    quickAssessment,
  };
}

async function getInspectionHealth() {
  const queue = await getHeavyQueueCounts();
  return {
    inspection: {
      queueName: heavyJobsQueue.name,
      queue,
      threshold: HEAVY_QUEUE_THRESHOLD,
    },
  };
}

module.exports = {
  enqueueInspectionJob,
  getInspectionHealth,
  listInspectionActivity,
  listInspectionResults,
  logInspectionActivity,
  saveInspectionResult,
};
