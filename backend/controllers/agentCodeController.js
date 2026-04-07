const supabase = require('../lib/supabaseClient');
const {
  createGitHubAuthUrl,
  exchangeCodeForToken,
  fetchGitHubProfile,
  getGitHubConnection,
  getPrimaryRepo,
  githubRequest,
  listRepositoriesForUser,
  setSelectedRepository,
  upsertGitHubConnection,
  verifyState,
} = require('../services/githubService');
const {
  deleteRepoMapping,
  getGitHubSettings,
  getRepoStats,
  listRepoMappings,
  recordRepoStat,
  resolveRepositoryForIssue,
  updateGitHubSettings,
  upsertRepoMapping,
} = require('../services/repoRoutingService');
const { searchRelevantCode } = require('../services/codeSearchService');
const { generatePatch } = require('../services/patchService');
const { generateRegressionTest } = require('../services/testGenerationService');
const { createPullRequestFromPatch } = require('../services/prService');
const { validatePatchInSandbox } = require('../services/validationService');
const { normalizeIssueType } = require('../services/learningService');
const { recordAgentOutcome } = require('../services/selfHealingService');
const { getRepoStructure, analyzeRepositoryStructure } = require('../services/repoStructureService');
const { chatWithGitHubContext } = require('../services/githubAssistantService');
const { buildIssueIntelligence } = require('../services/issueIntelligenceService');
const { resolveIssueMultiFileAnalysis } = require('../services/issueGraphAnalysisService');
const { buildGraphData } = require('../services/graphBuilderService');
const { answerGraphQuestion } = require('../services/graphQueryService');
const { analyzeLatestRepositoryCode } = require('../services/latestRepoFixService');
const { analyzeAndFixLocalRepository } = require('../services/localRepoAnalyzeFixService');
const { QUEUE_NAMES } = require('../services/jobQueueService');
const { publishSystemEvent } = require('../services/liveEventsService');
const { emitDomainEvent } = require('../lib/eventBus');
const { detectCodeLanguage } = require('../services/codeLanguageService');

const APP_URL = String(process.env.APP_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');
const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 10;
const analysisCache = new Map();
const pendingAnalyses = new Map();

function getAnalysisCache(key) {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    analysisCache.delete(key);
    return null;
  }
  return entry.value;
}

function setAnalysisCache(key, value) {
  analysisCache.set(key, {
    value,
    expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS,
  });
}

async function resolveIssueCodeAnalysis(userId, issueId, options = {}) {
  const { issue, issueIntelligence } = await buildIssueIntelligence(userId, issueId);
  const cacheKey = JSON.stringify({
    userId,
    issueId,
    repoOwner: options.repoOwner || null,
    repoName: options.repoName || null,
  });

  const cached = getAnalysisCache(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = pendingAnalyses.get(cacheKey);
  if (pending) {
    return pending;
  }

  const analysisPromise = (async () => {
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
      }
    );

    const patch = await generatePatch(issue, searchResult.files, {
      repository: {
        owner: resolvedRepository.owner,
        name: resolvedRepository.name,
        defaultBranch: resolvedRepository.defaultBranch || 'main',
      },
      repoStructure: resolvedRepository.repoStructure || null,
      issueIntelligence,
    });
    const generatedTest = await generateRegressionTest({
      issue,
      files: searchResult.files,
      analysis: patch,
      repository: {
        owner: resolvedRepository.owner,
        name: resolvedRepository.name,
        defaultBranch: resolvedRepository.defaultBranch || 'main',
      },
      repoStructure: resolvedRepository.repoStructure || null,
    }).catch(() => null);

    const result = {
      issue,
      repository: {
        owner: resolvedRepository.owner,
        name: resolvedRepository.name,
        defaultBranch: resolvedRepository.defaultBranch || 'main',
      },
      repositorySource: resolvedRepository.source,
      repositoryStructure: resolvedRepository.repoStructure || null,
      issueType: resolvedRepository.issueType,
      routingScore: resolvedRepository.routingScore || 0,
      routingBreakdown: resolvedRepository.routingBreakdown || null,
      issueIntelligence,
      keywords: searchResult.keywords,
      files: searchResult.files,
      totalLines: searchResult.totalLines,
      possibleCauses: patch.possibleCauses,
      selectedRootCause: patch.selectedRootCause,
      rootCause: patch.rootCause,
      rootCauseConfidence: patch.rootCauseConfidence,
      patchConfidence: patch.patchConfidence,
      reasoningSummary: patch.reasoningSummary,
      alternativeFixes: patch.alternativeFixes,
      prDescription: patch.prDescription,
      patchExplanation: patch.reasoningSummary,
      impact:
        patch.prDescription?.impact ||
        `Fixes ${issue.title} affecting ${issueIntelligence.analytics.affected_users} reported users.`,
      generatedTest,
      targetFiles: patch.targetFiles,
      changedFileCount: patch.changedFileCount,
      changedLineCount: patch.changedLineCount,
      patch: patch.patch,
      model: patch.model,
      generatedAt: new Date().toISOString(),
    };

    setAnalysisCache(cacheKey, result);
    return result;
  })();

  pendingAnalyses.set(cacheKey, analysisPromise);
  return analysisPromise.finally(() => {
    pendingAnalyses.delete(cacheKey);
  });
}

