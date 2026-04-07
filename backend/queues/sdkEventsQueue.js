const { createQueue } = require('./baseQueue');

const sdkEventsQueue = createQueue('sdk-events');

module.exports = {
  sdkEventsQueue,
};
