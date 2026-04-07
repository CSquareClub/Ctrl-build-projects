const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { createPatch } = require('diff');

const execAsync = promisify(exec);
const FILE_KEYWORDS = ['form', 'submit', 'login', 'auth'];
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const MAX_FILE_SIZE = 200 * 1024;
const MAX_FILES_TO_SCAN = 2;

function getDefaultRepoPath() {
  if (process.env.LOCAL_GITHUB_REPO_PATH) {
    return path.resolve(process.env.LOCAL_GITHUB_REPO_PATH);
  }
  if (process.platform === 'win32') {
    return 'C:\\projects\\demo-repo';
  }
  return '/projects/demo-repo';
}

function resolveRepoPath(repoPath) {
  const candidate = String(repoPath || '').trim();
  if (candidate) {
    return path.resolve(candidate);
  }
  return getDefaultRepoPath();
}

function isRelevantFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return false;

  const normalized = filePath.toLowerCase();
  if (
    normalized.includes(`${path.sep}node_modules${path.sep}`) ||
    normalized.includes(`${path.sep}.git${path.sep}`) ||
    normalized.includes(`${path.sep}dist${path.sep}`) ||
    normalized.includes(`${path.sep}build${path.sep}`) ||
    normalized.includes('.test.') ||
    normalized.includes('.spec.')
  ) {
    return false;
  }

  return FILE_KEYWORDS.some((keyword) =>
    path.basename(filePath).toLowerCase().includes(keyword)
  );
}

function walkRelevantFiles(rootDir) {
  const results = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) {
          continue;
        }
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!isRelevantFile(fullPath)) continue;

      const stats = fs.statSync(fullPath);
      if (stats.size > MAX_FILE_SIZE) continue;
      results.push(fullPath);
    }
  }

  return results
    .sort((left, right) => {
      const leftBase = path.basename(left).toLowerCase();
      const rightBase = path.basename(right).toLowerCase();
      const leftScore = FILE_KEYWORDS.reduce(
        (score, keyword) => score + (leftBase.includes(keyword) ? 2 : 0),
        0
      );
      const rightScore = FILE_KEYWORDS.reduce(
        (score, keyword) => score + (rightBase.includes(keyword) ? 2 : 0),
        0
      );
      return rightScore - leftScore;
    })
    .slice(0, MAX_FILES_TO_SCAN);
}

function findSubmissionIssue(filePath, code) {
  const lines = String(code || '').replace(/\r/g, '').split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const callMatch =
      line.match(/\bsendToServer\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/) ||
      line.match(/\bsubmitForm\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/) ||
      line.match(/\bloginUser\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/) ||
      line.match(/\bauthenticate(?:User)?\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/);

    if (!callMatch) continue;

    const variableName = callMatch[1];
    const contextWindow = lines
      .slice(Math.max(0, index - 8), index + 1)
      .join('\n')
      .toLowerCase();

    const hasValidation =
      contextWindow.includes('validate') ||
      contextWindow.includes('required') ||
      contextWindow.includes(`if (!${variableName.toLowerCase()}`) ||
      contextWindow.includes(`object.values(${variableName.toLowerCase()})`) ||
      contextWindow.includes(`${variableName.toLowerCase()}.trim()`);

    if (hasValidation) continue;

    return {
      issue: 'Missing validation before form submission',
      filePath,
      lineIndex: index,
      startLine: index + 1,
      endLine: index + 1,
      variableName,
      callLine: line.trim(),
    };
  }

  return null;
}

function buildValidationGuard(indent, variableName) {
  return [
    `${indent}if (!${variableName} || Object.values(${variableName}).some((value) => value == null || value === "")) {`,
    `${indent}  return;`,
    `${indent}}`,
  ];
}

function applyDynamicFix(code, detection) {
  const lines = String(code || '').replace(/\r/g, '').split('\n');
  const targetLine = lines[detection.lineIndex] || '';
  const indent = (targetLine.match(/^(\s*)/) || ['',''])[1];
  const guardLines = buildValidationGuard(indent, detection.variableName);

  const updatedLines = [
    ...lines.slice(0, detection.lineIndex),
    ...guardLines,
    ...lines.slice(detection.lineIndex),
  ];

  return updatedLines.join('\n');
}