function mapGithubStatus(connection) {
  return {
    connected: Boolean(connection),
    username: connection?.metadata?.username || null,
    name: connection?.metadata?.name || null,
    avatarUrl: connection?.metadata?.avatar_url || null,
    repository: connection
      ? {
          owner: connection.metadata?.repo_owner || null,
          name: connection.metadata?.repo_name || null,
          defaultBranch: connection.metadata?.default_branch || null,
        }
      : null,
    connectedAt: connection?.metadata?.connectedAt || null,
  };
}

async function startGitHubOAuth(req, res) {
  try {
    const redirectTo = String(req.query?.redirectTo || '').trim();
    const authUrl = createGitHubAuthUrl({
      userId: req.user.id,
      redirectTo,
    });
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to start GitHub OAuth.',
    });
  }
}

async function githubOAuthCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `${APP_URL}/dashboard/github?github=error&message=${encodeURIComponent(
          String(error)
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${APP_URL}/dashboard/github?github=error&message=${encodeURIComponent(
          'Missing GitHub OAuth code or state.'
        )}`
      );
    }

    const oauthState = verifyState(state);
    const tokens = await exchangeCodeForToken(String(code));
    const profile = await fetchGitHubProfile(tokens.access_token);

    await upsertGitHubConnection(oauthState.userId, {
      accessToken: tokens.access_token,
      profile,
    });
    await emitDomainEvent(
      'repo_connected',
      {
        userId: oauthState.userId,
        provider: 'github',
        repository: {
          owner: profile.login,
          name: null,
        },
      },
      {
        userId: oauthState.userId,
        queueName: QUEUE_NAMES.GITHUB,
        priority: 'medium',
      }
    ).catch(() => null);

    return res.redirect(
      `${oauthState.redirectTo}?github=connected&message=${encodeURIComponent(
        `Connected GitHub as ${profile.login}`
      )}`
    );
  } catch (err) {
    return res.redirect(
      `${APP_URL}/dashboard/github?github=error&message=${encodeURIComponent(
        err instanceof Error ? err.message : 'Failed to connect GitHub.'
      )}`
    );
  }
}

async function getGitHubStatus(req, res) {
  try {
    const connection = await getGitHubConnection(req.user.id);
    const settings = await getGitHubSettings(req.user.id);
    res.json({
      ...mapGithubStatus(connection),
      codeInsightsEnabled: settings.code_insights_enabled !== false,
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to load GitHub status.',
    });
  }
}

async function listGitHubMappings(req, res) {
  try {
    const [mappings, settings, repoStats] = await Promise.all([
      listRepoMappings(req.user.id),
      getGitHubSettings(req.user.id),
      getRepoStats(req.user.id),
    ]);

    res.json({
      mappings,
      repoStats,
      settings: {
        codeInsightsEnabled: settings.code_insights_enabled !== false,
      },
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load GitHub routing settings.',
    });
  }
}

