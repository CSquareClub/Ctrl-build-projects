const { syncConnection } = require('../../controllers/connectionsController');

async function syncFeedbackSource(req, res) {
  return syncConnection(req, res);
}

module.exports = {
  syncFeedbackSource,
};
