const {
  enqueueHealthInspections,
  generateUserInsights,
  listUsersWithActiveConnections,
  listUsersWithPendingFeedback,
  listUsersWithSignals,
  processAllUsers,
  processUserConnections,
  processUserFeedback,
  selectUserBatch,
} = require('../services/cronProcessingService');

function isAuthorized(req) {
  const configuredSecret = String(process.env.CRON_SECRET || '').trim();
  if (!configuredSecret) {
    return true;
  }

  const providedSecret = String(
    req.headers['x-cron-secret'] ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
      req.query?.secret ||
      ''
  ).trim();

  return providedSecret === configuredSecret;
}

function rejectUnauthorized(res) {
  return res.status(401).json({
    error: 'Invalid cron secret.',
  });
}

function readBatchSize(req, fallback) {
  const value = Number(req.query?.batch || req.body?.batch || fallback);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.max(1, Math.min(10, Math.floor(value)));
}

async function runSyncCron(req, res) {
  try {
    if (!isAuthorized(req)) {
      return rejectUnauthorized(res);
    }

    const allUsers = await listUsersWithActiveConnections();
    const batch = await selectUserBatch('sync', allUsers, readBatchSize(req, 2));
    const summary = await processAllUsers(processUserConnections, batch.users);

    return res.json({
      success: true,
      task: 'sync',
      totalUsers: batch.total,
      processedUsers: batch.users.length,
      nextCursor: batch.nextCursor,
      ...summary,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run sync cron.',
    });
  }
}

async function runAnalyzeCron(req, res) {
  try {
    if (!isAuthorized(req)) {
      return rejectUnauthorized(res);
    }

    const allUsers = await listUsersWithPendingFeedback();
    const batch = await selectUserBatch('analyze', allUsers, readBatchSize(req, 1));
    const summary = await processAllUsers(processUserFeedback, batch.users);

    return res.json({
      success: true,
      task: 'analyze',
      totalUsers: batch.total,
      processedUsers: batch.users.length,
      nextCursor: batch.nextCursor,
      ...summary,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run analyze cron.',
    });
  }
}

async function runInsightsCron(req, res) {
  try {
    if (!isAuthorized(req)) {
      return rejectUnauthorized(res);
    }

    const allUsers = await listUsersWithSignals();
    const batch = await selectUserBatch('insights', allUsers, readBatchSize(req, 2));
    const summary = await processAllUsers(generateUserInsights, batch.users);

    return res.json({
      success: true,
      task: 'insights',
      totalUsers: batch.total,
      processedUsers: batch.users.length,
      nextCursor: batch.nextCursor,
      ...summary,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run insights cron.',
    });
  }
}

async function runInspectCron(req, res) {
  try {
    if (!isAuthorized(req)) {
      return rejectUnauthorized(res);
    }

    const allUsers = await listUsersWithSignals();
    const batch = await selectUserBatch('inspect', allUsers, readBatchSize(req, 2));
    const summary = await processAllUsers(enqueueHealthInspections, batch.users);

    return res.json({
      success: true,
      task: 'inspect',
      totalUsers: batch.total,
      processedUsers: batch.users.length,
      nextCursor: batch.nextCursor,
      ...summary,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run inspect cron.',
    });
  }
}

module.exports = {
  runAnalyzeCron,
  runInspectCron,
  runInsightsCron,
  runSyncCron,
};