async function listGitHubRepos(req, res) {
  try {
    const repos = await listRepositoriesForUser(req.user.id);
    res.json({ repos });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load GitHub repositories.',
    });
  }
}

async function getGitHubRepoStructure(req, res) {
  try {
    const repoOwner = String(req.query?.repoOwner || '').trim() || undefined;
    const repoName = String(req.query?.repoName || '').trim() || undefined;
    const forceRefresh = String(req.query?.refresh || '').trim() === '1';

    const structure = forceRefresh
      ? await analyzeRepositoryStructure(req.user.id, {
          repoOwner,
          repoName,
          forceRefresh: true,
        })
      : await getRepoStructure(req.user.id, {
          repoOwner,
          repoName,
        });

    res.json({ structure });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to analyze repository structure.',
    });
  }
}

async function updateGitHubWorkspaceSettings(req, res) {
  try {
    const enabled = req.body?.codeInsightsEnabled;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'codeInsightsEnabled must be a boolean.',
      });
    }

    const settings = await updateGitHubSettings(req.user.id, {
      codeInsightsEnabled: enabled,
    });

    res.json({
      settings: {
        codeInsightsEnabled: settings.code_insights_enabled !== false,
      },
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update GitHub settings.',
    });
  }
}

async function selectGitHubRepo(req, res) {
  try {
    const owner = String(req.body?.repoOwner || '').trim();
    const name = String(req.body?.repoName || '').trim();

    if (!owner || !name) {
      return res.status(400).json({
        error: 'repoOwner and repoName are required.',
      });
    }

    const repository = await setSelectedRepository(req.user.id, owner, name);
    await emitDomainEvent(
      'repo_connected',
      {
        userId: req.user.id,
        provider: 'github',
        repository,
      },
      {
        userId: req.user.id,
        queueName: QUEUE_NAMES.GITHUB,
        priority: 'medium',
      }
    ).catch(() => null);
    res.json({ repository });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to select GitHub repository.',
    });
  }
}

async function saveRepoMapping(req, res) {
  try {
    const issueType = String(req.body?.issueType || '').trim();
    const repoOwner = String(req.body?.repoOwner || '').trim();
    const repoName = String(req.body?.repoName || '').trim();

    if (!issueType || !repoOwner || !repoName) {
      return res.status(400).json({
        error: 'issueType, repoOwner, and repoName are required.',
      });
    }

    const mapping = await upsertRepoMapping(
      req.user.id,
      issueType,
      repoOwner,
      repoName
    );

    res.json({ mapping });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to save repository mapping.',
    });
  }
}

async function removeRepoMapping(req, res) {
  try {
    const issueType = String(req.params.issueType || '').trim();
    if (!issueType) {
      return res.status(400).json({ error: 'issueType is required.' });
    }

    await deleteRepoMapping(req.user.id, issueType);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to remove repository mapping.',
    });
  }
}

async function analyzeIssueCode(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before analyzing code.',
      });
    }

    const response = await resolveIssueCodeAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });
    return res.json({
      ...response,
      approvalRequired: true,
      approvalReason:
        'AI can suggest fixes, but a human must review and approve before any pull request is created.',
    });
  } catch (error) {
    try {
      const { issue, issueIntelligence } = await buildIssueIntelligence(
        req.user.id,
        req.params.issueId
      );

      return res.json({
        issue,
        issueIntelligence,
        repository: null,
        repositorySource: 'unresolved',
        repositoryStructure: null,
        issueType: normalizeIssueType(issue).slug,
        routingScore: 0,
        routingBreakdown: null,
        keywords: [],
        files: [],
        totalLines: 0,
        possibleCauses: [
          error instanceof Error
            ? error.message
            : 'Code analysis could not resolve repository context.',
        ],
        selectedRootCause:
          error instanceof Error
            ? error.message
            : 'Repository context was unavailable.',
        rootCause:
          error instanceof Error
            ? error.message
            : 'Repository context was unavailable.',
        rootCauseConfidence: 0,
        patchConfidence: 0,
        reasoningSummary:
          error instanceof Error
            ? error.message
            : 'Code analysis could not complete.',
        alternativeFixes: [],
        prDescription: null,
        patchExplanation:
          error instanceof Error
            ? error.message
            : 'Code analysis could not complete.',
        impact: 'Repository analysis could not be completed for this issue yet.',
        generatedTest: null,
        targetFiles: [],
        changedFileCount: 0,
        changedLineCount: 0,
        patch: '',
        model: null,
        generatedAt: new Date().toISOString(),
        approvalRequired: true,
        approvalReason:
          'AI can suggest fixes, but a human must review and approve before any pull request is created.',
        degraded: true,
      });
    } catch (fallbackError) {
      res.status(500).json({
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : error instanceof Error
              ? error.message
              : 'Failed to analyze code for this issue.',
      });
    }
  }
}

