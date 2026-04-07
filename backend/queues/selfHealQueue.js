const { createQueue } = require('./baseQueue');

const selfHealQueue = createQueue('self-heal');

module.exports = {
  selfHealQueue,
};
