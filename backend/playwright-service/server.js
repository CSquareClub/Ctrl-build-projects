require('dotenv').config();

const app = require('./app');
const { closeSharedBrowser } = require('./services/playwrightInspectionService');

const port = Number(process.env.PLAYWRIGHT_SERVICE_PORT || 4100);

const server = app.listen(port, () => {
  console.log(`[playwright-service] listening on port ${port}`);
});

async function shutdown() {
  await closeSharedBrowser().catch(() => null);
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
