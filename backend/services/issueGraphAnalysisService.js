const { resolveRepositoryForIssue } = require('./repoRoutingService');
const { searchRelevantCode } = require('./codeSearchService');
const { buildIssueIntelligence } = require('./issueIntelligenceService');
const { extractMultiFileAst } = require('./multiFileAstService');
const { buildMultiFileContext } = require('./multiFileContextBuilderService');
const { analyzeMultiFileContext } = require('./multiFileReasoningService');

const CACHE_TTL_MS = 1000 * 60 * 10;
const analysisCache = new Map();

function getCache(cacheKey) {
  const entry = analysisCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    analysisCache.delete(cacheKey);
    return null;
  }
  return entry.value;
}

function setCache(cacheKey, value) {
  analysisCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function resolveIssueMultiFileAnalysis(userId, issueId, options = {}) {
  const cacheKey = JSON.stringify({
    userId,
    issueId,
    repoOwner: options.repoOwner || null,
    repoName: options.repoName || null,
    mode: 'multi-file-graph',
  });

  const cached = getCache(cacheKey);
  if (cached) {
    return cached;
  }

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
      maxFiles: Math.max(2, Math.min(Number(options.maxFiles || 5), 5)),
      maxTotalLines: Math.max(240, Math.min(Number(options.maxTotalLines || 750), 900)),
      maxLinesPerFile: Math.max(80, Math.min(Number(options.maxLinesPerFile || 220), 260)),
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

  const result = await analyzeMultiFileContext(context, astSummary);
  setCache(cacheKey, result);
  return result;
}

module.exports = {
  resolveIssueMultiFileAnalysis,
};
