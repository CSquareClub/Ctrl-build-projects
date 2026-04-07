const path = require('path');
const { generateCodeAutoFix } = require('../services/codeAutoFixService');
const { getGitHubConnection, getPrimaryRepo, getRepository } = require('../services/githubService');
const { createPullRequestFromPatch } = require('../services/prService');
const { validatePatchInSandbox } = require('../services/validationService');

async function fixCode(req, res) {
  try {
    const { code, issue } = req.body || {};

    if (!String(code || '').trim()) {
      return res.status(400).json({ error: 'code is required.' });
    }

    const result = await generateCodeAutoFix({
      code,
      language: req.body?.language,
      filePath: req.body?.filePath,
      issue: issue || null,
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Failed to generate code fix.',
    });
  }
}

async function createCodePullRequest(req, res) {
  try {
    const patch = String(req.body?.patch || '').trim();
    const explicitRepoOwner = String(req.body?.repoOwner || '').trim();
    const explicitRepoName = String(req.body?.repoName || '').trim();
    const primaryRepo =
      !explicitRepoOwner || !explicitRepoName
        ? await getPrimaryRepo(req.user.id)
        : null;
    const repoOwner = explicitRepoOwner || primaryRepo?.owner || '';
    const repoName = explicitRepoName || primaryRepo?.name || '';
    const baseBranch =
      String(req.body?.baseBranch || '').trim() || primaryRepo?.defaultBranch || 'main';

    if (!patch) {
      return res.status(400).json({ error: 'patch is required.' });
    }
    if (!repoOwner || !repoName) {
      return res.status(400).json({ error: 'Select a primary repository before creating a pull request.' });
    }

    const connection = await getGitHubConnection(req.user.id);
    if (!connection?.accessToken) {
      return res.status(403).json({
        error: 'Connect GitHub before creating a pull request from analyzer output.',
      });
    }

    const repositoryRecord = await getRepository(
      connection.accessToken,
      repoOwner,
      repoName
    );
    const repository = {
      accessToken: connection.accessToken,
      owner: repositoryRecord.owner?.login || repoOwner,
      name: repositoryRecord.name || repoName,
      defaultBranch: repositoryRecord.default_branch || baseBranch,
    };

    const validationSummary = await validatePatchInSandbox({
      repository,
      patch,
      generatedTest: null,
    });

    if (validationSummary.status !== 'passed') {
      return res.status(422).json({
        error: validationSummary.summary || 'Sandbox validation failed.',
        validationSummary,
      });
    }

    const fallbackTitle =
      String(req.body?.issue?.title || '').trim() ||
      `Code analysis fix for ${path.basename(String(req.body?.filePath || 'selected file'))}`;
    const synthesizedIssue = {
      id: `code-analysis-${Date.now()}`,
      title: fallbackTitle,
      summary:
        String(req.body?.issue?.detail || req.body?.explanation?.what || '').trim() ||
        'Analyzer-detected code risk remediated with a focused patch.',
      description:
        String(req.body?.issue?.detail || req.body?.explanation?.why || '').trim() ||
        'Generated from the AgenticPulse Code Analysis workspace.',
    };

    const prDescription =
      req.body?.prDescription ||
      {
        title: String(req.body?.title || `Fix: ${fallbackTitle}`).trim(),
        summary:
          String(req.body?.explanation?.what || synthesizedIssue.summary).trim() ||
          synthesizedIssue.summary,
        rootCause:
          String(req.body?.explanation?.why || '').trim() ||
          'AgenticPulse highlighted a targeted risk pattern in the selected file.',
        changes: [
          String(req.body?.explanation?.fix || 'Apply the analyzer-generated patch.').trim(),
        ].filter(Boolean),
        impact:
          String(req.body?.impact || req.body?.explanation?.impact || '').trim() ||
          'Reduces the risk detected during code analysis before merge.',
        confidence:
          Number(req.body?.confidence) > 1
            ? Number(req.body?.confidence)
            : Number(req.body?.confidence || 0) * 100,
      };

    const result = await createPullRequestFromPatch(req.user.id, synthesizedIssue, patch, {
      prTitle: req.body?.title,
      prBody: req.body?.body,
      prDescription,
      baseBranch,
      repoOwner,
      repoName,
      validationSummary,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create pull request.',
    });
  }
}

module.exports = {
  fixCode,
  createCodePullRequest,
};
