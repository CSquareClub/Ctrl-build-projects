const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const { groqJsonRequest } = require('../lib/groqFeedbackClassifier');
const { fetchRepositoryFile } = require('./codeSearchService');
const { runRepositoryChecksInSandbox } = require('./validationService');

const execAsync = promisify(exec);
const TEST_TIMEOUT_MS = 12000;
const GROQ_TIMEOUT_MS = 5000;

function sanitizeCode(code) {
  return String(code || '').trim();
}

function inferExtension(language) {
  return /typescript/i.test(String(language || '')) ? 'ts' : 'js';
}

function extractFunctionNames(code) {
  const names = new Set();
  const patterns = [
    /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
    /let\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
    /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(code))) {
      names.add(match[1]);
    }
  });

  return [...names].slice(0, 6);
}

function ensureExports(code) {
  const functionNames = extractFunctionNames(code);
  if (!functionNames.length) {
    return `${code}\n\nmodule.exports = {};`;
  }

  if (/module\.exports\s*=|export\s+default|export\s+\{/.test(code)) {
    return code;
  }

  return `${code}\n\nmodule.exports = { ${functionNames.join(', ')} };`;
}

function buildFallbackTests({ code, issue }) {
  const functionNames = extractFunctionNames(code);
  const primaryName = functionNames[0];

  if (primaryName) {
    return {
      framework: 'jest-style',
      summary: 'Generated a basic regression guard around the primary exported function.',
      testCode: `const { ${primaryName} } = require("./subject");\n\ndescribe("Generated regression tests", () => {\n  test("exports the primary function", () => {\n    expect(typeof ${primaryName}).toBe("function");\n  });\n\n  test("calling the function does not throw synchronously", () => {\n    expect(() => ${primaryName}()).not.toThrow();\n  });\n});`,
    };
  }

  return {
    framework: 'jest-style',
    summary: issue?.title
      ? `Generated a smoke test scaffold for ${issue.title}.`
      : 'Generated a smoke test scaffold for the supplied code.',
    testCode: `const subject = require("./subject");\n\ndescribe("Generated regression tests", () => {\n  test("module loads without crashing", () => {\n    expect(subject).toBeDefined();\n  });\n});`,
  };
}

async function generateCodeTests({ code, issue = null, analysis = null, language = 'javascript' }) {
  const safeCode = sanitizeCode(code);
  if (!safeCode) {
    throw new Error('code is required.');
  }

  if (!process.env.GROQ_API_KEY) {
    return {
      ...buildFallbackTests({ code: safeCode, issue }),
      source: 'fallback',
    };
  }

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Test generation timed out.')), GROQ_TIMEOUT_MS)
  );

  try {
    const parsed = await Promise.race([
      groqJsonRequest([
        {
          role: 'system',
          content: [
            'You generate compact Jest-style regression tests for JavaScript or TypeScript code.',
            'Return strict JSON only with keys: testCode, summary, framework.',
            'The tests must import from ./subject.',
            'Use only these matchers: toBe, toEqual, toBeDefined, toBeTruthy, toContain, toThrow.',
            'Keep the test file under 140 lines and focused on the highest-risk behavior.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            language,
            code: safeCode.slice(0, 14000),
            issue,
            topIssue: analysis?.topIssue || null,
            suggestions: analysis?.suggestions?.slice(0, 4) || [],
          }),
        },
      ]),
      timeoutPromise,
    ]);

    const testCode = String(parsed?.testCode || '').trim();
    if (!testCode) {
      return {
        ...buildFallbackTests({ code: safeCode, issue }),
        source: 'fallback',
      };
    }

    return {
      testCode,
      summary:
        String(parsed?.summary || '').trim() ||
        'Generated a focused regression test for the most important risk path.',
      framework: String(parsed?.framework || 'jest-style').trim() || 'jest-style',
      source: 'groq',
    };
  } catch {
    return {
      ...buildFallbackTests({ code: safeCode, issue }),
      source: 'fallback',
    };
  }
}

