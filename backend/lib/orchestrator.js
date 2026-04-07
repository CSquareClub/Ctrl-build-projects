const { analyzeCode, generateFix } = require('./services/code');
const { generateTests, runTests } = require('./services/test');
const { runSelfHeal } = require('./services/selfHeal');

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
      why: 'The structural scan and AI reasoning did not find a strong risk pattern.',
      impact: 'The code looks comparatively safe based on the current checks.',
      fix: 'No patch was generated because there was nothing strong enough to remediate automatically.',
    };
  }

  return {
    what: topIssue.detail || topIssue.title,
    why: 'The AST scan and AI reasoning aligned on a pattern worth fixing before deployment.',
    impact:
      toImpact(topIssue) === 'critical'
        ? 'This can create a production-breaking or safety-sensitive issue.'
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

async function runFullPipeline(input) {
  const logs = [];

  try {
    logs.push('Analyzing code...');
    const analysis = await analyzeCode(input);
    const topIssue = analysis?.issues?.[0] || null;

    let patch = null;
    if (topIssue) {
      try {
        logs.push('Generating fix...');
        patch = await generateFix({
          code: input.code,
          language: input.language,
          filePath: input.filePath,
          issue: {
            title: topIssue.title,
            severity: topIssue.severity,
            detail: topIssue.detail,
            startLine: topIssue.startLine,
            endLine: topIssue.endLine,
          },
        });
      } catch (error) {
        logs.push(`Fix generation fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    let generatedTests = null;
    let testResult = null;
    if (patch?.updated || input.code) {
      try {
        logs.push('Generating tests...');
        generatedTests = await generateTests({
          code: patch?.updated || input.code,
          language: input.language,
          issue: topIssue,
          analysis,
        });
        logs.push('Running tests...');
        testResult = await runTests({
          code: patch?.updated || input.code,
          testCode: generatedTests.testCode,
          language: input.language,
        });
      } catch (error) {
        logs.push(`Test pipeline fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    let selfHeal = null;
    if (testResult?.failed > 0) {
      try {
        logs.push('Running self-heal retry...');
        selfHeal = await runSelfHeal({
          userId: input.userId,
          code: patch?.updated || input.code,
          testCode: generatedTests?.testCode || '',
          language: input.language,
          issue: topIssue,
        });
      } catch (error) {
        logs.push(`Self-heal fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    const finalFix = selfHeal?.finalFix || patch || null;
    const finalTestResult = selfHeal?.finalTestResult || testResult || null;
    const finalAnalysis = selfHeal?.analysis || analysis;

    return {
      ...finalAnalysis,
      patch: finalFix,
      explanation: buildExplanation(finalAnalysis, finalFix),
      fixSummary: finalFix?.explanation?.fix || null,
      impact: topIssue ? toImpact(topIssue) : 'low',
      topIssue,
      testResult: finalTestResult,
      generatedTests,
      selfHeal,
      logs: logs.join('\n'),
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      risk_score: 0,
      confidence: 0,
      issues: [],
      suggestions: [],
      meta: {
        parser: 'synchronous-mvp',
        parse_mode: 'fallback',
        ast_issue_count: 0,
        llm_issue_count: 0,
        llm_fallback: true,
        llm_timed_out: false,
        complexity_signals: 0,
      },
      patch: null,
      explanation: {
        what: 'The analysis pipeline could not complete normally.',
        why: error instanceof Error ? error.message : 'Unknown pipeline error.',
        impact: 'The system returned a safe fallback response instead of crashing.',
        fix: 'Retry with a smaller code sample or simpler repository target.',
      },
      fixSummary: null,
      impact: 'low',
      topIssue: null,
      testResult: null,
      generatedTests: null,
      selfHeal: null,
      logs: logs.concat(error instanceof Error ? error.message : 'Unknown error').join('\n'),
      completedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  runFullPipeline,
};