function evaluateFix(updatedCode, detection) {
  const normalized = String(updatedCode || '').replace(/\r/g, '');
  const validationToken = `Object.values(${detection.variableName}).some((value) => value == null || value === "")`;
  const callToken = detection.callLine;
  const validationIndex = normalized.indexOf(validationToken);
  const callIndex = normalized.indexOf(callToken);
  const passed = validationIndex >= 0 && callIndex >= 0 && validationIndex < callIndex;

  return {
    status: passed ? 'passed' : 'failed',
    passed,
    detail: passed
      ? `Validation logic was added before ${detection.callLine}.`
      : `Validation logic could not be verified before ${detection.callLine}.`,
  };
}

async function runGitSequence(repoDir, relativeFilePath, commitMessage) {
  const commands = [
    'git rev-parse --is-inside-work-tree',
    `git add -- "${relativeFilePath.replace(/"/g, '\\"')}"`,
    `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
    'git push origin main',
  ];

  const logs = [];

  for (const command of commands) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: repoDir,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      logs.push(`$ ${command}\n${[stdout, stderr].filter(Boolean).join('\n').trim()}`.trim());
    } catch (error) {
      const combined = [error.stdout, error.stderr, error.message]
        .filter(Boolean)
        .join('\n')
        .trim();

      if (command.startsWith('git commit') && /nothing to commit|no changes added/i.test(combined)) {
        logs.push(`$ ${command}\n${combined}`);
        return {
          success: false,
          logs: logs.join('\n\n'),
          error: 'Git commit failed because there were no staged changes to commit.',
        };
      }

      return {
        success: false,
        logs: `${logs.join('\n\n')}${logs.length ? '\n\n' : ''}$ ${command}\n${combined}`.trim(),
        error: `Git command failed: ${command}`,
      };
    }
  }

  return {
    success: true,
    logs: logs.join('\n\n'),
    error: null,
  };
}

async function analyzeAndFixLocalRepository(options = {}) {
  const repoDir = resolveRepoPath(options.repoPath);

  if (!fs.existsSync(repoDir)) {
    throw new Error(`Local repository not found at ${repoDir}. Set LOCAL_GITHUB_REPO_PATH or pass repoPath explicitly.`);
  }

  const candidateFiles = walkRelevantFiles(repoDir);
  if (candidateFiles.length === 0) {
    throw new Error('No relevant form/login/auth files were found in the local repository.');
  }

  for (const absoluteFilePath of candidateFiles) {
    const originalCode = fs.readFileSync(absoluteFilePath, 'utf8');
    const detection = findSubmissionIssue(absoluteFilePath, originalCode);
    if (!detection) {
      continue;
    }

    const fixedCode = applyDynamicFix(originalCode, detection);
    const testResult = evaluateFix(fixedCode, detection);
    const relativeFilePath = path.relative(repoDir, absoluteFilePath).replace(/\\/g, '/');
    const diff = createPatch(relativeFilePath, originalCode, fixedCode, 'original', 'fixed');
    const commitMessage = 'fix: add validation to form submission';

    fs.writeFileSync(absoluteFilePath, fixedCode, 'utf8');

    const gitResult = await runGitSequence(repoDir, relativeFilePath, commitMessage);
    if (!gitResult.success) {
      return {
        file: relativeFilePath,
        issue: detection.issue,
        originalCode,
        fixedCode,
        diff,
        testResult,
        commitMessage,
        gitLogs: gitResult.logs,
        error: gitResult.error,
      };
    }

    return {
      file: relativeFilePath,
      issue: detection.issue,
      originalCode,
      fixedCode,
      diff,
      testResult,
      commitMessage,
      gitLogs: gitResult.logs,
      error: null,
    };
  }

  throw new Error('No real validation issue was detected in the scanned repository files.');
}

module.exports = {
  analyzeAndFixLocalRepository,
};
