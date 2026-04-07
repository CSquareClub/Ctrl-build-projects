const { execFile } = require('child_process');
const { promisify } = require('util');
const { syncConnection } = require('./connectionsController');

const execFileAsync = promisify(execFile);

const COMMANDS = {
  'npm run build': {
    file: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'build'],
    cwd: process.cwd(),
  },
  'npm test': {
    file: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['test'],
    cwd: process.cwd(),
  },
};

async function runCommand(req, res) {
  try {
    const command = String(req.body?.command || '').trim();
    const allowed = COMMANDS[command];

    if (!allowed) {
      return res.status(400).json({
        error: 'Only whitelisted commands are allowed.',
        allowedCommands: Object.keys(COMMANDS),
      });
    }

    const result = await execFileAsync(allowed.file, allowed.args, {
      cwd: allowed.cwd,
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    }).catch((error) => ({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      code: error.code || 1,
    }));

    const logs = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();

    return res.json({
      command,
      success: !result.code,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run command.',
      logs: '',
    });
  }
}

async function syncFeedback(req, res) {
  const provider = String(req.body?.provider || 'gmail').trim();
  req.params = {
    ...(req.params || {}),
    provider,
  };
  return syncConnection(req, res);
}

module.exports = {
  runCommand,
  syncFeedback,
};
