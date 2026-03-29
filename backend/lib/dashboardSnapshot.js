const supabase = require('./supabaseClient');
const { DEMO_EMAIL, isDemoUser } = require('./demoMode');

const buildDemoIssueCatalog = (connections) => {
  const providers = connections.map((connection) => connection.provider);
  const issues = [];

  if (providers.includes('gmail')) {
    issues.push({
      id: 'email-response-delays',
      title: 'Support inbox response times are slipping',
      sources: ['gmail'],
      reportCount: 18,
      priority: 'HIGH',
      trend: 'increasing',
      trendPercent: 32,
      createdAt: new Date().toISOString(),
      summary:
        'Customers are repeating the same billing and onboarding questions, which suggests support load is rising faster than replies are being cleared.',
      feedbackMessages: [
        {
          id: 'gmail-1',
          text: 'I sent two emails about activating my subscription and still have not heard back.',
          source: 'gmail',
          author: 'A. Sharma',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          sentiment: 'negative',
        },
        {
          id: 'gmail-2',
          text: 'Love the product, but I need a faster response when billing fails.',
          source: 'gmail',
          author: 'M. Patel',
          timestamp: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
          sentiment: 'neutral',
        },
      ],
      sourceBreakdown: { gmail: 18 },
      timeline: [
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), count: 6 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), count: 9 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), count: 11 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), count: 14 },
        { date: new Date().toISOString(), count: 18 },
      ],
      suggestedActions: [
        'Set an auto-reply that shares expected response time and common billing fixes.',
        'Tag repeated onboarding emails and turn them into a quick-start knowledge article.',
        'Escalate unresolved billing threads older than 12 hours.',
      ],
    });
  }

  if (providers.includes('instagram')) {
    issues.push({
      id: 'instagram-onboarding-confusion',
      title: 'Instagram comments show onboarding confusion',
      sources: ['instagram'],
      reportCount: 11,
      priority: 'MEDIUM',
      trend: 'increasing',
      trendPercent: 18,
      createdAt: new Date().toISOString(),
      summary:
        'New users are asking where to begin after signup, so the first-run experience likely needs a clearer starting point.',
      feedbackMessages: [
        {
          id: 'instagram-1',
          text: 'Looks nice but I do not know what to set up first after login.',
          source: 'instagram',
          author: '@launchwithria',
          timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
          sentiment: 'negative',
        },
        {
          id: 'instagram-2',
          text: 'Can you post a walkthrough for the dashboard setup?',
          source: 'instagram',
          author: '@buildwithjay',
          timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
          sentiment: 'neutral',
        },
      ],
      sourceBreakdown: { instagram: 11 },
      timeline: [
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), count: 4 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), count: 5 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), count: 7 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), count: 9 },
        { date: new Date().toISOString(), count: 11 },
      ],
      suggestedActions: [
        'Add a first-run checklist directly on the dashboard.',
        'Link a 60-second setup guide from your welcome email and social bio.',
        'Track where new users pause during onboarding to confirm the drop-off step.',
      ],
    });
  }

  if (providers.includes('app-reviews')) {
    issues.push({
      id: 'mobile-stability-reviews',
      title: 'Recent app reviews mention mobile stability issues',
      sources: ['app-reviews'],
      reportCount: 9,
      priority: 'HIGH',
      trend: 'stable',
      trendPercent: 7,
      createdAt: new Date().toISOString(),
      summary:
        'Store feedback points to intermittent crashes and slow screens on mobile, which is hurting confidence even among otherwise positive reviewers.',
      feedbackMessages: [
        {
          id: 'review-1',
          text: 'Good idea, but the app freezes when I switch tabs too quickly.',
          source: 'app-reviews',
          author: 'Play Store review',
          timestamp: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
          sentiment: 'negative',
        },
        {
          id: 'review-2',
          text: 'Useful dashboard, just needs smoother performance on my phone.',
          source: 'app-reviews',
          author: 'App Store review',
          timestamp: new Date(Date.now() - 1000 * 60 * 430).toISOString(),
          sentiment: 'neutral',
        },
      ],
      sourceBreakdown: { 'app-reviews': 9 },
      timeline: [
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), count: 8 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), count: 7 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), count: 9 },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), count: 8 },
        { date: new Date().toISOString(), count: 9 },
      ],
      suggestedActions: [
        'Review crash logs for the most common device and OS combinations mentioned in reviews.',
        'Ship a small performance-focused update and mention it in the next release notes.',
        'Prompt satisfied users for new ratings after the stability fix lands.',
      ],
    });
  }

  if (issues.length > 1) {
    const totalReports = issues.reduce((sum, issue) => sum + issue.reportCount, 0);
    issues.unshift({
      id: 'cross-channel-retention-friction',
      title: 'Cross-channel feedback points to retention friction after signup',
      sources: providers,
      reportCount: totalReports,
      priority: 'HIGH',
      trend: 'increasing',
      trendPercent: 24,
      createdAt: new Date().toISOString(),
      summary:
        'Multiple channels are echoing the same themes: onboarding uncertainty, delayed help, and mobile rough edges. Together they suggest users are at risk early in the lifecycle.',
      feedbackMessages: issues.flatMap((issue) => issue.feedbackMessages).slice(0, 4),
      sourceBreakdown: providers.reduce((acc, provider) => {
        acc[provider] = issues
          .filter((issue) => issue.sources.includes(provider))
          .reduce((sum, issue) => sum + issue.reportCount, 0);
        return acc;
      }, {}),
      timeline: [
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), count: Math.max(6, totalReports - 15) },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), count: Math.max(8, totalReports - 10) },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), count: Math.max(10, totalReports - 7) },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), count: Math.max(12, totalReports - 3) },
        { date: new Date().toISOString(), count: totalReports },
      ],
      suggestedActions: [
        'Create one founder-facing weekly pulse report that combines support, social, and review trends.',
        'Prioritize the first user action after signup and make support links visible in-product.',
        'Use release notes and email updates to close the loop on the top three recurring complaints.',
      ],
    });
  }

  return issues;
};

