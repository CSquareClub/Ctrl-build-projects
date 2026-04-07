const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { parseUnifiedDiff, applyPatchToContent } = require('./prService');

const DEFAULT_TIMEOUT_MS = 1000 * 60 * 4;

function buildCloneUrl(accessToken, owner, repo) {
  return `https://x-access-token:${encodeURIComponent(accessToken)}@github.com/${owner}/${repo}.git`;
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
    }, options.timeoutMs || DEFAULT_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      resolve({
        code: code == null ? 1 : code,
        signal: signal || null,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function safeReadFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function applyDiffToWorkspace(workspacePath, patch) {
  const filePatches = parseUnifiedDiff(patch);
  if (filePatches.length === 0) {
    throw new Error('No file changes found in patch for validation.');
  }

  for (const filePatch of filePatches) {
    const targetPath = path.join(workspacePath, filePatch.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const original = await safeReadFile(targetPath);
    const nextContent = applyPatchToContent(original, filePatch);
    await fs.writeFile(targetPath, nextContent, 'utf8');
  }

  return filePatches.map((entry) => entry.path);
}

async function writeGeneratedTest(workspacePath, generatedTest) {
  if (!generatedTest?.path || !generatedTest?.content) {
    return null;
  }

  const testPath = path.join(workspacePath, generatedTest.path);
  await fs.mkdir(path.dirname(testPath), { recursive: true });
  await fs.writeFile(testPath, generatedTest.content, 'utf8');
  return generatedTest.path;
}

async function writeFileOverride(workspacePath, fileOverride) {
  if (!fileOverride?.path || typeof fileOverride.content !== 'string') {
    return null;
  }

  const targetPath = path.join(workspacePath, fileOverride.path);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, fileOverride.content, 'utf8');
  return fileOverride.path;
}

async function readPackageJson(workspacePath) {
  const packageJsonPath = path.join(workspacePath, 'package.json');
  if (!(await fileExists(packageJsonPath))) {
    return null;
  }

  try {
    return JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  } catch {
    return null;
  }
}

async function detectPackageManager(workspacePath, packageJson) {
  const packageManagerField = String(packageJson?.packageManager || '').toLowerCase();
  if (packageManagerField.startsWith('pnpm')) {
    return { command: 'pnpm', installArgs: ['install', '--frozen-lockfile'] };
  }
  if (packageManagerField.startsWith('yarn')) {
    return { command: 'yarn', installArgs: ['install', '--frozen-lockfile'] };
  }
  if (packageManagerField.startsWith('bun')) {
    return { command: 'bun', installArgs: ['install'] };
  }

  if (await fileExists(path.join(workspacePath, 'pnpm-lock.yaml'))) {
    return { command: 'pnpm', installArgs: ['install', '--frozen-lockfile'] };
  }
  if (await fileExists(path.join(workspacePath, 'yarn.lock'))) {
    return { command: 'yarn', installArgs: ['install', '--frozen-lockfile'] };
  }
  if (await fileExists(path.join(workspacePath, 'bun.lockb'))) {
    return { command: 'bun', installArgs: ['install'] };
  }
  if (await fileExists(path.join(workspacePath, 'package-lock.json'))) {
    return { command: 'npm', installArgs: ['ci', '--no-audit', '--no-fund'] };
  }

  return { command: 'npm', installArgs: ['install', '--no-audit', '--no-fund'] };
}

function detectValidationCommand(packageJson, packageManager, generatedTest) {
  const scripts = packageJson?.scripts || {};

  if (scripts['test:ci']) {
    return {
      command: packageManager.command,
      args: ['run', 'test:ci'],
      type: 'test:ci',
    };
  }

  if (scripts.test) {
    const args = ['run', 'test'];
    if (packageManager.command === 'npm') {
      args.push('--', '--runInBand');
    }
    if (generatedTest?.path) {
      args.push('--', generatedTest.path);
    }
    return {
      command: packageManager.command,
      args,
      type: 'test',
    };
  }

  if (scripts.lint) {
    return {
      command: packageManager.command,
      args: ['run', 'lint'],
      type: 'lint-fallback',
    };
  }

  if (scripts.build) {
    return {
      command: packageManager.command,
      args: ['run', 'build'],
      type: 'build-fallback',
    };
  }

  return null;
}

function detectRepositoryValidationCommands(packageJson, packageManager) {
  const scripts = packageJson?.scripts || {};
  const commands = [];

  if (scripts.lint) {
    commands.push({
      command: packageManager.command,
      args: ['run', 'lint'],
      type: 'lint',
    });
  }

  if (scripts['test:ci']) {
    commands.push({
      command: packageManager.command,
      args: ['run', 'test:ci'],
      type: 'test:ci',
    });
  } else if (scripts.test) {
    const args = ['run', 'test'];
    if (packageManager.command === 'npm') {
      args.push('--', '--runInBand');
    }
    commands.push({
      command: packageManager.command,
      args,
      type: 'test',
    });
  }

  if (scripts.build) {
    commands.push({
      command: packageManager.command,
      args: ['run', 'build'],
      type: 'build',
    });
  }

  return commands;
}

async function cloneRepositoryToSandbox(repository) {
  const sandboxRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'product-pulse-validate-'));
  const repoDir = path.join(sandboxRoot, 'repo');
  const cloneResult = await runCommand(
    'git',
    [
      'clone',
      '--depth',
      '1',
      '--branch',
      repository.defaultBranch || 'main',
      buildCloneUrl(repository.accessToken, repository.owner, repository.name),
      repoDir,
    ],
    { timeoutMs: DEFAULT_TIMEOUT_MS }
  );

  if (cloneResult.code !== 0) {
    throw new Error(cloneResult.stderr || 'Failed to clone repository for validation.');
  }

  return {
    sandboxRoot,
    repoDir,
    cloneLog: cloneResult.stdout || cloneResult.stderr || 'Repository cloned.',
  };
}