async function analyzeIssueMultiFile(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before running multi-file analysis.',
      });
    }

    const result = await resolveIssueMultiFileAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to run multi-file analysis.',
    });
  }
}

async function getIssueGraph(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before opening the dependency graph.',
      });
    }

    const analysis = await resolveIssueMultiFileAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });
    const graph = buildGraphData(analysis);

    return res.json({
      analysis,
      graph,
      suggestedPrompts: [
        'What is the root cause?',
        'Show the impact path',
        'Highlight the critical path',
        'Which files are most connected?',
      ],
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to build dependency graph for this issue.',
    });
  }
}

async function queryIssueGraph(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before using graph guidance.',
      });
    }

    const question = String(req.body?.question || '').trim();
    if (!question) {
      return res.status(400).json({ error: 'question is required.' });
    }

    const analysis = await resolveIssueMultiFileAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });
    const graph = buildGraphData(analysis);
    const response = await answerGraphQuestion({
      question,
      analysis,
      graphData: graph,
    });

    return res.json(response);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to answer the graph question.',
    });
  }
}

async function analyzeLatestCode(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before analyzing the latest code.',
      });
    }

    const result = await analyzeLatestRepositoryCode(req.user.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to analyze and commit the latest repository code.',
    });
  }
}

async function analyzeAndFixGitHubRepo(req, res) {
  try {
    const result = await analyzeAndFixLocalRepository({
      repoPath: req.body?.repoPath,
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to analyze, fix, and push the local GitHub repository.',
    });
  }
}

async function loadRepositoryFile(req, res) {
  try {
    const explicitRepoOwner = String(req.body?.repoOwner || '').trim();
    const explicitRepoName = String(req.body?.repoName || '').trim();
    const filePath = String(req.body?.path || '').trim().replace(/^\/+/, '');
    const ref = String(req.body?.ref || '').trim();

    const primaryRepository =
      !explicitRepoOwner || !explicitRepoName
        ? await getPrimaryRepo(req.user.id)
        : null;
    const repoOwner = explicitRepoOwner || primaryRepository?.owner || '';
    const repoName = explicitRepoName || primaryRepository?.name || '';

    if (!repoOwner || !repoName || !filePath) {
      return res.status(400).json({
        error: 'Select a primary repository or provide repoOwner, repoName, and path.',
      });
    }

    const connection = await getGitHubConnection(req.user.id);
    if (!connection?.accessToken) {
      return res.status(400).json({
        error: 'Connect GitHub before loading repository files.',
      });
    }

    const query = new URLSearchParams();
    if (ref) {
      query.set('ref', ref);
    }

    const encodedPath = filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const contentResult = await githubRequest(
      connection.accessToken,
      `/repos/${repoOwner}/${repoName}/contents/${encodedPath}${
        query.toString() ? `?${query.toString()}` : ''
      }`
    );

    if (!contentResult || Array.isArray(contentResult) || contentResult.type !== 'file') {
      return res.status(400).json({
        error: 'Requested path is not a file.',
      });
    }

    const encoding = String(contentResult.encoding || '').toLowerCase();
    const rawContent =
      encoding === 'base64'
        ? Buffer.from(String(contentResult.content || '').replace(/\n/g, ''), 'base64').toString(
            'utf8'
          )
        : String(contentResult.content || '');

    const normalizedContent = rawContent.replace(/\r\n/g, '\n');
    const language = detectCodeLanguage({
      code: normalizedContent,
      filePath,
    });

    return res.json({
      path: contentResult.path || filePath,
      content: normalizedContent,
      size: Number(contentResult.size || Buffer.byteLength(normalizedContent, 'utf8')),
      sha: contentResult.sha || '',
      language,
      lineCount: normalizedContent ? normalizedContent.split('\n').length : 0,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to load repository file.',
    });
  }
}

