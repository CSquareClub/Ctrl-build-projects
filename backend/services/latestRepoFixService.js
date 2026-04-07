const path = require('path');
const { createPatch } = require('diff');
const {
  getSelectedRepository,
  getRepositoryTree,
  githubRequest,
} = require('./githubService');
const { fetchRepositoryFile } = require('./codeSearchService');

const KEYWORDS = ['login', 'form', 'submit', 'auth', 'signin'];
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const MAX_FILE_SIZE = 150000;
const MAX_CANDIDATES = 2;

function buildStep(label, status, detail, extra = {}) {
  return {
    label,
    status,
    detail,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

function isCandidatePath(filePath) {
  const extension = path.extname(filePath || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return false;
  const normalized = String(filePath || '').toLowerCase();
  if (
    normalized.includes('/node_modules/') ||
    normalized.includes('/dist/') ||
    normalized.includes('/build/') ||
    normalized.includes('/coverage/') ||
    normalized.includes('.test.') ||
    normalized.includes('.spec.')
  ) {
    return false;
  }
  return true;
}

function scoreCandidatePath(filePath) {
  const normalized = String(filePath || '').toLowerCase();
  let score = 0;

  for (const keyword of KEYWORDS) {
    if (normalized.includes(keyword)) {
      score += normalized.endsWith(`${keyword}.tsx`) || normalized.endsWith(`${keyword}.ts`) || normalized.endsWith(`${keyword}.jsx`) || normalized.endsWith(`${keyword}.js`) ? 8 : 4;
    }
  }

  if (normalized.includes('/components/')) score += 2;
  if (normalized.includes('/pages/') || normalized.includes('/app/')) score += 2;
  if (normalized.includes('login') || normalized.includes('signin')) score += 5;
  if (normalized.includes('form')) score += 4;

  return score;
}

function sanitizeVariableName(raw) {
  const value = String(raw || '')
    .trim()
    .replace(/[);,\s]+$/g, '');
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : null;
}

function findSubmissionCandidate(lines, startIndex = 0) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];
    const directMatch = line.match(
      /\b(?:sendToServer|submitForm|submitLogin|loginUser|authenticateUser)\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/
    );
    if (directMatch) {
      return {
        lineIndex: index,
        variableName: directMatch[1],
        callLine: line.trim(),
      };
    }

    const clientMatch = line.match(
      /\b(?:axios|apiClient|api)\.(?:post|put|patch)\s*\([^,]+,\s*([A-Za-z_$][A-Za-z0-9_$]*)/
    );
    if (clientMatch) {
      return {
        lineIndex: index,
        variableName: clientMatch[1],
        callLine: line.trim(),
      };
    }

    if (/\bfetch\s*\(/.test(line)) {
      for (let offset = 0; offset < 6 && index + offset < lines.length; offset += 1) {
        const nestedLine = lines[index + offset];
        const bodyMatch = nestedLine.match(
          /JSON\.stringify\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/
        );
        if (bodyMatch) {
          return {
            lineIndex: index,
            variableName: bodyMatch[1],
            callLine: lines.slice(index, index + offset + 1).join(' ').trim(),
          };
        }
      }
    }
  }

  return null;
}

function hasValidationGuard(lines, lineIndex, variableName) {
  const lowerWindow = lines
    .slice(Math.max(0, lineIndex - 8), lineIndex)
    .join('\n')
    .toLowerCase();
  const normalizedVariable = variableName.toLowerCase();
  return (
    lowerWindow.includes('validate') ||
    lowerWindow.includes('required') ||
    lowerWindow.includes(`object.values(${normalizedVariable})`) ||
    lowerWindow.includes(`if (!${normalizedVariable}`) ||
    lowerWindow.includes(`${normalizedVariable}.trim()`) ||
    lowerWindow.includes(`${normalizedVariable}.length`) ||
    lowerWindow.includes('schema.parse') ||
    lowerWindow.includes('zod')
  );
}

function detectValidationIssue(filePath, content) {
  const normalizedPath = String(filePath || '').toLowerCase();
  const normalizedContent = String(content || '').toLowerCase();
  if (!KEYWORDS.some((keyword) => normalizedPath.includes(keyword) || normalizedContent.includes(keyword))) {
    return null;
  }

  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const candidate = findSubmissionCandidate(lines);
  if (!candidate) return null;

  const variableName = sanitizeVariableName(candidate.variableName);
  if (!variableName) return null;
  if (hasValidationGuard(lines, candidate.lineIndex, variableName)) return null;

  return {
    type: 'missing_form_validation',
    title: 'Missing form validation',
    detail: `${path.basename(filePath)} submits ${variableName} without a guard that checks for empty or missing fields first.`,
    filePath,
    variableName,
    lineIndex: candidate.lineIndex,
    callLine: candidate.callLine,
    startLine: candidate.lineIndex + 1,
    endLine: candidate.lineIndex + 1,
    severity: 'high',
  };
}

function buildValidationGuard(indent, variableName) {
  return [
    `${indent}if (!${variableName} || Object.values(${variableName}).some((value) => value == null || value === "")) {`,
    `${indent}  return;`,
    `${indent}}`,
  ];
}

function applyValidationFix(content, issue) {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const targetLine = lines[issue.lineIndex] || '';
  const indentMatch = targetLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';
  const guardLines = buildValidationGuard(indent, issue.variableName);

  const updatedLines = [
    ...lines.slice(0, issue.lineIndex),
    ...guardLines,
    ...lines.slice(issue.lineIndex),
  ];

  return {
    updated: updatedLines.join('\n'),
    insertedGuard: guardLines.join('\n'),
  };
}

function runDeterministicValidationTest(updatedCode, issue) {
  const normalized = String(updatedCode || '').replace(/\r/g, '');
  const guardPresent = normalized.includes(`Object.values(${issue.variableName}).some(`);
  const callStillPresent = normalized.includes(issue.callLine.replace(/\s+/g, ' ').trim());
  const guardBeforeCall =
    normalized.indexOf(`Object.values(${issue.variableName}).some(`) <
    normalized.indexOf(issue.callLine.replace(/\s+/g, ' ').trim());

  const passed = guardPresent && callStillPresent && guardBeforeCall;
  return {
    passed,
    status: passed ? 'passed' : 'failed',
    detail: passed
      ? `Validation guard now checks ${issue.variableName} before submission.`
      : `Could not verify a validation guard ahead of the submission call for ${issue.variableName}.`,
  };
}

function buildCommitMessage(issue) {
  return `fix: add validation guard to ${path.basename(issue.filePath)}`;
}

async function createCommitOnBranch(repository, file, updatedContent, message) {
  const branchName = `codex/agenticpulse-fix-${Date.now()}`;

  const baseRef = await githubRequest(
    repository.connection.accessToken,
    `/repos/${repository.owner}/${repository.name}/git/ref/heads/${encodeURIComponent(
      repository.defaultBranch
    )}`
  );
  const baseSha = baseRef?.object?.sha;

  if (!baseSha) {
    throw new Error(`Could not resolve ${repository.defaultBranch} for commit creation.`);
  }

  await githubRequest(
    repository.connection.accessToken,
    `/repos/${repository.owner}/${repository.name}/git/refs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    }
  );

  const updateResult = await githubRequest(
    repository.connection.accessToken,
    `/repos/${repository.owner}/${repository.name}/contents/${encodeURIComponent(file.path).replace(/%2F/g, '/')}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(updatedContent, 'utf8').toString('base64'),
        sha: file.sha,
        branch: branchName,
      }),
    }
  );

  return {
    branchName,
    commitSha: updateResult?.commit?.sha || null,
    commitUrl: updateResult?.commit?.html_url || null,
  };
}

