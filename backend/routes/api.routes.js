const express = require('express');
const authController = require('../controllers/authController');
const aiController = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');
const { aiChatRateLimit } = require('../middleware/aiRateLimit');
const connectionsController = require('../controllers/connectionsController');
const imapController = require('../controllers/imapController');
const issuesController = require('../controllers/issuesController');
const remindersController = require('../controllers/remindersController');
const redditController = require('../controllers/redditController');
const reviewsController = require('../controllers/reviewsController');
const socialSearchController = require('../controllers/socialSearchController');
const sdkController = require('../controllers/sdkController');
const ticketsController = require('../controllers/ticketsController');
const timelineController = require('../controllers/timelineController');
const reportsController = require('../controllers/reportsController');
const { sdkRateLimit } = require('../middleware/sdkRateLimit');
const { generateSdkApiKey } = require('../lib/sdkAuth');
const supabase = require('../lib/supabaseClient');

const router = express.Router();

router.post('/auth/register', authController.register);
router.get('/integrations/gmail/callback', connectionsController.gmailOAuthCallback);
router.get('/integrations/outlook/callback', connectionsController.outlookOAuthCallback);
router.post('/sdk/event', sdkRateLimit, sdkController.postSdkEvent);
router.post('/sdk/feedback', sdkRateLimit, sdkController.postSdkFeedback);
router.post('/sdk/error', sdkRateLimit, sdkController.postSdkError);

// Protect all /api routes with Supabase JWT Auth
router.use(requireAuth);

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

// OAuth Connections Management
router.get('/connections', connectionsController.getConnections);
router.get('/integrations/gmail/start', connectionsController.startGmailOAuth);
router.get('/integrations/outlook/start', connectionsController.startOutlookOAuth);
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
router.post('/ai/chat', aiChatRateLimit, aiController.chatWithAssistant);
router.get('/issues', issuesController.listIssues);
router.get('/issues/:id', issuesController.getIssueById);
router.get('/timeline', timelineController.getTimeline);
router.get('/reports/weekly', reportsController.getWeeklyReport);
router.get('/tickets', ticketsController.listTickets);
router.post('/tickets', ticketsController.createTicket);
router.patch('/tickets/:id', ticketsController.updateTicket);
router.delete('/tickets/:id', ticketsController.deleteTicket);
router.get('/reminders', remindersController.listReminders);
router.post('/reminders', remindersController.createReminder);
router.patch('/reminders/:id', remindersController.updateReminder);
router.delete('/reminders/:id', remindersController.deleteReminder);

module.exports = router;
