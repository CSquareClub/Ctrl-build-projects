const { fetchRepositoryFile } = require('../services/codeSearchService');
const { getGitHubConnection, getPrimaryRepo } = require('../services/githubService');
const { runFullPipeline } = require('../lib/orchestrator');
const {
  detectCodeLanguage,
  getLanguageDisplayName,
} = require('../services/codeLanguageService');

async function analyzeCode(req, res) {
  try {
    const code = String(req.body?.code || '');
    if (!code.trim()) {
      return res.status(400).json({
        error: 'code is required.',
      });
    }

    const result = await runFullPipeline({
      userId: req.user.id,
      code,
      source: String(req.body?.source || 'manual'),
      language: String(req.body?.language || ''),
      filePath: String(req.body?.filePath || ''),
    });
    return res.json({
      jobId: `sync-${Date.now()}`,
      status: 'completed',
      result,
      mode: 'inline',
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to analyze code risk.',
    });
  }
}

async function getAnalysisResult(req, res) {
  return res.status(410).json({
    error: 'Synchronous MVP mode does not use code analysis polling.',
  });
}

async function fetchRepoFile(req, res) {
  try {
    const explicitRepoOwner = String(req.body?.repoOwner || '').trim();
    const explicitRepoName = String(req.body?.repoName || '').trim();
    const path = String(req.body?.path || '').trim();
    const ref = String(req.body?.ref || '').trim() || undefined;
    const primaryRepo =
      !explicitRepoOwner || !explicitRepoName
        ? await getPrimaryRepo(req.user.id)
        : null;
    const repoOwner = explicitRepoOwner || primaryRepo?.owner || '';
    const repoName = explicitRepoName || primaryRepo?.name || '';

    if (!repoOwner || !repoName || !path) {
      return res.status(400).json({
        error: 'Select a primary repository or provide repoOwner, repoName, and path.',
      });
    }

    const connection = await getGitHubConnection(req.user.id);
    if (!connection?.accessToken) {
      return res.status(403).json({
        error: 'Connect GitHub before loading repository files.',
      });
    }

    const file = await fetchRepositoryFile(
      connection.accessToken,
      repoOwner,
      repoName,
      path,
      ref
    );

    return res.json({
      path,
      content: file.content,
      size: file.size,
      sha: file.sha,
      language: getLanguageDisplayName(
        detectCodeLanguage({
          code: file.content,
          filePath: path,
        })
      ),
      lineCount: String(file.content || '').split('\n').length,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to fetch repository file.',
    });
  }
}

module.exports = {
  analyzeCode,
  getAnalysisResult,
  fetchRepoFile,
};
