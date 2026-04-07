const { runSelfHeal } = require('../lib/services/selfHeal');

async function startSelfHeal(req, res) {
  try {
    const code = String(req.body?.code || '');
    if (!code.trim()) {
      return res.status(400).json({ error: 'code is required.' });
    }

    const result = await runSelfHeal({
      userId: req.user.id,
      code,
      testCode: String(req.body?.testCode || ''),
      language: String(req.body?.language || 'javascript'),
      issue: req.body?.issue || null,
    });

    return res.json({
      id: `sync-${Date.now()}`,
      status: 'completed',
      progress: null,
      result,
      error: null,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      completedAt: result?.completedAt || new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start self-heal.',
    });
  }
}

async function getSelfHealResult(req, res) {
  return res.status(410).json({
    error: 'Synchronous MVP mode does not use self-heal polling.',
  });
}

module.exports = {
  startSelfHeal,
  getSelfHealResult,
};
