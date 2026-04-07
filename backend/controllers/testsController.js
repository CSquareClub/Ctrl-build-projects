const {
  generateCodeTests,
  generateRepositoryChecksPlan,
  runGeneratedTests,
  runRepositoryChecks,
} = require('../services/codeTestService');
const { getGitHubConnection, getPrimaryRepo } = require('../services/githubService');

async function generateTests(req, res) {
  try {
    const explicitRepoOwner = String(req.body?.repoOwner || '').trim();
    const explicitRepoName = String(req.body?.repoName || '').trim();
    const primaryRepo =
      !explicitRepoOwner || !explicitRepoName
        ? await getPrimaryRepo(req.user.id).catch(() => null)
        : null;
    const repoOwner = explicitRepoOwner || primaryRepo?.owner || '';
    const repoName = explicitRepoName || primaryRepo?.name || '';

    if (repoOwner && repoName) {
      const connection = await getGitHubConnection(req.user.id);
      if (!connection?.accessToken) {
        return res.status(403).json({ error: 'Connect GitHub before preparing repository checks.' });
      }

      const result = await generateRepositoryChecksPlan({
        accessToken: connection.accessToken,
        repoOwner,
        repoName,
        ref:
          String(req.body?.ref || '').trim() ||
          primaryRepo?.defaultBranch ||
          undefined,
      });

      return res.json(result);
    }

    const code = String(req.body?.code || '');
    if (!code.trim()) {
      return res.status(400).json({ error: 'code is required.' });
    }

    const result = await generateCodeTests({
      code,
      issue: req.body?.issue || null,
      analysis: req.body?.analysis || null,
      language: req.body?.language || 'javascript',
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate tests.',
    });
  }
}

async function runTests(req, res) {
  try {
    const explicitRepoOwner = String(req.body?.repoOwner || '').trim();
    const explicitRepoName = String(req.body?.repoName || '').trim();
    const primaryRepo =
      !explicitRepoOwner || !explicitRepoName
        ? await getPrimaryRepo(req.user.id).catch(() => null)
        : null;
    const repoOwner = explicitRepoOwner || primaryRepo?.owner || '';
    const repoName = explicitRepoName || primaryRepo?.name || '';

    if (repoOwner && repoName) {
      const connection = await getGitHubConnection(req.user.id);
      if (!connection?.accessToken) {
        return res.status(403).json({ error: 'Connect GitHub before running repository checks.' });
      }

      const result = await runRepositoryChecks({
        repository: {
          accessToken: connection.accessToken,
          owner: repoOwner,
          name: repoName,
          defaultBranch:
            String(req.body?.defaultBranch || '').trim() ||
            primaryRepo?.defaultBranch ||
            connection.metadata?.default_branch ||
            connection.defaultBranch ||
            'main',
        },
        repoPath: String(req.body?.repoPath || '').trim() || null,
        code: String(req.body?.code || ''),
      });

      return res.json(result);
    }

    const code = String(req.body?.code || '');
    const testCode = String(req.body?.testCode || '');
    if (!code.trim() || !testCode.trim()) {
      return res.status(400).json({ error: 'code and testCode are required.' });
    }

    const result = await runGeneratedTests({
      code,
      testCode,
      language: req.body?.language || 'javascript',
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run tests.',
    });
  }
}

module.exports = {
  generateTests,
  runTests,
};
