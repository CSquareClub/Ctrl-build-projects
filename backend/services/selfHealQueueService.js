const crypto = require('crypto');
const { groqJsonRequest } = require('../lib/groqFeedbackClassifier');
const { analyzeCodeRisk } = require('./codeRiskAnalyzerService');
const { generateCodeAutoFix } = require('./codeAutoFixService');
const { generateCodeTests, runGeneratedTests } = require('./codeTestService');

const SELF_HEAL_JOB_NAME = 'self-heal:run';
const SELF_HEAL_MAX_ATTEMPTS = 2;
const SELF_HEAL_TIMEOUT_MS = 5000;

function hashPayload(code, testCode) {
  return crypto
    .createHash('sha256')
    .update(`${String(code || '')}\n${String(testCode || '')}`)
    .digest('hex')
    .slice(0, 24);
}

function buildJobId(userId, code, testCode) {
  return `self-heal:${userId}:${hashPayload(code, testCode)}`;
}

async function refineIssueFromFailure({ issue, logs, code, attempt }) {
  const fallback = {
    title: issue?.title || 'Refine failing patch',
    severity: issue?.severity || 'high',
    detail: `The previous fix still failed tests on attempt ${attempt}. Use the failure logs to adjust the fix safely.\n${String(logs || '').slice(0, 1200)}`,
    startLine: issue?.startLine || null,
    endLine: issue?.endLine || null,
  };

  if (!process.env.GROQ_API_KEY) {
    return fallback;
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Self-heal refinement timed out.')), SELF_HEAL_TIMEOUT_MS)
  );

  try {
    const parsed = await Promise.race([
      groqJsonRequest([
        {
          role: 'system',
          content: [
            'You refine code-fix targets after failed tests.',
            'Return strict JSON with keys: title, severity, detail, startLine, endLine.',
            'Keep the detail concise and focused on what the next fix should correct.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            previousIssue: issue,
            testLogs: String(logs || '').slice(0, 3000),
            code: String(code || '').slice(0, 8000),
            attempt,
          }),
        },
      ]),
      timeoutPromise,
    ]);

    return {
      title: String(parsed?.title || fallback.title).trim() || fallback.title,
      severity: String(parsed?.severity || fallback.severity).trim() || fallback.severity,
      detail: String(parsed?.detail || fallback.detail).trim() || fallback.detail,
      startLine: Number(parsed?.startLine || fallback.startLine) || fallback.startLine,
      endLine: Number(parsed?.endLine || fallback.endLine) || fallback.endLine,
    };
  } catch {
    return fallback;
  }
}

async function processSelfHealJob(job) {
  const code = String(job.data?.code || '');
  const language = String(job.data?.language || 'javascript');
  if (!code.trim()) {
    throw new Error('code is required.');
  }

  let currentCode = code;
  let analysis = await analyzeCodeRisk({
    code: currentCode,
    language,
  });
  let issue =
    job.data?.issue ||
    (analysis.issues?.[0]
      ? {
          title: analysis.issues[0].title,
          severity: analysis.issues[0].severity,
          detail: analysis.issues[0].detail,
          startLine: analysis.issues[0].startLine,
          endLine: analysis.issues[0].endLine,
        }
      : null);
  let generatedTests =
    job.data?.testCode && String(job.data.testCode).trim()
      ? {
          testCode: String(job.data.testCode),
          summary: 'Using existing generated tests.',
          framework: 'jest-style',
          source: 'existing',
        }
      : await generateCodeTests({
          code: currentCode,
          issue,
          analysis,
          language,
        });

  const attempts = [];
  const combinedLogs = [];
  let finalFix = null;
  let finalTestResult = null;
  let success = false;

  await job.updateProgress({
    phase: 'starting',
    message: 'Preparing self-healing loop...',
    attempts,
  }).catch(() => null);

  for (let attempt = 1; attempt <= SELF_HEAL_MAX_ATTEMPTS; attempt += 1) {
    await job.updateProgress({
      phase: 'generating_fix',
      message: `Attempt ${attempt}: generating fix...`,
      attempt,
      attempts,
    }).catch(() => null);

    const fix = await generateCodeAutoFix({
      code: currentCode,
      language,
      issue,
    });

    await job.updateProgress({
      phase: 'running_tests',
      message: `Attempt ${attempt}: running tests...`,
      attempt,
      attempts,
    }).catch(() => null);

    const testResult = await runGeneratedTests({
      code: fix.updated,
      testCode: generatedTests.testCode,
      language,
    });

    const entry = {
      attempt,
      status: testResult.failed > 0 ? 'failed' : 'passed',
      summary:
        testResult.failed > 0
          ? `Attempt ${attempt} failed with ${testResult.failed} failing test(s).`
          : `Attempt ${attempt} passed all generated tests.`,
      passed: testResult.passed,
      failed: testResult.failed,
      logs: testResult.logs,
      confidence: fix.confidence,
      fixSummary: fix.explanation?.fix || null,
    };
    attempts.push(entry);
    combinedLogs.push(`Attempt ${attempt}\n${testResult.logs}`);
    finalFix = fix;
    finalTestResult = testResult;
    currentCode = fix.updated;

    if (testResult.failed === 0) {
      success = true;
      analysis = await analyzeCodeRisk({
        code: currentCode,
        language,
      });
      break;
    }

    await job.updateProgress({
      phase: 'refining_fix',
      message: `Attempt ${attempt}: analyzing failure...`,
      attempt,
      attempts,
    }).catch(() => null);

    issue = await refineIssueFromFailure({
      issue,
      logs: testResult.logs,
      code: currentCode,
      attempt,
    });
    analysis = await analyzeCodeRisk({
      code: currentCode,
      language,
    });
  }

  await job.updateProgress({
    phase: success ? 'completed' : 'failed',
    message: success ? 'Self-healing completed.' : 'Self-healing exhausted all attempts.',
    attempts,
  }).catch(() => null);

  return {
    success,
    attempts,
    finalFix,
    logs: combinedLogs.join('\n\n'),
    analysis,
    generatedTests,
    finalTestResult,
    completedAt: new Date().toISOString(),
  };
}

async function enqueueSelfHeal({ userId, code, testCode = '', language = 'javascript', issue = null }) {
  const safeUserId = String(userId || '').trim();
  const safeCode = String(code || '');
  if (!safeUserId) throw new Error('userId is required.');
  if (!safeCode.trim()) throw new Error('code is required.');

  const jobId = buildJobId(safeUserId, safeCode, testCode);
  const progress = {};
  const result = await processSelfHealJob({
    id: jobId,
    name: SELF_HEAL_JOB_NAME,
    data: {
      userId: safeUserId,
      code: safeCode,
      testCode: String(testCode || ''),
      language,
      issue,
      createdAt: new Date().toISOString(),
    },
    updateProgress: async (nextProgress) => {
      Object.assign(progress, nextProgress || {});
    },
  });

  return {
    jobId,
    status: 'completed',
    progress,
    result,
    mode: 'inline',
  };
}

async function getSelfHealJob(jobId, userId) {
  return {
    id: String(jobId || ''),
    status: 'not_found',
    progress: null,
    result: null,
    error: 'Synchronous MVP mode does not persist self-heal jobs.',
    createdAt: null,
    processedAt: null,
    completedAt: null,
    userId: String(userId || ''),
  };
}

function startSelfHealWorker() {
  return null;
}

module.exports = {
  enqueueSelfHeal,
  getSelfHealJob,
  processSelfHealJob,
  startSelfHealWorker,
};