async function chatIssueCode(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before using the GitHub assistant.',
      });
    }

    const message = String(req.body?.message || '').trim();
    const action = String(req.body?.action || '').trim();
    const selectedFilePath = String(req.body?.filePath || '').trim() || null;

    if (!message && !action) {
      return res.status(400).json({ error: 'message or action is required.' });
    }

    const analysis = await resolveIssueCodeAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });

    const response = await chatWithGitHubContext({
      issue: analysis.issue,
      analysis,
      message: message || action,
      action,
      selectedFilePath,
    });

    return res.json({
      answer: response.answer,
      quickReplies: response.quickReplies,
      references: {
        repository: analysis.repository,
        filePath: selectedFilePath,
        issueId: analysis.issue.id,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to generate GitHub assistant response.',
    });
  }
}

async function createPatchPullRequest(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before creating pull requests.',
      });
    }

    const patch = String(req.body?.patch || '').trim();
    if (!patch) {
      return res.status(400).json({ error: 'patch is required.' });
    }

    const analysis = await resolveIssueCodeAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });
    const repository = {
      accessToken: analysis.repository?.owner
        ? (
            await getGitHubConnection(req.user.id)
          )?.accessToken
        : null,
      owner: req.body?.repoOwner || analysis.repository.owner,
      name: req.body?.repoName || analysis.repository.name,
      defaultBranch: req.body?.baseBranch || analysis.repository.defaultBranch || 'main',
    };
    if (!repository.accessToken) {
      throw new Error('Connect GitHub before validating and creating a pull request.');
    }

    const generatedTest =
      req.body?.generatedTest ||
      (await generateRegressionTest({
        issue,
        files: analysis.files,
        analysis,
        repository: analysis.repository,
        repoStructure: analysis.repositoryStructure || null,
      }).catch(() => null));

    const validationSummary = await validatePatchInSandbox({
      repository,
      patch,
      generatedTest,
    });

    if (validationSummary.status !== 'passed') {
      return res.status(422).json({
        error: validationSummary.summary || 'Sandbox validation failed.',
        validationSummary,
      });
    }

    const result = await createPullRequestFromPatch(req.user.id, issue, patch, {
      prTitle: req.body?.title,
      prBody: req.body?.body,
      prDescription: req.body?.prDescription,
      baseBranch: req.body?.baseBranch,
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
      extraFiles: generatedTest
        ? [
            {
              path: generatedTest.path,
              content: generatedTest.content,
              commitMessage: `test: add regression coverage for ${issue.title}`,
            },
          ]
        : [],
      validationSummary,
    });

    try {
      await publishSystemEvent({
        userId: req.user.id,
        type: 'patch_accepted',
        queueName: QUEUE_NAMES.GITHUB,
        priority: 'high',
        payload: {
          issueId: issue.id,
          repository: result.repository,
          pullRequest: result.pullRequest,
          generatedTest: generatedTest?.path || null,
          ciStatus: result.ciStatus || null,
        },
      }).catch(() => null);
      await recordRepoStat(req.user.id, {
        issueType: normalizeIssueType(issue).slug,
        repoOwner: result.repository?.owner || req.body?.repoOwner || null,
        repoName: result.repository?.name || req.body?.repoName || null,
        outcome: 'success',
      });
      await recordAgentOutcome(req.user.id, {
        issueId: issue.id,
        issueType: normalizeIssueType(issue).slug,
        actionType: 'create_pr',
        confidence:
          req.body?.confidence == null ? null : Number(req.body.confidence),
        outcome: 'success',
        repoOwner: result.repository?.owner || req.body?.repoOwner || null,
        repoName: result.repository?.name || req.body?.repoName || null,
        metadata: {
          branchName: result.branchName || null,
          prUrl: result.prUrl || null,
        },
      });
    } catch {
      // Self-healing telemetry should never block PR creation.
    }

    res.json({
      success: true,
      generatedTest,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create a pull request from the generated patch.',
    });
  }
}

