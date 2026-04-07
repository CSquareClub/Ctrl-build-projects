const { createQueue } = require('./baseQueue');

const heavyJobsQueue = createQueue('heavy-jobs');

module.exports = {
  heavyJobsQueue,
};
