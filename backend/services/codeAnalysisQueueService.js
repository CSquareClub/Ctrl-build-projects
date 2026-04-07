const crypto = require('crypto');
const { analyzeCodeRisk } = require('./codeRiskAnalyzerService');
const { generateCodeAutoFix } = require('./codeAutoFixService');

const CODE_ANALYSIS_JOB_NAME = 'code-analysis:run';

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code || '')).digest('hex').slice(0, 24);
}

function buildJobId(userId, code) {
  return `code-analysis:${userId}:${hashCode(code)}`;
}

function toImpact(issue) {
  const severity = String(issue?.severity || '').toLowerCase();
  const detail = String(issue?.detail || '').toLowerCase();
  if (severity === 'high' && /(crash|security|credential|data loss|auth)/.test(detail)) {
    return 'critical';
  }
  if (severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

function buildExplanation(analysis, patch) {
  if (patch?.explanation) {
    return patch.explanation;
  }

  const topIssue = analysis?.issues?.[0];
  if (!topIssue) {
    return {
      what: 'No critical issues were detected in this code sample.',
      why: 'The fast structural scan and AI reasoning did not find a meaningful risk pattern.',
      impact: 'The code looks comparatively safe based on the current rules and model pass.',
      fix: 'No patch was generated because there was nothing strong enough to remediate automatically.',
    };
  }

  return {
    what: topIssue.detail || topIssue.title,
    why: 'The AST rules and AI reasoning aligned on a pattern that deserves attention before deployment.',
    impact:
      toImpact(topIssue) === 'critical'
        ? 'This can create a production-breaking or high-safety issue.'
        : toImpact(topIssue) === 'high'
          ? 'This is likely to cause visible failures or unstable runtime behavior.'
          : toImpact(topIssue) === 'medium'
            ? 'This can create edge-case bugs or reliability issues.'
            : 'This is lower severity, but still worth addressing for code health.',
    fix:
      patch?.explanation?.fix ||
      'A minimal fix can be generated to reduce the risk while keeping the change set focused.',
  };
}

async function processCodeAnalysisJob(job) {
  const code = String(job.data?.code || '');
  const language = String(job.data?.language || '');
  const filePath = String(job.data?.filePath || '');
  if (!code.trim()) {
    throw new Error('code is required.');
  }

  const analysis = await analyzeCodeRisk({
    code,
    language,
    filePath,
  });
  const topIssue = analysis.issues?.[0] || null;
  let patch = null;

  if (topIssue) {
    try {
      patch = await generateCodeAutoFix({
        code,
        language,
        filePath,
        issue: {
          title: topIssue.title,
          severity: topIssue.severity,
          detail: topIssue.detail,
          startLine: topIssue.startLine,
          endLine: topIssue.endLine,
        },
      });
    } catch (error) {
      patch = null;
      analysis.meta = {
        ...(analysis.meta || {}),
        patch_fallback: true,
        patch_error: error instanceof Error ? error.message : 'Patch generation failed.',
      };
    }
  }

  return {
    ...analysis,
    patch,
    explanation: buildExplanation(analysis, patch),
    fixSummary: patch?.explanation?.fix || null,
    impact: topIssue ? toImpact(topIssue) : 'low',
    topIssue,
    completedAt: new Date().toISOString(),
  };
}

async function enqueueCodeAnalysis({ userId, code, source = 'manual', language = '', filePath = '' }) {
  const safeCode = String(code || '');
  const safeUserId = String(userId || '').trim();
  if (!safeUserId) {
    throw new Error('userId is required.');
  }
  if (!safeCode.trim()) {
    throw new Error('code is required.');
  }

  const jobId = buildJobId(safeUserId, safeCode);
  const result = await processCodeAnalysisJob({
    id: jobId,
    name: CODE_ANALYSIS_JOB_NAME,
    data: {
      userId: safeUserId,
      source,
      code: safeCode,
      language: String(language || ''),
      filePath: String(filePath || ''),
      codeHash: hashCode(safeCode),
      createdAt: new Date().toISOString(),
    },
  });

  return {
    jobId,
    status: 'completed',
    result,
    mode: 'inline',
  };
}

async function getCodeAnalysisJob(jobId, userId) {
  return {
    id: String(jobId || ''),
    status: 'not_found',
    result: null,
    error: 'Synchronous MVP mode does not persist code analysis jobs.',
    createdAt: null,
    processedAt: null,
    completedAt: null,
    userId: String(userId || ''),
  };
}

function startCodeAnalysisWorker() {
  return null;
}

module.exports = {
  enqueueCodeAnalysis,
  getCodeAnalysisJob,
  processCodeAnalysisJob,
  startCodeAnalysisWorker,
};
