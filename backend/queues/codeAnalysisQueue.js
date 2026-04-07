const { createQueue } = require('./baseQueue');

const codeAnalysisQueue = createQueue('code-analysis');

module.exports = {
  codeAnalysisQueue,
};