async function validateIssuePatch(req, res) {
  try {
    const settings = await getGitHubSettings(req.user.id);
    if (settings.code_insights_enabled === false) {
      return res.status(403).json({
        error: 'Enable Code Insights in GitHub Workspace before validating fixes.',
      });
    }

    const patch = String(req.body?.patch || '').trim();
    if (!patch) {
      return res.status(400).json({ error: 'patch is required.' });
    }

    const analysis = await resolveIssueCodeAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });
    const connection = await getGitHubConnection(req.user.id);
    if (!connection?.accessToken) {
      throw new Error('Connect GitHub before running validation.');
    }

    const generatedTest =
      req.body?.generatedTest ||
      (await generateRegressionTest({
        issue: analysis.issue,
        files: analysis.files,
        analysis,
        repository: analysis.repository,
        repoStructure: analysis.repositoryStructure || null,
      }).catch(() => null));

    const validationSummary = await validatePatchInSandbox({
      repository: {
        accessToken: connection.accessToken,
        owner: req.body?.repoOwner || analysis.repository.owner,
        name: req.body?.repoName || analysis.repository.name,
        defaultBranch: analysis.repository.defaultBranch || 'main',
      },
      patch,
      generatedTest,
    });

    return res.json({
      success: validationSummary.status === 'passed',
      generatedTest,
      validationSummary,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to validate patch in sandbox.',
    });
  }
}

async function recordPatchReviewOutcome(req, res) {
  try {
    const outcome = String(req.body?.outcome || '').trim().toLowerCase();
    if (!['accept', 'reject', 'edit'].includes(outcome)) {
      return res.status(400).json({
        error: 'outcome must be accept, reject, or edit.',
      });
    }

    const analysis = await resolveIssueCodeAnalysis(req.user.id, req.params.issueId, {
      repoOwner: req.body?.repoOwner,
      repoName: req.body?.repoName,
    });

    await recordAgentOutcome(req.user.id, {
      issueId: analysis.issue.id,
      issueType: normalizeIssueType(analysis.issue).slug,
      actionType: 'patch_review',
      confidence:
        req.body?.confidence == null
          ? analysis.patchConfidence == null
            ? null
            : Number(analysis.patchConfidence) / 100
          : Number(req.body.confidence),
      outcome,
      repoOwner: req.body?.repoOwner || analysis.repository.owner,
      repoName: req.body?.repoName || analysis.repository.name,
      metadata: {
        edited: Boolean(req.body?.edited),
        changedFileCount: analysis.changedFileCount || analysis.files.length,
        changedLineCount: analysis.changedLineCount || 0,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to record patch review outcome.',
    });
  }
}

module.exports = {
  analyzeAndFixGitHubRepo,
  analyzeLatestCode,
  analyzeIssueCode,
  getIssueGraph,
  analyzeIssueMultiFile,
  chatIssueCode,
  createPatchPullRequest,
  getGitHubStatus,
  getGitHubRepoStructure,
  githubOAuthCallback,
  listGitHubMappings,
  listGitHubRepos,
  loadRepositoryFile,
  removeRepoMapping,
  resolveIssueCodeAnalysis,
  saveRepoMapping,
  selectGitHubRepo,
  startGitHubOAuth,
  queryIssueGraph,
  updateGitHubWorkspaceSettings,
  validateIssuePatch,
  recordPatchReviewOutcome,
};
