const { resolveRepositoryForIssue } = require('./repoRoutingService');
const { searchRelevantCode } = require('./codeSearchService');
const { buildIssueIntelligence } = require('./issueIntelligenceService');
const { extractMultiFileAst } = require('./multiFileAstService');
const { buildMultiFileContext } = require('./multiFileContextBuilderService');
const { analyzeMultiFileContext } = require('./multiFileReasoningService');

async function resolveIssueMultiFileAnalysis(userId, issueId, options = {}) {
  const { issue, issueIntelligence } = await buildIssueIntelligence(userId, issueId);
  const resolvedRepository = await resolveRepositoryForIssue(userId, issue, {
    repoOwner: options.repoOwner,
    repoName: options.repoName,
  });

  const searchResult = await searchRelevantCode(
    {
      connection: resolvedRepository.connection,
      owner: resolvedRepository.owner,
      name: resolvedRepository.name,
      defaultBranch: resolvedRepository.defaultBranch || 'main',
    },
    issue,
    {
      repoStructure: resolvedRepository.repoStructure || null,
      issueIntelligence,
      maxFiles: options.maxFiles || 5,
      maxTotalLines: options.maxTotalLines || 750,
      maxLinesPerFile: options.maxLinesPerFile || 220,
    }
  );

  const astSummary = extractMultiFileAst(searchResult.files);
  const context = buildMultiFileContext({
    issue,
    repository: {
      owner: resolvedRepository.owner,
      name: resolvedRepository.name,
      defaultBranch: resolvedRepository.defaultBranch || 'main',
    },
    files: searchResult.files,
    astSummary,
    issueIntelligence,
  });

  const analysis = await analyzeMultiFileContext(context, astSummary);
  return {
    analysis,
    issue,
    issueIntelligence,
    astSummary,
    repository: {
      owner: resolvedRepository.owner,
      name: resolvedRepository.name,
      defaultBranch: resolvedRepository.defaultBranch || 'main',
    },
  };
}

module.exports = {
  resolveIssueMultiFileAnalysis,
};
