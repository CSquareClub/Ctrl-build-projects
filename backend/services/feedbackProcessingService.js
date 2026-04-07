const supabase = require('../lib/supabaseClient');
const { rebuildIssuesFromFeedback } = require('../lib/issueAggregator');
const { runAgent } = require('./agentService');
const { enqueueInspectionJob } = require('./inspectionService');
const { getProductSetup } = require('./productSetupService');

const DEFAULT_PROCESSING_BATCH_SIZE = 25;
const AUTO_INSPECTION_PRIORITY_LEVELS = new Set(['HIGH']);
const AUTO_INSPECTION_INTELLIGENCE_THRESHOLD = 6;

async function claimFeedbackRows(userId, options = {}) {
  const limit = Math.max(
    1,
    Math.min(Number(options.limit || DEFAULT_PROCESSING_BATCH_SIZE), 100)
  );
  const uniqueKeys = Array.isArray(options.uniqueKeys)
    ? options.uniqueKeys.filter(Boolean)
    : [];

  let query = supabase
    .from('feedback_events')
    .select('*')
    .eq('user_id', userId)
    .eq('processed', false)
    .eq('processing', false)
    .order('occurred_at', { ascending: true })
    .limit(limit);

  if (uniqueKeys.length > 0) {
    query = query.in('unique_key', uniqueKeys);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const candidateRows = data || [];
  if (candidateRows.length === 0) {
    return [];
  }

  const candidateIds = candidateRows.map((row) => row.id).filter(Boolean);
  if (candidateIds.length === 0) {
    return [];
  }

  const { data: claimedRows, error: claimError } = await supabase
    .from('feedback_events')
    .update({
      processing: true,
    })
    .eq('user_id', userId)
    .eq('processed', false)
    .eq('processing', false)
    .in('id', candidateIds)
    .select('*');

  if (claimError) {
    throw claimError;
  }

  return claimedRows || [];
}

async function completeFeedbackProcessing(userId, rows) {
  const ids = (rows || []).map((row) => row.id).filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('feedback_events')
    .update({
      processed: true,
      processing: false,
      processed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .in('id', ids);

  if (error) {
    throw error;
  }
}

async function releaseFeedbackClaims(userId, rows) {
  const ids = (rows || []).map((row) => row.id).filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('feedback_events')
    .update({
      processing: false,
    })
    .eq('user_id', userId)
    .eq('processed', false)
    .in('id', ids);

  if (error) {
    throw error;
  }
}

async function processClaimedFeedback(user, feedbackRows, options = {}) {
  if (!Array.isArray(feedbackRows) || feedbackRows.length === 0) {
    return {
      processedCount: 0,
      skipped: true,
    };
  }

  try {
    const rebuildResult = await rebuildIssuesFromFeedback(user.id, {
      feedbackRows,
    });
    const agentResult = await runAgent(user, {
      ...options,
      newFeedbackRows: feedbackRows,
    });
    let inspectionJobs = [];
    if (options.skipAutoInspection !== true) {
      inspectionJobs = await enqueueTriggeredInspections(user, rebuildResult, options);
    }

    await completeFeedbackProcessing(user.id, feedbackRows);

    return {
      processedCount: feedbackRows.length,
      issuesUpdated: rebuildResult.issues?.length || 0,
      agentResult,
      rebuildResult,
      inspectionJobs,
    };
  } catch (error) {
    await releaseFeedbackClaims(user.id, feedbackRows).catch(() => null);
    throw error;
  }
}

async function claimAndProcessFeedback(user, options = {}) {
  const claimedRows = await claimFeedbackRows(user.id, options);
  if (claimedRows.length === 0) {
    return {
      processedCount: 0,
      skipped: true,
    };
  }

  return processClaimedFeedback(user, claimedRows, options);
}

function isValidInspectionUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function shouldInspectIssue(issue) {
  const priority = String(issue?.priority || '').toUpperCase();
  const intelligenceScore = Number(
    issue?.intelligence_score ??
      issue?.intelligenceScore ??
      0
  );

  return (
    AUTO_INSPECTION_PRIORITY_LEVELS.has(priority) ||
    intelligenceScore >= AUTO_INSPECTION_INTELLIGENCE_THRESHOLD
  );
}

async function enqueueTriggeredInspections(user, rebuildResult, options = {}) {
  if (options.background === true && options.mode === 'cron') {
    return [];
  }

  const impactedIssues = Array.isArray(rebuildResult?.issues) ? rebuildResult.issues : [];
  if (impactedIssues.length === 0) {
    return [];
  }

  const setup = await getProductSetup(user.id).catch(() => null);
  const targetUrl = String(setup?.website_url || '').trim();
  if (!isValidInspectionUrl(targetUrl)) {
    return [];
  }

  const hourBucket = new Date().toISOString().slice(0, 13);
  const inspectableIssues = impactedIssues.filter(shouldInspectIssue).slice(0, 2);
  if (inspectableIssues.length === 0) {
    return [];
  }

  const queued = [];
  for (const issue of inspectableIssues) {
    const job = await enqueueInspectionJob({
      jobType: 'inspect:issue',
      userId: user.id,
      projectId: null,
      issueId: issue.id,
      url: targetUrl,
      issue: issue.title,
      context: {
        page: issue.title,
        steps: [],
      },
      dedupeKey: `inspect:feedback:${user.id}:${issue.id}:${hourBucket}`,
      priority: 1,
    }).catch(() => null);

    if (job) {
      queued.push(job);
    }
  }

  return queued;
}

module.exports = {
  claimAndProcessFeedback,
  claimFeedbackRows,
  completeFeedbackProcessing,
  enqueueTriggeredInspections,
  processClaimedFeedback,
  releaseFeedbackClaims,
};
