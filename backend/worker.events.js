require('dotenv').config();

const { startEventWorker } = require('./services/eventPipelineService');

startEventWorker();
console.log('[event-worker] started');
