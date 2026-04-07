const { createQueue } = require('./baseQueue');

const eventQueue = createQueue('event-pipeline');

module.exports = {
  eventQueue,
};
