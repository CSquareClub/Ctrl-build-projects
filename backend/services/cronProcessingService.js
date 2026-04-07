const supabase = require('../lib/supabaseClient');
const { getRedisConnection } = require('../lib/redis');
const { invokeController } = require('./internalControllerInvoker');
const connectionsController = require('../controllers/connectionsController');
const imapController = require('../controllers/imapController');
const { generateExecutiveSummary } = require('./executiveSummaryService');
const { enqueueInspectionJob } = require('./inspectionService');
const { getProductSetup } = require('./productSetupService');
const { enqueueSystemEvent, EVENT_TYPES } = require('./eventPipelineService');

const REDIS_STATE_TTL_SECONDS = 60 * 60 * 24;
const CRON_CURSOR_TTL_SECONDS = 60 * 60 * 24 * 7;
const SUPPORTED_SYNC_PROVIDERS = [
  'gmail',
  'outlook',
  'app-reviews',
  'google-play',
  'imap',
];

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

async function listUsersByIds(userIds) {
  const ids = unique(userIds);
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('id', ids);

  if (error) {
    throw error;
  }

  return data || [];
}

async function listUsersWithActiveConnections() {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('user_id, provider, status')
    .in('status', ['connected', 'connecting']);

  if (error) {
    throw error;
  }

  return listUsersByIds((data || []).map((row) => row.user_id));
}

async function listUsersWithSignals() {
  const [connectionRows, feedbackRows, issueRows, sdkStateRows] = await Promise.all([
    supabase
      .from('connected_accounts')
      .select('user_id')
      .in('status', ['connected', 'connecting']),
    supabase.from('feedback_events').select('user_id').limit(2000),
    supabase.from('issues').select('user_id').limit(2000),
    supabase
      .from('sdk_pipeline_state')
      .select('user_id,last_received_timestamp,last_processed_timestamp')
      .limit(2000),
  ]);

  const errors = [connectionRows.error, feedbackRows.error, issueRows.error]
    .concat(sdkStateRows.error && sdkStateRows.error.code !== '42P01' ? [sdkStateRows.error] : [])
    .filter(Boolean);
  if (errors.length > 0) {
    throw errors[0];
  }

  const sdkCandidateIds = (sdkStateRows.data || [])
    .filter((row) => {
      if (!row.last_received_timestamp) return false;
      if (!row.last_processed_timestamp) return true;
      return new Date(row.last_received_timestamp).getTime() > new Date(row.last_processed_timestamp).getTime();
    })
    .map((row) => row.user_id);

  const userIds = unique([
    ...(connectionRows.data || []).map((row) => row.user_id),
    ...(feedbackRows.data || []).map((row) => row.user_id),
    ...(issueRows.data || []).map((row) => row.user_id),
    ...sdkCandidateIds,
  ]);

  return listUsersByIds(userIds);
}

async function listUsersWithPendingFeedback() {
  const { data, error } = await supabase
    .from('feedback_events')
    .select('user_id')
    .eq('processed', false)
    .eq('processing', false)
    .limit(2000);

  if (error) {
    throw error;
  }

  return listUsersByIds((data || []).map((row) => row.user_id));
}

async function getConnectionsForUser(userId) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['connected', 'connecting']);

  if (error) {
    throw error;
  }

  return data || [];
}

async function rememberCronState(userId, key, value) {
  try {
    const redis = getRedisConnection();
    await redis.set(
      `cron:${key}:${userId}`,
      JSON.stringify({
        at: new Date().toISOString(),
        value,
      }),
      'EX',
      REDIS_STATE_TTL_SECONDS
    );
  } catch {
    // Redis state is helpful, but cron should still work without it.
  }
}

