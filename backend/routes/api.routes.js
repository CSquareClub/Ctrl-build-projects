const express = require('express');
const authController = require('../controllers/authController');
const aiController = require('../controllers/aiController');
const agentController = require('../controllers/agentController');
const agentCodeController = require('../controllers/agentCodeController');
const codeRiskController = require('../controllers/codeRiskController');
const codeFixController = require('../controllers/codeFixController');
const collaborationController = require('../controllers/collaborationController');
const { requireAuth } = require('../middleware/auth');
const { aiChatRateLimit } = require('../middleware/aiRateLimit');
const connectionsController = require('../controllers/connectionsController');
const imapController = require('../controllers/imapController');
const inspectController = require('../controllers/inspectController');
const issuesController = require('../controllers/issuesController');
const remindersController = require('../controllers/remindersController');
const redditController = require('../controllers/redditController');
const reviewsController = require('../controllers/reviewsController');
const socialSearchController = require('../controllers/socialSearchController');
const sdkController = require('../controllers/sdkController');
const setupController = require('../controllers/setupController');
const notificationController = require('../controllers/notificationController');
const liveEventsController = require('../controllers/liveEventsController');
const mobileController = require('../controllers/mobileController');
const selfHealController = require('../controllers/selfHealController');
const githubAutomationController = require('../controllers/githubAutomationController');
const ticketsController = require('../controllers/ticketsController');
const timelineController = require('../controllers/timelineController');
const reportsController = require('../controllers/reportsController');
const testsController = require('../controllers/testsController');
const { sdkRateLimit } = require('../middleware/sdkRateLimit');
const { generateSdkApiKey } = require('../lib/sdkAuth');
const supabase = require('../lib/supabaseClient');

const router = express.Router();

router.post('/auth/register', authController.register);
router.get('/integrations/gmail/callback', connectionsController.gmailOAuthCallback);
router.get('/integrations/google-calendar/callback', connectionsController.googleCalendarOAuthCallback);
router.get('/integrations/outlook/callback', connectionsController.outlookOAuthCallback);
router.get('/integrations/github/callback', agentCodeController.githubOAuthCallback);
router.post('/github/webhook', express.json({ limit: '1mb' }), githubAutomationController.handleGitHubWebhook);
router.post('/sdk/event', sdkRateLimit, sdkController.postSdkEvent);
router.post('/sdk/feedback', sdkRateLimit, sdkController.postSdkFeedback);
router.post('/sdk/error', sdkRateLimit, sdkController.postSdkError);

// Protect all /api routes with Supabase JWT Auth
router.use(requireAuth);

router.post('/auth/github/callback', authController.syncGitHubSession);

// GET /api/me --> Returns current user context inside backend
router.get('/me', async (req, res) => {
  const { data, error } = await supabase
    .from('feedback_events')
    .select('source, occurred_at, url')
    .eq('user_id', req.user.id)
    .in('source', ['sdk_event', 'sdk_feedback', 'sdk_error'])
    .order('occurred_at', { ascending: false })
    .limit(50);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const sdkRows = data ?? [];
  const eventCount = sdkRows.filter((row) => row.source === 'sdk_event').length;
  const feedbackCount = sdkRows.filter((row) => row.source === 'sdk_feedback').length;
  const errorCount = sdkRows.filter((row) => row.source === 'sdk_error').length;

  res.json({
    user: req.user,
    sdkApiKey: generateSdkApiKey(req.user.id),
    sdkStats: {
      totalSignals: sdkRows.length,
      eventCount,
      feedbackCount,
      errorCount,
      latestEventAt: sdkRows[0]?.occurred_at ?? null,
      latestUrl: sdkRows.find((row) => row.url)?.url ?? null,
    },
  });
});
router.get('/setup/status', setupController.getSetupStatus);
router.post('/setup/complete', setupController.completeSetup);

