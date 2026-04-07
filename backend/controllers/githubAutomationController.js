const crypto = require('crypto');
const {
  getGitHubConnection,
  getGitHubConnectionByRepository,
  getPrimaryRepo,
  updateGitHubConnectionMetadata,
} = require('../services/githubService');
const { runAutomation } = require('../lib/automations/engine');

const AUTOMATION_TYPES = ['codeRiskScan', 'testGapDetection', 'regressionCheck', 'codeQualityPipeline'];

function getAutomationState(metadata = {}) {
  return metadata?.automations || {};
}

function buildAutomationCards(metadata = {}) {
  const state = getAutomationState(metadata);
  return AUTOMATION_TYPES.map((type) => {
    const run = state[type] || {};
    return {
      type,
      name:
        type === 'codeRiskScan'
          ? 'Code Risk Scan'
          : type === 'testGapDetection'
            ? 'Test Gap Detection'
            : type === 'regressionCheck'
              ? 'Regression Check'
              : 'Code Quality Pipeline',
      description:
        type === 'codeRiskScan'
          ? 'Scans form/auth flows, fixes submission/security bugs, and can auto-commit a branch.'
          : type === 'testGapDetection'
            ? 'Highlights changed files that need regression coverage.'
            : type === 'regressionCheck'
              ? 'Runs repository validation to catch regressions on push.'
              : 'Clones the repo, installs deps, runs lint/tests, fixes errors, and opens a PR.',
      status: run.status || 'idle',
      lastRun: run.lastRun || null,
      issuesFound: Number(run.issuesFound || 0),
      summary: run.summary || null,
      branchName: run.branchName || null,
      commitSha: run.commitSha || null,
      prUrl: run.prUrl || null,
      changedFiles: Array.isArray(run.changedFiles) ? run.changedFiles : [],
      logs: Array.isArray(run.logs) ? run.logs : [],
    };
  });
}

async function persistAutomationRun(connection, type, result, status = 'success', payload = null) {
  const current = getAutomationState(connection.metadata || {});
  const next = {
    ...current,
    [type]: {
      status,
      lastRun: new Date().toISOString(),
      issuesFound: Array.isArray(result?.issues) ? result.issues.length : 0,
      summary: result?.summary || null,
      branchName: result?.commit?.branchName || null,
      commitSha: result?.commit?.commitSha || null,
      prUrl: result?.prUrl || null,
      changedFiles: payload?.changedFiles || [],
      logs: Array.isArray(result?.logs)
        ? result.logs.slice(-12)
        : String(result?.logs || '')
            .split('\n')
            .filter(Boolean)
            .slice(-12),
      lastPayload: payload || current?.[type]?.lastPayload || null,
    },
  };

  await updateGitHubConnectionMetadata(connection.id, { automations: next });
  return next[type];
}

