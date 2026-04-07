const { createQueue } = require('./baseQueue');

const mobileInspectQueue = createQueue('mobile-inspect');

module.exports = {
  mobileInspectQueue,
};
