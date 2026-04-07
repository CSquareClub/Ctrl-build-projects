const { getSystemHealth } = require('../services/sdkPipelineService');

async function getHealth(req, res) {
  try {
    const health = await getSystemHealth(req.user?.id || null);
    return res.json({
      status: 'ok',
      ...health,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to load system health.',
    });
  }
}

module.exports = {
  getHealth,
};
