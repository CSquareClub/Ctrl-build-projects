const { getGitHubConnection } = require('../../services/githubService');
const { fetchRepositoryStructure, fetchRepositoryFile } = require('../../services/codeSearchService');
const { analyzeCode } = require('./code');

async function analyzeRepositoryFile(input) {
  const accessToken = String(input?.accessToken || '');
  const repoOwner = String(input?.repoOwner || '');
  const repoName = String(input?.repoName || '');
  const filePath = String(input?.filePath || '');
  const ref = String(input?.ref || '').trim() || undefined;

  if (!accessToken || !repoOwner || !repoName || !filePath) {
    throw new Error('accessToken, repoOwner, repoName, and filePath are required.');
  }

  const file = await fetchRepositoryFile(accessToken, repoOwner, repoName, filePath, ref);
  const analysis = await analyzeCode({
    code: file.content,
    filePath,
  });

  return {
    file: {
      path: filePath,
      content: file.content,
      size: file.size,
      sha: file.sha,
    },
    analysis,
  };
}

async function analyzeConnectedRepository(input) {
  const connection = await getGitHubConnection(input.userId);
  if (!connection?.accessToken) {
    throw new Error('Connect GitHub before analyzing a repository.');
  }

  const structure = await fetchRepositoryStructure(
    connection.accessToken,
    input.repoOwner,
    input.repoName,
    input.defaultBranch
  );

  const targetPath = input.filePath || structure.keyFiles?.[0];
  if (!targetPath) {
    throw new Error('No repository file was available for analysis.');
  }

  const result = await analyzeRepositoryFile({
    accessToken: connection.accessToken,
    repoOwner: input.repoOwner,
    repoName: input.repoName,
    filePath: targetPath,
    ref: input.defaultBranch,
  });

  return {
    structure,
    ...result,
  };
}

module.exports = {
  analyzeConnectedRepository,
  analyzeRepositoryFile,
};