const pickField = (record, keys, fallback = null) => {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return fallback;
};

const normalizeIssue = (issue) => ({
  id: pickField(issue, ['id']),
  title: pickField(issue, ['title'], 'Untitled issue'),
  sources: pickField(issue, ['sources', 'source_list'], []),
  reportCount: pickField(issue, ['report_count', 'reportCount', 'count'], 0),
  priority: pickField(issue, ['priority', 'severity'], 'LOW'),
  trend: pickField(issue, ['trend', 'status'], 'stable'),
  trendPercent: pickField(issue, ['trend_percent', 'trendPercent'], 0),
  createdAt: pickField(issue, ['created_at', 'createdAt', 'timestamp'], new Date().toISOString()),
  summary: pickField(issue, ['summary', 'description'], 'No summary available yet.'),
  sourceBreakdown: pickField(issue, ['source_breakdown', 'sourceBreakdown'], {}),
  suggestedActions: pickField(issue, ['suggested_actions', 'suggestedActions'], []),
});

const normalizeFeedback = (feedback) => ({
  id: pickField(feedback, ['id']),
  text: pickField(feedback, ['text', 'message'], ''),
  source: pickField(feedback, ['source'], 'unknown'),
  author: pickField(feedback, ['author', 'user_name', 'username'], 'Unknown'),
  timestamp: pickField(
    feedback,
    ['timestamp', 'created_at', 'createdAt'],
    new Date().toISOString()
  ),
  sentiment: pickField(feedback, ['sentiment'], 'neutral'),
});

const normalizeTimelinePoint = (row) => ({
  date: pickField(row, ['date', 'timestamp', 'created_at'], new Date().toISOString()),
  count: pickField(row, ['count', 'report_count', 'value'], 0),
});

async function getUserConnections(userId) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('id, provider, metadata, created_at')
    .eq('user_id', userId);

  if (error) {
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }

  return data ?? [];
}

async function getRealIssues(userId) {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }

  return (data ?? [])
    .map((issue) => normalizeIssue(issue))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function getRecentFeedbackForUser(userId) {
  const { data, error } = await supabase
    .from('issue_feedback')
    .select('*, issues!inner(user_id)')
    .eq('issues.user_id', userId);

  if (error) {
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }

  return (data ?? [])
    .map((entry) => normalizeFeedback(entry))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);
}

async function getTimelineForIssues(issueIds) {
  if (issueIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('issue_timeline')
    .select('*')
    .in('issue_id', issueIds);

  if (error) {
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }

  return (data ?? [])
    .map((row) => ({
      ...normalizeTimelinePoint(row),
      issueId: pickField(row, ['issue_id']),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function getDashboardSnapshot(user) {
  const connections = await getUserConnections(user.id);

  if (isDemoUser(user)) {
    const issues = buildDemoIssueCatalog(connections);
    return {
      mode: 'demo',
      connections,
      issues,
      feedback: issues.flatMap((issue) => issue.feedbackMessages).slice(0, 12),
      timeline: issues.flatMap((issue) =>
        issue.timeline.map((point) => ({ ...point, issueId: issue.id }))
      ),
    };
  }

  const issues = await getRealIssues(user.id);
  const feedback = await getRecentFeedbackForUser(user.id);
  const timeline = await getTimelineForIssues(issues.map((issue) => issue.id));

  return {
    mode: 'real',
    connections,
    issues,
    feedback,
    timeline,
  };
}

module.exports = {
  DEMO_EMAIL,
  buildDemoIssueCatalog,
  getDashboardSnapshot,
  getUserConnections,
};
