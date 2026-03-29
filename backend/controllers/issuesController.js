const supabase = require('../lib/supabaseClient');
const { isDemoUser } = require('../lib/demoMode');
const { buildDemoIssueCatalog } = require('../lib/dashboardSnapshot');

const providerLabels = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  instagram: 'Instagram',
  'app-reviews': 'App Reviews',
  'google-play': 'Google Play Reviews',
};

const determineIssueCategory = (issue) => {
  const title = String(pickField(issue, ['title'], '')).toLowerCase();
  const priority = String(pickField(issue, ['priority', 'severity'], 'LOW')).toUpperCase();
  const summary = String(pickField(issue, ['summary', 'description'], '')).toLowerCase();
  const combined = `${title} ${summary}`;

  if (
    combined.includes('feature request') ||
    combined.includes('would like') ||
    combined.includes('suggestion')
  ) {
    return 'Feature Request';
  }

  if (
    combined.includes('performance') ||
    combined.includes('crash') ||
    combined.includes('freeze') ||
    combined.includes('lag')
  ) {
    return 'Bug';
  }

  if (
    priority === 'LOW' &&
    (combined.includes('prais') ||
      combined.includes('love') ||
      combined.includes('great') ||
      combined.includes('amazing') ||
      combined.includes('thanks') ||
      combined.includes('helpful') ||
      combined.includes('works well') ||
      combined.includes('easy to use'))
  ) {
    return 'Praise';
  }

  if (
    combined.includes('billing') ||
    combined.includes('payment') ||
    combined.includes('login') ||
    combined.includes('auth') ||
    combined.includes('password') ||
    combined.includes('onboarding') ||
    combined.includes('confusion') ||
    combined.includes('support') ||
    combined.includes('feedback')
  ) {
    return 'Problem';
  }

  return priority === 'LOW' ? 'Praise' : 'Problem';
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
  category: pickField(issue, ['category'], determineIssueCategory(issue)),
  priority: pickField(issue, ['priority', 'severity'], 'LOW'),
  trend: pickField(issue, ['trend', 'status'], 'stable'),
  trendPercent: pickField(issue, ['trend_percent', 'trendPercent'], 0),
  createdAt: pickField(issue, ['created_at', 'createdAt', 'timestamp'], new Date().toISOString()),
  summary: pickField(issue, ['summary', 'description'], 'No summary available yet.'),
  sourceBreakdown: pickField(issue, ['source_breakdown', 'sourceBreakdown'], {}),
  locationBreakdown: pickField(issue, ['location_breakdown', 'locationBreakdown'], {}),
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ summary, sourceBreakdown, suggestedActions, ...issue }) => issue);
}

async function getRealIssueDetail(userId, issueId) {
  const { data: issue, error: issueError } = await supabase
    .from('issues')
    .select('*')
    .eq('user_id', userId)
    .eq('id', issueId)
    .maybeSingle();

  if (issueError) {
    if (issueError.code === '42P01') {
      return null;
    }
    throw issueError;
  }

  if (!issue) {
    return null;
  }

  let feedbackMessages = [];
  const { data: feedback, error: feedbackError } = await supabase
    .from('issue_feedback')
    .select('*')
    .eq('issue_id', issueId);

  if (feedbackError && feedbackError.code !== '42P01') {
    throw feedbackError;
  }
  if (!feedbackError) {
    feedbackMessages = (feedback ?? [])
      .map((entry) => normalizeFeedback(entry))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  let timeline = [];
  const { data: timelineRows, error: timelineError } = await supabase
    .from('issue_timeline')
    .select('*')
    .eq('issue_id', issueId);

  if (timelineError && timelineError.code !== '42P01') {
    throw timelineError;
  }
  if (!timelineError) {
    timeline = (timelineRows ?? [])
      .map((row) => normalizeTimelinePoint(row))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  const normalizedIssue = normalizeIssue(issue);

  return {
    id: normalizedIssue.id,
    title: normalizedIssue.title,
    sources: normalizedIssue.sources,
    reportCount: normalizedIssue.reportCount,
    category: normalizedIssue.category,
    priority: normalizedIssue.priority,
    trend: normalizedIssue.trend,
    trendPercent: normalizedIssue.trendPercent,
    createdAt: normalizedIssue.createdAt,
    summary: normalizedIssue.summary,
    feedbackMessages,
    sourceBreakdown: normalizedIssue.sourceBreakdown,
    locationBreakdown: normalizedIssue.locationBreakdown,
    timeline,
    suggestedActions: normalizedIssue.suggestedActions,
  };
}

const listIssues = async (req, res) => {
  try {
    if (!isDemoUser(req.user)) {
      const issues = await getRealIssues(req.user.id);
      return res.json(issues);
    }

    const connections = await getUserConnections(req.user.id);
    const issues = buildDemoIssueCatalog(connections).map(
      ({ summary, feedbackMessages, sourceBreakdown, timeline, suggestedActions, ...issue }) => issue
    );

    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getIssueById = async (req, res) => {
  try {
    if (!isDemoUser(req.user)) {
      const issue = await getRealIssueDetail(req.user.id, req.params.id);

      if (!issue) {
        return res.status(404).json({
          error: 'No real issue found for this account yet.',
        });
      }

      return res.json(issue);
    }

    const connections = await getUserConnections(req.user.id);
    const issues = buildDemoIssueCatalog(connections);
    const issue = issues.find((entry) => entry.id === req.params.id);

    if (!issue) {
      return res.status(404).json({
        error:
          connections.length === 0
            ? 'No connected sources found yet. Connect Gmail, Instagram, or App Reviews to generate issues.'
            : `Issue "${req.params.id}" was not found.`,
      });
    }

    const providerLabelsUsed = issue.sources
      .map((source) => providerLabels[source] ?? source)
      .join(', ');

    res.json({
      ...issue,
      summary: `${issue.summary} Signals currently coming from ${providerLabelsUsed}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listIssues,
  getIssueById,
};
