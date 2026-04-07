require('dotenv').config();

const { startCodeAnalysisWorker } = require('./services/codeAnalysisQueueService');

startCodeAnalysisWorker();
console.log('[code-analysis-worker] started');