function verifyWebhookSignature(req) {
  const secret = String(process.env.GITHUB_WEBHOOK_SECRET || '').trim();
  if (!secret) return true;

  const signature = String(req.headers['x-hub-signature-256'] || '').trim();
  if (!signature.startsWith('sha256=')) return false;

  const payload = JSON.stringify(req.body || {});
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function buildPushPayload(connection, body = {}) {
  const repoOwner =
    body?.repository?.owner?.name ||
    body?.repository?.owner?.login ||
    connection.repoOwner;
  const repoName = body?.repository?.name || connection.repoName;
  const branch = String(body?.ref || '').replace(/^refs\/heads\//, '') || connection.defaultBranch || 'main';
  const changedFiles = Array.from(
    new Set(
      []
        .concat(
          ...(Array.isArray(body?.commits)
            ? body.commits.map((commit) =>
                []
                  .concat(commit.added || [])
                  .concat(commit.modified || [])
              )
            : [])
        )
        .filter(Boolean)
    )
  ).slice(0, 5);

  return {
    userId: connection.user_id,
    repoOwner,
    repoName,
    branch,
    ref: branch,
    before: body?.before || null,
    after: body?.after || null,
    changedFiles,
    commits: Array.isArray(body?.commits) ? body.commits : [],
    createPullRequest: true,
    localRepoPath: connection.metadata?.repo_local_path || null,
  };
}

async function listAutomations(req, res) {
  try {
    const connection = await getGitHubConnection(req.user.id);
    const primaryRepo = connection ? await getPrimaryRepo(req.user.id).catch(() => null) : null;
    if (!connection) {
      return res.json({ automations: buildAutomationCards({}) });
    }

    return res.json({
      automations: buildAutomationCards(connection.metadata || {}),
      repository: {
        owner: primaryRepo?.owner || connection.repoOwner || null,
        name: primaryRepo?.name || connection.repoName || null,
        defaultBranch: primaryRepo?.defaultBranch || connection.defaultBranch || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load GitHub automations.',
    });
  }
}

async function runAutomationNow(req, res) {
  try {
    const type = String(req.params.type || '').trim();
    if (!AUTOMATION_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Unknown automation type.' });
    }

    const connection = await getGitHubConnection(req.user.id);
    if (!connection) {
      return res.status(403).json({ error: 'Connect GitHub before running automations.' });
    }
    const primaryRepo = await getPrimaryRepo(req.user.id);

    const current = getAutomationState(connection.metadata || {});
    const lastPayload = current?.[type]?.lastPayload || null;
    const payload = {
      ...lastPayload,
      userId: req.user.id,
      repoOwner:
        req.body?.repoOwner || primaryRepo?.owner || lastPayload?.repoOwner || connection.repoOwner,
      repoName:
        req.body?.repoName || primaryRepo?.name || lastPayload?.repoName || connection.repoName,
      defaultBranch:
        req.body?.defaultBranch ||
        primaryRepo?.defaultBranch ||
        lastPayload?.defaultBranch ||
        connection.defaultBranch ||
        'main',
      createPullRequest:
        typeof req.body?.createPullRequest === 'boolean'
          ? req.body.createPullRequest
          : true,
      localRepoPath:
        req.body?.localRepoPath ||
        lastPayload?.localRepoPath ||
        connection.metadata?.repo_local_path ||
        null,
      changedFiles:
        Array.isArray(req.body?.changedFiles) && req.body.changedFiles.length > 0
          ? req.body.changedFiles
          : Array.isArray(lastPayload?.changedFiles)
            ? lastPayload.changedFiles
            : [],
      commits: Array.isArray(lastPayload?.commits) ? lastPayload.commits : [],
    };

    const result = await runAutomation(type, payload);
    const persisted = await persistAutomationRun(connection, type, result, 'success', payload);

    return res.json({
      success: true,
      automation: persisted,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run automation.',
    });
  }
}

async function handleGitHubWebhook(req, res) {
  try {
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    if (String(req.headers['x-github-event'] || '') !== 'push') {
      return res.json({ ok: true, ignored: true });
    }

    const repoOwner =
      req.body?.repository?.owner?.name || req.body?.repository?.owner?.login || '';
    const repoName = req.body?.repository?.name || '';
    const connection = await getGitHubConnectionByRepository(repoOwner, repoName);

    if (!connection) {
      return res.json({
        ok: true,
        ignored: true,
        reason: 'No matching connected GitHub repository found.',
      });
    }

    const payload = buildPushPayload(connection, req.body);
    const runResults = {};

    for (const type of AUTOMATION_TYPES) {
      try {
        const result = await runAutomation(type, payload);
        runResults[type] = result;
        await persistAutomationRun(connection, type, result, 'success', payload);
      } catch (error) {
        runResults[type] = {
          summary: error instanceof Error ? error.message : 'Automation failed.',
          issues: [],
          patches: [],
          logs: ['Automation failed'],
        };
        await persistAutomationRun(
          connection,
          type,
          runResults[type],
          'failed',
          payload
        );
      }
    }

    return res.json({
      ok: true,
      repository: `${payload.repoOwner}/${payload.repoName}`,
      changedFiles: payload.changedFiles,
      automations: runResults,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process GitHub webhook.',
    });
  }
}

module.exports = {
  handleGitHubWebhook,
  listAutomations,
  runAutomationNow,
};
