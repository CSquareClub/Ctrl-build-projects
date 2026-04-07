const express = require('express');
const { inspectWithPlaywright } = require('./services/playwrightInspectionService');

const app = express();
app.use(express.json({ limit: '2mb' }));

function isAuthorized(req) {
  const secret = String(process.env.INSPECTION_SERVICE_SECRET || '').trim();
  if (!secret) {
    return true;
  }

  const provided = String(req.headers['x-inspection-secret'] || '').trim();
  return provided === secret;
}

app.get('/health', async (_req, res) => {
  res.json({
    status: 'ok',
    service: 'playwright-inspection',
  });
});

app.post('/inspect', async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Invalid inspection service secret.' });
    }

    const url = String(req.body?.url || '').trim();
    const issue = String(req.body?.issue || 'Inspection').trim();
    const context = req.body?.context && typeof req.body.context === 'object'
      ? req.body.context
      : {};

    if (!url) {
      return res.status(400).json({ error: 'url is required.' });
    }

    const result = await inspectWithPlaywright({
      url,
      issue,
      context,
      timeoutMs: req.body?.timeoutMs,
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Playwright inspection failed.',
    });
  }
});

module.exports = app;
