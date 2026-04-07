const { Worker } = require('bullmq');
const { getRedisConnection } = require('../lib/redis');
const { logInspectionActivity, saveInspectionResult } = require('./inspectionService');
const { publishSystemEvent } = require('./liveEventsService');

const DEFAULT_INSPECTION_SERVICE_URL = 'http://127.0.0.1:4100';
let workerInstance = null;

function getInspectionServiceUrl() {
  return String(
    process.env.INSPECTION_SERVICE_URL || DEFAULT_INSPECTION_SERVICE_URL
  )
    .trim()
    .replace(/\/+$/, '');
}

async function callInspectionService(payload) {
  const controller = new AbortController();
  const timeoutMs = Math.max(
    10000,
    Math.min(Number(process.env.INSPECTION_SERVICE_TIMEOUT_MS || 15000), 30000)
  );
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getInspectionServiceUrl()}/inspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INSPECTION_SERVICE_SECRET
          ? { 'x-inspection-secret': String(process.env.INSPECTION_SERVICE_SECRET) }
          : {}),
      },
      body: JSON.stringify({
        url: payload.url,
        issue: payload.issue,
        context: payload.context || {},
        timeoutMs,
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.error || `Inspection service failed with ${response.status}`);
    }

    return body;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function buildFallbackServiceResult(payload, error) {
  const quick = payload.quickAssessment || {};
  return {
    issue_detected: true,
    selector: null,
    screenshot: null,
    confidence: Number(quick.confidence || 44),
    suggestions: Array.isArray(quick.suggestions) && quick.suggestions.length
      ? quick.suggestions
      : ['Browser validation service was unavailable. Retry after the worker reconnects.'],
    observed_behavior:
      quick.observedBehavior ||
      'The inspection was queued, but the browser validation service was unavailable.',
    suspected_cause:
      quick.suspectedCause ||
      (error instanceof Error ? error.message : 'Inspection service unavailable.'),
    suggested_fix:
      quick.suggestedFix ||
      'Verify the inspection worker and Playwright service are running, then retry.',
    runtime_error: error instanceof Error ? error.message : String(error || 'Inspection service unavailable'),
  };
}

async function processInspectionJob(job) {
  const payload = job.data || {};
  const jobId = job?.id || `heavy-${Date.now()}`;
  const userId = payload.userId;
  const projectId = payload.projectId || null;
  const issueId = payload.issueId || null;

  if (!userId || !payload.url) {
    throw new Error('Inspection jobs require userId and url.');
  }

  await publishSystemEvent({
    userId,
    type: 'inspection.status',
    queueName: 'heavy-jobs',
    priority: 'normal',
    payload: {
      issueId,
      projectId,
      state: 'running',
      jobId,
      message: 'Background browser validation started',
    },
  });

  await logInspectionActivity({
    userId,
    projectId,
    issueId,
    message: 'Handing inspection to the browser validation service',
    status: 'info',
    metadata: {
      jobId,
      url: payload.url,
      inspectionType: payload.inspectionType || 'inspect:issue',
      serviceUrl: getInspectionServiceUrl(),
    },
  });

  let serviceResult;
  let failed = false;

  try {
    serviceResult = await callInspectionService(payload);
  } catch (error) {
    failed = true;
    await logInspectionActivity({
      userId,
      projectId,
      issueId,
      message: error instanceof Error ? error.message : 'Inspection service unavailable',
      status: 'error',
      metadata: {
        jobId,
        stage: 'inspection_service',
      },
    });

    serviceResult = buildFallbackServiceResult(payload, error);
  }

  const result = await saveInspectionResult({
    userId,
    projectId,
    issueId,
    url: payload.url,
    issue: payload.issue || 'Inspection',
    observedBehavior: serviceResult.observed_behavior,
    suspectedCause: serviceResult.suspected_cause,
    suggestedFix: serviceResult.suggested_fix,
    confidence: serviceResult.confidence,
    rawData: {
      inspectionType: payload.inspectionType || 'inspect:issue',
      issue_detected: Boolean(serviceResult.issue_detected),
      selector: serviceResult.selector || null,
      screenshot: serviceResult.screenshot || null,
      suggestions: serviceResult.suggestions || [],
      consoleErrors: serviceResult.console_errors || [],
      networkFailures: serviceResult.network_failures || [],
      failedActions: serviceResult.failed_actions || [],
      uiContext: serviceResult.ui_context || payload.context?.page || null,
      durationMs: serviceResult.duration_ms || null,
      runtimeError: serviceResult.runtime_error || null,
      quickAssessment: payload.quickAssessment || null,
    },
  });

  await logInspectionActivity({
    userId,
    projectId,
    issueId,
    message: failed
      ? 'Inspection completed with fallback validation'
      : 'Inspection completed with browser validation',
    status: failed ? 'error' : 'success',
    metadata: {
      jobId,
      resultId: result.id,
      confidence: result.confidence,
    },
  });

  await publishSystemEvent({
    userId,
    type: 'inspection.status',
    queueName: 'heavy-jobs',
    priority: failed ? 'high' : 'normal',
    payload: {
      issueId,
      projectId,
      state: 'completed',
      jobId,
      message: failed
        ? 'Inspection completed with fallback validation'
        : 'Inspection completed',
    },
  });

  return result;
}

function startInspectionWorker() {
  if (workerInstance || !process.env.REDIS_URL) {
    return workerInstance;
  }

  workerInstance = new Worker('heavy-jobs', processInspectionJob, {
    connection: getRedisConnection(),
    concurrency: Math.max(1, Math.min(Number(process.env.HEAVY_JOBS_CONCURRENCY || 1), 2)),
  });

  workerInstance.on('completed', (job) => {
    console.log(`[heavy-inspect-worker] completed ${job.name} (${job.id})`);
  });

  workerInstance.on('failed', (job, error) => {
    console.error(
      `[heavy-inspect-worker] failed ${job?.name || 'unknown'} (${job?.id || 'n/a'}): ${error.message}`
    );
  });

  return workerInstance;
}

module.exports = {
  processInspectionJob,
  startInspectionWorker,
};