async function removeSandbox(targetPath) {
  if (!targetPath) return;
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch {
    // Best effort cleanup.
  }
}

async function validatePatchInSandbox({
  repository,
  patch,
  generatedTest,
}) {
  let sandbox;

  try {
    sandbox = await cloneRepositoryToSandbox(repository);
    const touchedFiles = await applyDiffToWorkspace(sandbox.repoDir, patch);
    const testPath = await writeGeneratedTest(sandbox.repoDir, generatedTest);
    const packageJson = await readPackageJson(sandbox.repoDir);

    if (!packageJson) {
      return {
        status: 'inconclusive',
        summary: 'No package.json found in the repository root for validation.',
        touchedFiles,
        generatedTestPath: testPath,
      };
    }

    const packageManager = await detectPackageManager(sandbox.repoDir, packageJson);
    const installResult = await runCommand(
      packageManager.command,
      packageManager.installArgs,
      { cwd: sandbox.repoDir, timeoutMs: DEFAULT_TIMEOUT_MS }
    );

    if (installResult.code !== 0) {
      return {
        status: 'failed',
        summary: 'Dependency installation failed in sandbox.',
        touchedFiles,
        generatedTestPath: testPath,
        installLog: `${installResult.stdout}\n${installResult.stderr}`.trim(),
      };
    }

    const validationCommand = detectValidationCommand(
      packageJson,
      packageManager,
      generatedTest
    );

    if (!validationCommand) {
      return {
        status: 'inconclusive',
        summary: 'No test, lint, or build script was available for sandbox validation.',
        touchedFiles,
        generatedTestPath: testPath,
      };
    }

    const validationResult = await runCommand(
      validationCommand.command,
      validationCommand.args,
      { cwd: sandbox.repoDir, timeoutMs: DEFAULT_TIMEOUT_MS }
    );

    return {
      status: validationResult.code === 0 ? 'passed' : 'failed',
      summary:
        validationResult.code === 0
          ? `Sandbox validation passed using ${validationCommand.type}.`
          : `Sandbox validation failed using ${validationCommand.type}.`,
      touchedFiles,
      generatedTestPath: testPath,
      command: [validationCommand.command, ...validationCommand.args].join(' '),
      logs: `${validationResult.stdout}\n${validationResult.stderr}`.trim(),
      installLog: `${installResult.stdout}\n${installResult.stderr}`.trim(),
    };
  } finally {
    await removeSandbox(sandbox?.sandboxRoot);
  }
}

async function runRepositoryChecksInSandbox({
  repository,
  fileOverride = null,
}) {
  let sandbox;

  try {
    sandbox = await cloneRepositoryToSandbox(repository);
    const overriddenPath = await writeFileOverride(sandbox.repoDir, fileOverride);
    const packageJson = await readPackageJson(sandbox.repoDir);

    if (!packageJson) {
      return {
        status: 'inconclusive',
        summary: 'No package.json found in the repository root for validation.',
        touchedFiles: overriddenPath ? [overriddenPath] : [],
        checks: [],
      };
    }

    const packageManager = await detectPackageManager(sandbox.repoDir, packageJson);
    const installResult = await runCommand(
      packageManager.command,
      packageManager.installArgs,
      { cwd: sandbox.repoDir, timeoutMs: DEFAULT_TIMEOUT_MS }
    );

    if (installResult.code !== 0) {
      return {
        status: 'failed',
        summary: 'Dependency installation failed in sandbox.',
        touchedFiles: overriddenPath ? [overriddenPath] : [],
        installLog: `${installResult.stdout}\n${installResult.stderr}`.trim(),
        checks: [],
      };
    }

    const validationCommands = detectRepositoryValidationCommands(
      packageJson,
      packageManager
    );

    if (!validationCommands.length) {
      return {
        status: 'inconclusive',
        summary: 'No lint, test, or build scripts were available for repository validation.',
        touchedFiles: overriddenPath ? [overriddenPath] : [],
        installLog: `${installResult.stdout}\n${installResult.stderr}`.trim(),
        checks: [],
      };
    }

    const checks = [];
    for (const validationCommand of validationCommands) {
      const validationResult = await runCommand(
        validationCommand.command,
        validationCommand.args,
        { cwd: sandbox.repoDir, timeoutMs: DEFAULT_TIMEOUT_MS }
      );

      checks.push({
        type: validationCommand.type,
        status: validationResult.code === 0 ? 'passed' : 'failed',
        command: [validationCommand.command, ...validationCommand.args].join(' '),
        logs: `${validationResult.stdout}\n${validationResult.stderr}`.trim(),
      });

      if (validationResult.code !== 0) {
        return {
          status: 'failed',
          summary: `Repository validation failed during ${validationCommand.type}.`,
          touchedFiles: overriddenPath ? [overriddenPath] : [],
          installLog: `${installResult.stdout}\n${installResult.stderr}`.trim(),
          checks,
        };
      }
    }

    return {
      status: 'passed',
      summary: `Repository validation passed using ${checks
        .map((check) => check.type)
        .join(', ')}.`,
      touchedFiles: overriddenPath ? [overriddenPath] : [],
      installLog: `${installResult.stdout}\n${installResult.stderr}`.trim(),
      checks,
    };
  } finally {
    await removeSandbox(sandbox?.sandboxRoot);
  }
}

module.exports = {
  runRepositoryChecksInSandbox,
  validatePatchInSandbox,
};
