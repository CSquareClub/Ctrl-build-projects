const { groqQueue } = require('./groqQueue');
const { githubQueue } = require('./githubQueue');
const { agentQueue } = require('./agentQueue');
const { inspectQueue } = require('./inspectQueue');
const { heavyJobsQueue } = require('./heavyJobsQueue');
const { sdkEventsQueue } = require('./sdkEventsQueue');
const { syncQueue } = require('./syncQueue');
const { notificationQueue } = require('./notificationQueue');
const { eventQueue } = require('./eventQueue');
const { codeAnalysisQueue } = require('./codeAnalysisQueue');

const QUEUE_PRIORITY = {
  critical: 1,
  medium: 2,
  low: 3,
};

function getQueueForJobType(jobType) {
  switch (jobType) {
    case 'groq_chat':
    case 'chat':
    case 'patch_generation':
      return groqQueue;
    case 'create_pr':
    case 'fetch_repo':
    case 'apply_patch':
    case 'test_execution':
    case 'github_pr':
      return githubQueue;
    case 'process_feedback':
    case 'detect_issue':
    case 'calculate_confidence':
    case 'agent_loop':
    case 'detect_anomalies':
    case 'update_insights':
      return agentQueue;
    case 'inspect:issue':
    case 'inspect:health':
    case 'playwright_inspection':
      return heavyJobsQueue;
    case 'feedback_received':
    case 'feedback_clustered':
    case 'inspection_triggered':
    case 'github_analysis':
    case 'issue_created':
    case 'agent_action':
      return eventQueue;
    case 'sync_gmail':
    case 'sync_reviews':
    case 'sync_sdk':
    case 'sdk_events_batch':
    case 'sync_sources':
    case 'sync_all':
    case 'cleanup':
      return jobType === 'sdk_events_batch' ? sdkEventsQueue : syncQueue;
    case 'send_alert':
    case 'send_email':
    case 'push_notification':
      return notificationQueue;
    default:
      return agentQueue;
  }
}

module.exports = {
  QUEUE_PRIORITY,
  agentQueue,
  eventQueue,
  codeAnalysisQueue,
  getQueueForJobType,
  githubQueue,
  groqQueue,
  heavyJobsQueue,
  inspectQueue,
  notificationQueue,
  sdkEventsQueue,
  syncQueue,
};
