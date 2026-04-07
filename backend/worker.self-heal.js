require('dotenv').config();

const { startSelfHealWorker } = require('./services/selfHealQueueService');

startSelfHealWorker();
console.log('[self-heal-worker] started');