// OAuth Connections Management
router.get('/connections', connectionsController.getConnections);
router.get('/integrations/gmail/start', connectionsController.startGmailOAuth);
router.get('/integrations/google-calendar/start', connectionsController.startGoogleCalendarOAuth);
router.get('/integrations/google-calendar/status', connectionsController.getGoogleCalendarStatus);
router.get('/integrations/outlook/start', connectionsController.startOutlookOAuth);
router.get('/integrations/github/start', agentCodeController.startGitHubOAuth);
router.get('/integrations/github/status', agentCodeController.getGitHubStatus);
router.get('/integrations/github/repos', agentCodeController.listGitHubRepos);
router.get('/integrations/github/structure', agentCodeController.getGitHubRepoStructure);
router.get('/integrations/github/mappings', agentCodeController.listGitHubMappings);
router.get('/integrations/github/automations', githubAutomationController.listAutomations);
router.patch('/integrations/github/settings', agentCodeController.updateGitHubWorkspaceSettings);
router.patch('/integrations/github/repository', agentCodeController.selectGitHubRepo);
router.put('/integrations/github/mappings', agentCodeController.saveRepoMapping);
router.delete('/integrations/github/mappings/:issueType', agentCodeController.removeRepoMapping);
router.post('/integrations/github/automations/:type/run', githubAutomationController.runAutomationNow);
router.get('/integrations/imap/status', imapController.getImapStatus);
router.post('/integrations/imap/connect', imapController.connectImapAccount);
router.post('/integrations/imap/sync', imapController.syncImapAccount);
router.post('/integrations/reviews/fetch', reviewsController.fetchReviews);
router.post('/integrations/social/reddit', redditController.fetchRedditPosts);
router.post('/integrations/social/search', socialSearchController.fetchSocialMentions);
router.post('/connect/:provider', connectionsController.connectProvider);
router.post('/connections/:provider/sync', connectionsController.syncConnection);
router.patch('/connections/:id', connectionsController.updateConnection);
router.delete('/connections/:id', connectionsController.disconnectProvider);
router.post('/inspect/start', inspectController.startInspection);
router.get('/inspect/activity', inspectController.getInspectionActivity);
router.get('/inspect/results', inspectController.getInspectionResults);
router.post('/ai/chat', aiChatRateLimit, aiController.chatWithAssistant);
router.get('/issues', issuesController.listIssues);
router.get('/issues/:id', issuesController.getIssueById);
router.get('/collaboration/workspaces', collaborationController.listWorkspaces);
router.post('/collaboration/workspaces', collaborationController.createWorkspaceHandler);
router.post('/collaboration/workspaces/join', collaborationController.joinWorkspaceHandler);
router.patch('/collaboration/workspaces/members', collaborationController.updateMemberRole);
router.get('/collaboration/dashboard', collaborationController.getWorkspaceDashboard);
router.get('/collaboration/issues/:issueId', collaborationController.getIssueCollaboration);
router.post('/collaboration/issues/assign', collaborationController.assignIssueHandler);
router.post('/collaboration/issues/comment', collaborationController.addCommentHandler);
router.post('/collaboration/approvals', collaborationController.createApprovalHandler);
router.patch('/collaboration/approvals/:id', collaborationController.updateApprovalHandler);
router.get('/timeline', timelineController.getTimeline);
router.get('/reports/weekly', reportsController.getWeeklyReport);
router.get('/agent/status', agentController.getStatus);
router.get('/agent/actions', agentController.getActions);
router.get('/agent/anomalies', agentController.getAnomalyFeed);
router.get('/agent/predictions', agentController.getPredictionFeed);
router.get('/agent/trends', agentController.getTrendFeed);
router.get('/agent/confidence/:issueId', agentController.getConfidence);
router.get('/agent/priority/:issueId', agentController.getPriority);
router.get('/agent/executive-summary', agentController.getExecutiveSummary);
router.post('/agent/chat', agentController.chatWithAgent);
router.post('/agent/feedback-action', agentController.submitFeedbackAction);
router.patch('/agent/settings', agentController.updateSettings);
router.post('/agent/run', agentController.runNow);
router.get('/mobile/status', mobileController.getMobileStatus);
router.get('/mobile/results', mobileController.getMobileResults);
router.get('/mobile/activity', mobileController.getMobileActivity);
router.get('/mobile/agent-activity', mobileController.getAgentActivity);
router.post('/mobile/connect', mobileController.mobileUploadMiddleware, mobileController.connectMobileApp);
router.post('/mobile/inspect', mobileController.startMobileInspection);
router.post('/code/analyze', codeRiskController.analyzeCode);
router.get('/code/result/:jobId', codeRiskController.getAnalysisResult);
router.post('/code/fix', codeFixController.fixCode);
router.post('/code/pull-request', codeFixController.createCodePullRequest);
router.post('/tests/generate', testsController.generateTests);
router.post('/tests/run', testsController.runTests);
router.post('/self-heal', selfHealController.startSelfHeal);
router.get('/self-heal/:jobId', selfHealController.getSelfHealResult);
router.post('/agent-code/issues/:issueId/analyze', agentCodeController.analyzeIssueCode);
router.post('/agent-code/issues/:issueId/chat', agentCodeController.chatIssueCode);
router.post('/agent-code/issues/:issueId/validate', agentCodeController.validateIssuePatch);
router.post('/agent-code/issues/:issueId/pull-request', agentCodeController.createPatchPullRequest);
router.post('/code/repo-file', agentCodeController.loadRepositoryFile);
router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/read', notificationController.markRead);
router.get('/events/stream', liveEventsController.streamEvents);
router.get('/tickets', ticketsController.listTickets);
router.post('/tickets', ticketsController.createTicket);
router.patch('/tickets/:id', ticketsController.updateTicket);
router.delete('/tickets/:id', ticketsController.deleteTicket);
router.get('/reminders', remindersController.listReminders);
router.post('/reminders', remindersController.createReminder);
router.patch('/reminders/:id', remindersController.updateReminder);
router.delete('/reminders/:id', remindersController.deleteReminder);

module.exports = router;