function buildRepositoryCheckCommands(packageJson = {}) {
  const scripts = packageJson?.scripts || {};
  const commands = [];

  if (scripts.lint) commands.push('npm run lint');
  if (scripts['test:ci']) {
    commands.push('npm run test:ci');
  } else if (scripts.test) {
    commands.push('npm run test');
  }
  if (scripts.build) commands.push('npm run build');

  return commands;
}

async function generateRepositoryChecksPlan({ accessToken, repoOwner, repoName, ref }) {
  let packageJson = null;

  try {
    const packageFile = await fetchRepositoryFile(
      accessToken,
      repoOwner,
      repoName,
      'package.json',
      ref
    );
    packageJson = JSON.parse(packageFile.content);
  } catch {
    packageJson = null;
  }

  const commands = buildRepositoryCheckCommands(packageJson || {});
  const summary = commands.length
    ? `Repository checks will run ${commands.join(', ')} against the current repo context.`
    : 'Repository checks will inspect the project context, but no lint, test, or build scripts were detected in package.json.';

  return {
    framework: 'repository-checks',
    summary,
    testCode: commands.length
      ? commands.join('\n')
      : '# No lint, test, or build scripts were detected in package.json',
    source: 'repo-checks',
  };
}

function buildHarnessCode(testFileName) {
  return `const path = require("path");\nconst { isDeepStrictEqual } = require("util");\nconst tests = [];\nlet currentSuite = [];\n\nfunction format(value) {\n  try { return JSON.stringify(value); } catch { return String(value); }\n}\n\nfunction makeExpect(actual, negate = false) {\n  const wrap = (pass, message) => {\n    const finalPass = negate ? !pass : pass;\n    if (!finalPass) {\n      throw new Error(message);\n    }\n  };\n\n  const api = {\n    toBe(expected) {\n      wrap(Object.is(actual, expected), \`Expected \${format(actual)} \${negate ? 'not ' : ''}toBe \${format(expected)}\`);\n    },\n    toEqual(expected) {\n      wrap(isDeepStrictEqual(actual, expected), \`Expected \${format(actual)} \${negate ? 'not ' : ''}toEqual \${format(expected)}\`);\n    },\n    toBeDefined() {\n      wrap(actual !== undefined, \`Expected value \${negate ? 'not ' : ''}to be defined\`);\n    },\n    toBeTruthy() {\n      wrap(Boolean(actual), \`Expected value \${negate ? 'not ' : ''}to be truthy\`);\n    },\n    toContain(expected) {\n      wrap(actual != null && actual.includes && actual.includes(expected), \`Expected value \${negate ? 'not ' : ''}to contain \${format(expected)}\`);\n    },\n    toThrow() {\n      let threw = false;\n      try { actual(); } catch { threw = true; }\n      wrap(threw, \`Expected function \${negate ? 'not ' : ''}to throw\`);\n    },\n  };\n\n  Object.defineProperty(api, "not", {\n    get() {\n      return makeExpect(actual, !negate);\n    },\n  });\n\n  return api;\n}\n\nglobal.describe = (name, fn) => {\n  currentSuite.push(name);\n  try { fn(); } finally { currentSuite.pop(); }\n};\n\nglobal.test = global.it = (name, fn) => {\n  tests.push({ name: [...currentSuite, name].join(" > "), fn });\n};\n\nglobal.expect = (actual) => makeExpect(actual, false);\n\n(async () => {\n  require(path.join(process.cwd(), "${testFileName}"));\n  let passed = 0;\n  let failed = 0;\n  const failures = [];\n\n  for (const entry of tests) {\n    try {\n      await entry.fn();\n      passed += 1;\n      console.log("PASS", entry.name);\n    } catch (error) {\n      failed += 1;\n      const message = error instanceof Error ? error.message : String(error);\n      failures.push({ name: entry.name, message });\n      console.error("FAIL", entry.name, "-", message);\n    }\n  }\n\n  console.log("\\nRESULT_SUMMARY", JSON.stringify({ passed, failed, total: tests.length, failures }));\n  process.exit(failed > 0 ? 1 : 0);\n})().catch((error) => {\n  console.error("FATAL", error instanceof Error ? error.stack || error.message : String(error));\n  console.log("\\nRESULT_SUMMARY", JSON.stringify({ passed: 0, failed: 1, total: 1, failures: [{ name: "runtime", message: error instanceof Error ? error.message : String(error) }] }));\n  process.exit(1);\n});\n`;
}