async function analyzeLatestRepositoryCode(userId) {
  const steps = [];
  steps.push(buildStep('Fetching repository...', 'running', 'Loading the selected GitHub repository.'));

  const repository = await getSelectedRepository(userId);
  const tree = await getRepositoryTree(
    repository.connection.accessToken,
    repository.owner,
    repository.name,
    repository.defaultBranch
  );

  const candidatePaths = tree
    .filter((entry) => entry && entry.path && entry.size <= MAX_FILE_SIZE && isCandidatePath(entry.path))
    .sort((left, right) => scoreCandidatePath(right.path) - scoreCandidatePath(left.path))
    .slice(0, 20)
    .map((entry) => entry.path)
    .filter(Boolean);

  steps[steps.length - 1] = buildStep(
    'Fetching repository...',
    'completed',
    `Loaded ${repository.owner}/${repository.name} (${repository.defaultBranch}).`
  );
  steps.push(
    buildStep(
      'Scanning files...',
      'running',
      candidatePaths.length > 0
        ? `Scanning the highest-signal ${Math.min(candidatePaths.length, MAX_CANDIDATES)} file candidates.`
        : 'No candidate files matched the current rules.'
    )
  );

  const inspectedFiles = [];
  for (const candidatePath of candidatePaths.slice(0, Math.max(6, MAX_CANDIDATES * 3))) {
    const file = await fetchRepositoryFile(
      repository.connection.accessToken,
      repository.owner,
      repository.name,
      candidatePath,
      repository.defaultBranch
    );

    inspectedFiles.push(file.path);
    const issue = detectValidationIssue(file.path, file.content);
    if (!issue) {
      if (inspectedFiles.length >= MAX_CANDIDATES) {
        break;
      }
      continue;
    }

    steps[steps.length - 1] = buildStep(
      'Scanning files...',
      'completed',
      `Issue detected in ${file.path}.`,
      { file: file.path }
    );
    steps.push(
      buildStep(
        `Issue detected in ${path.basename(file.path)}`,
        'completed',
        issue.detail,
        { file: file.path }
      )
    );
    steps.push(
      buildStep(
        'Generating fix...',
        'running',
        `Adding a validation guard before the submission flow for ${issue.variableName}.`,
        { file: file.path }
      )
    );

    const fix = applyValidationFix(file.content, issue);
    const diff = createPatch(file.path, file.content, fix.updated, 'original', 'fixed');

    steps[steps.length - 1] = buildStep(
      'Generating fix...',
      'completed',
      `Generated a minimal guard in ${file.path}.`,
      { file: file.path }
    );
    steps.push(
      buildStep(
        'Running tests...',
        'running',
        `Checking that the new validation guard exists ahead of the submission call.`,
        { file: file.path }
      )
    );

    const testResult = runDeterministicValidationTest(fix.updated, issue);
    steps[steps.length - 1] = buildStep(
      'Running tests...',
      testResult.passed ? 'completed' : 'failed',
      testResult.detail,
      { file: file.path }
    );

    if (!testResult.passed) {
      return {
        success: false,
        repository: {
          owner: repository.owner,
          name: repository.name,
          defaultBranch: repository.defaultBranch,
        },
        file: file.path,
        issue: issue.title,
        originalCode: file.content,
        fixedCode: fix.updated,
        diff,
        testResult,
        commitMessage: buildCommitMessage(issue),
        commit: null,
        steps,
      };
    }

    steps.push(
      buildStep(
        'Commit created',
        'running',
        `Creating a branch commit for ${file.path}.`,
        { file: file.path }
      )
    );

    const commitMessage = buildCommitMessage(issue);
    const commit = await createCommitOnBranch(repository, file, fix.updated, commitMessage);
    steps[steps.length - 1] = buildStep(
      'Commit created',
      'completed',
      `Committed the fix on ${commit.branchName}.`,
      { file: file.path, branchName: commit.branchName, commitSha: commit.commitSha }
    );

    return {
      success: true,
      repository: {
        owner: repository.owner,
        name: repository.name,
        defaultBranch: repository.defaultBranch,
      },
      file: file.path,
      issue: issue.title,
      originalCode: file.content,
      fixedCode: fix.updated,
      diff,
      testResult,
      commitMessage,
      commit,
      steps,
    };
  }

  steps[steps.length - 1] = buildStep(
    'Scanning files...',
    'completed',
    inspectedFiles.length > 0
      ? `Scanned ${inspectedFiles.length} candidate files but found no deterministic validation issue.`
      : 'No candidate files were available to scan.'
  );

  return {
    success: false,
    repository: {
      owner: repository.owner,
      name: repository.name,
      defaultBranch: repository.defaultBranch,
    },
    file: null,
    issue: null,
    originalCode: null,
    fixedCode: null,
    diff: '',
    testResult: {
      passed: false,
      status: 'skipped',
      detail: 'No deterministic issue matched the current latest-code rules.',
    },
    commitMessage: null,
    commit: null,
    steps,
  };
}

module.exports = {
  analyzeLatestRepositoryCode,
};
