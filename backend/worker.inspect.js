require('dotenv').config();

const { startInspectionWorker } = require('./services/inspectionWorkerService');

startInspectionWorker();

console.log('[inspect-worker] listening for inspect jobs');