function parseResultSummary(logs) {
  const match = String(logs || '').match(/RESULT_SUMMARY\s+({[\s\S]+})/);
  if (!match) {
    return {
      passed: 0,
      failed: 1,
      total: 1,
      failures: [{ name: 'runner', message: 'Unable to parse test results.' }],
    };
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return {
      passed: 0,
      failed: 1,
      total: 1,
      failures: [{ name: 'runner', message: 'Unable to parse test results.' }],
    };
  }
}

async function runGeneratedTests({ code, testCode, language = 'javascript' }) {
  const safeCode = sanitizeCode(code);
  const safeTests = sanitizeCode(testCode);
  if (!safeCode) {
    throw new Error('code is required.');
  }
  if (!safeTests) {
    throw new Error('testCode is required.');
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agenticpulse-tests-'));
  const extension = inferExtension(language);
  const subjectFile = `subject.${extension}`;
  const testFile = `generated.test.${extension}`;
  const runnerFile = 'runner.cjs';

  try {
    await fs.writeFile(path.join(tempRoot, subjectFile), ensureExports(safeCode), 'utf8');
    await fs.writeFile(path.join(tempRoot, testFile), safeTests, 'utf8');
    await fs.writeFile(path.join(tempRoot, runnerFile), buildHarnessCode(testFile), 'utf8');

    const { stdout, stderr } = await execAsync(`node ${runnerFile}`, {
      cwd: tempRoot,
      timeout: TEST_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    }).catch((error) => ({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      code: error.code || 1,
    }));

    const logs = [stdout, stderr].filter(Boolean).join('\n').trim();
    const summary = parseResultSummary(logs);
    return {
      status: summary.failed > 0 ? 'failed' : 'passed',
      passed: Number(summary.passed || 0),
      failed: Number(summary.failed || 0),
      total: Number(summary.total || 0),
      failures: Array.isArray(summary.failures) ? summary.failures : [],
      logs,
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}

async function runRepositoryChecks({
  repository,
  repoPath = null,
  code = '',
}) {
  const validation = await runRepositoryChecksInSandbox({
    repository,
    fileOverride:
      repoPath && String(code || '').trim()
        ? {
            path: repoPath,
            content: String(code),
          }
        : null,
  });

  const checks = Array.isArray(validation.checks) ? validation.checks : [];
  const failures = checks
    .filter((check) => check.status !== 'passed')
    .map((check) => ({
      name: check.type,
      message: check.logs || `${check.type} failed.`,
    }));

  return {
    status: validation.status === 'passed' ? 'passed' : 'failed',
    passed: checks.filter((check) => check.status === 'passed').length,
    failed:
      validation.status === 'inconclusive'
        ? Math.max(1, failures.length)
        : failures.length,
    total: checks.length || 1,
    failures:
      failures.length > 0
        ? failures
        : validation.status === 'inconclusive'
          ? [{ name: 'repository-checks', message: validation.summary }]
          : [],
    logs: [
      validation.summary,
      validation.installLog || '',
      ...checks.map((check) => `> ${check.command}\n${check.logs || '(no output)'}`),
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim(),
  };
}

module.exports = {
  generateCodeTests,
  generateRepositoryChecksPlan,
  runRepositoryChecks,
  runGeneratedTests,
};