async function getCronCursor(taskKey) {
  try {
    const redis = getRedisConnection();
    const raw = await redis.get(`cron:cursor:${taskKey}`);
    const parsed = Number(raw || 0);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

async function setCronCursor(taskKey, value) {
  try {
    const redis = getRedisConnection();
    await redis.set(
      `cron:cursor:${taskKey}`,
      String(value),
      'EX',
      CRON_CURSOR_TTL_SECONDS
    );
  } catch {
    // Cursor persistence is best effort.
  }
}

async function selectUserBatch(taskKey, users, batchSize = 1) {
  const orderedUsers = [...users].sort((left, right) =>
    String(left.id).localeCompare(String(right.id))
  );

  if (orderedUsers.length === 0) {
    return {
      users: [],
      cursor: 0,
      nextCursor: 0,
      total: 0,
      wrapped: false,
    };
  }

  const normalizedBatchSize = Math.max(1, Math.min(batchSize, orderedUsers.length));
  const cursor = (await getCronCursor(taskKey)) % orderedUsers.length;
  const batch = [];

  for (let index = 0; index < normalizedBatchSize; index += 1) {
    batch.push(orderedUsers[(cursor + index) % orderedUsers.length]);
  }

  const nextCursor = (cursor + normalizedBatchSize) % orderedUsers.length;
  await setCronCursor(taskKey, nextCursor);

  return {
    users: batch,
    cursor,
    nextCursor,
    total: orderedUsers.length,
    wrapped: nextCursor <= cursor && orderedUsers.length > normalizedBatchSize,
  };
}

async function processAllUsers(taskFn, users) {
  const summary = {
    total: users.length,
    succeeded: 0,
    failed: 0,
    results: [],
  };

  for (const user of users) {
    try {
      const result = await taskFn(user);
      summary.succeeded += 1;
      summary.results.push({
        userId: user.id,
        success: true,
        result,
      });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        userId: user.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}

async function processUserConnectionProvider(user, connection) {
  const provider = connection.provider;

  if (!SUPPORTED_SYNC_PROVIDERS.includes(provider)) {
    return {
      provider,
      skipped: true,
      reason: 'unsupported_for_cron',
    };
  }

  if (provider === 'imap') {
    const response = await invokeController(imapController.syncImapAccount, {
      user,
      body: {
        _cron: true,
        _skipAgentProcessing: true,
      },
    });

    await rememberCronState(user.id, 'imap-sync', {
      provider,
      imported: response.payload?.imported || 0,
    });

    return response.payload;
  }

  const response = await invokeController(connectionsController.syncConnection, {
    user,
    params: {
      provider,
    },
    body: {
      appId: connection.metadata?.appId || null,
      _cron: true,
      _skipAgentProcessing: true,
    },
  });

  await rememberCronState(user.id, 'connection-sync', {
    provider,
    imported: response.payload?.imported || 0,
  });

  return response.payload;
}

async function processUserGmail(user) {
  const connections = await getConnectionsForUser(user.id);
  const gmailConnection = connections.find((connection) => connection.provider === 'gmail');

  if (!gmailConnection) {
    return {
      skipped: true,
      reason: 'gmail_not_connected',
    };
  }

  return processUserConnectionProvider(user, gmailConnection);
}

async function processUserConnections(user) {
  const connections = await getConnectionsForUser(user.id);
  const syncTargets = connections.filter((connection) =>
    SUPPORTED_SYNC_PROVIDERS.includes(connection.provider)
  );

  const results = [];
  for (const connection of syncTargets) {
    results.push({
      provider: connection.provider,
      ...(await processUserConnectionProvider(user, connection)),
    });
  }

  return {
    providers: results,
  };
}

async function processUserFeedback(user) {
  const result = await enqueueSystemEvent({
    type: EVENT_TYPES.FEEDBACK_RECEIVED,
    userId: user.id,
    source: 'cron_recovery',
    dedupeKey: `cron-recovery:${user.id}:${new Date().toISOString().slice(0, 13)}`,
    payload: {
      background: true,
      mode: 'cron-recovery',
    },
    priority: 2,
  });

  await rememberCronState(user.id, 'feedback-analysis', {
    enqueued: true,
    type: EVENT_TYPES.FEEDBACK_RECEIVED,
  });

  return result;
}

async function generateUserInsights(user) {
  const summary = await generateExecutiveSummary(user);
  await rememberCronState(user.id, 'insights', {
    generatedAt: summary?.generatedAt || new Date().toISOString(),
  });
  return summary;
}

async function enqueueHealthInspections(user) {
  const { data, error } = await supabase
    .from('feedback_events')
    .select('url, title, occurred_at')
    .eq('user_id', user.id)
    .not('url', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== '42P01') {
    throw error;
  }

  const setup = await getProductSetup(user.id).catch(() => null);
  const targetUrl =
    data?.url ||
    String(setup?.website_url || '').trim() ||
    process.env.INSPECTION_DEFAULT_URL ||
    '';
  if (!targetUrl) {
    return {
      skipped: true,
      reason: 'no_target_url',
    };
  }

  const hourBucket = new Date().toISOString().slice(0, 13);
  const job = await enqueueInspectionJob({
    jobType: 'inspect:health',
    userId: user.id,
    projectId: null,
    issueId: null,
    url: targetUrl,
    issue: data?.title || 'Automated health inspection',
    context: {
      page: 'Health check',
      steps: [],
    },
    dedupeKey: `inspect:health:${user.id}:${targetUrl}:${hourBucket}`,
  });

  await rememberCronState(user.id, 'inspect-health', {
    url: targetUrl,
    jobId: job.id,
  });

  return {
    queued: true,
    jobId: job.id,
    url: targetUrl,
  };
}

module.exports = {
  enqueueHealthInspections,
  generateUserInsights,
  listUsersWithActiveConnections,
  listUsersWithPendingFeedback,
  listUsersWithSignals,
  processAllUsers,
  processUserConnections,
  processUserFeedback,
  processUserGmail,
  selectUserBatch,
};
