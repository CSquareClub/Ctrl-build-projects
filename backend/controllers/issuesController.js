const supabase = require('../lib/supabaseClient');
const { isDemoUser } = require('../lib/demoMode');
const { buildDemoIssueCatalog } = require('../lib/dashboardSnapshot');
const { getAccessibleUserIds } = require('../services/collaborationService');
const { publishSystemEvent } = require('../services/liveEventsService');

const providerLabels = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  instagram: 'Instagram',
  'app-reviews': 'App Reviews',
  'google-play': 'Google Play Reviews',
};

const PRAISE_KEYWORDS = [
  'prais',
  'love',
  'great',
  'amazing',
  'awesome',
  'excellent',
  'helpful',
  'thanks',
  'thank you',
  'works well',
  'working well',
  'easy to use',
  'smooth',
  'fast',
  'reliable',
  'intuitive',
  'fantastic',
  'good job',
  'well done',
  'impressed',
  'nice update',
  'much better',
  'better now',
  'fixed for me',
];

const FEATURE_KEYWORDS = [
  'feature request',
  'would like',
  'wishlist',
  'please add',
  'it would be nice',
  'could you add',
  'can you add',
  'suggestion',
  'request',
];

const BUG_KEYWORDS = [
  'performance',
  'crash',
  'freeze',
  'lag',
  'bug',
  'broken',
  'not working',
  "doesn't work",
  'doesnt work',
  'cannot',
  "can't",
  'cant',
  'unable',
  'failed',
  'failing',
  'error',
  'issue',
  'problem',
  'stuck',
  'timeout',
];

const PROBLEM_KEYWORDS = [
  'billing',
  'payment',
  'login',
  'auth',
  'password',
  'onboarding',
  'confusion',
  'confusing',
  'support',
  'feedback',
  'friction',
];

const includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const determineIssueCategory = (issue) => {
  const title = String(pickField(issue, ['title'], '')).toLowerCase();
  const priority = String(pickField(issue, ['priority', 'severity'], 'LOW')).toUpperCase();
  const summary = String(pickField(issue, ['summary', 'description'], '')).toLowerCase();
  const combined = `${title} ${summary}`;

  const hasFeatureSignals = includesAny(combined, FEATURE_KEYWORDS);
  const hasPraiseSignals = includesAny(combined, PRAISE_KEYWORDS);
  const hasBugSignals = includesAny(combined, BUG_KEYWORDS);
  const hasProblemSignals = includesAny(combined, PROBLEM_KEYWORDS);

  if (hasFeatureSignals) {
    return 'Feature Request';
  }

  if (hasPraiseSignals && !hasBugSignals && !hasProblemSignals) {
    return 'Praise';
  }

  if (hasBugSignals) {
    return 'Bug';
  }

  if (hasProblemSignals) {
    return 'Problem';
  }

  if (priority === 'LOW' && hasPraiseSignals) {
    return 'Praise';
  }

  return 'Problem';
};

const pickField = (record, keys, fallback = null) => {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key];
    }
  }

  return fallback;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const looksLikeUuid = (value) => UUID_PATTERN.test(String(value || '').trim());

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildFallbackAuditIssue = () => ({
  id: 'audit-form-not-responding',
  title: 'Audit form not responding',
  issueType: 'global',
  sources: ['gmail', 'sdk'],
  reportCount: 25,
  category: 'Bug',
  priority: 'HIGH',
  trend: 'increasing',
  trendPercent: 18,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  resolvedAt: null,
  lifecycleStatus: 'active',
  intelligenceScore: 0.92,
  severityScore: 0.96,
  trendScore: 0.88,
  confidenceScore: 0.92,
  summary: 'Audit submissions are failing at the final step, causing a visible spike in customer complaints.',
  feedbackMessages: [
    {
      id: 'audit-feedback-1',
      text: 'Audit form is not submitting, button does nothing.',
      source: 'gmail',
      author: 'A. Sharma',
      timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      sentiment: 'negative',
    },
    {
      id: 'audit-feedback-2',
      text: 'Users can fill the audit form but nothing gets saved after submit.',
      source: 'sdk',
      author: 'Product Pulse SDK',
      timestamp: new Date(Date.now() - 1000 * 60 * 84).toISOString(),
      sentiment: 'negative',
    },
    {
      id: 'audit-feedback-3',
      text: 'Submit clicks are spiking and the form still stays on screen.',
      source: 'gmail',
      author: 'M. Patel',
      timestamp: new Date(Date.now() - 1000 * 60 * 126).toISOString(),
      sentiment: 'negative',
    },
  ],
  sourceBreakdown: { gmail: 17, sdk: 8 },
  locationBreakdown: { region: 'India', confidence: 'high' },
  timeline: [
    { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(), count: 2 },
    { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), count: 4 },
    { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), count: 6 },
    { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), count: 10 },
    { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), count: 18 },
    { date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), count: 25 },
    { date: new Date().toISOString(), count: 25 },
  ],
  suggestedActions: [
    'Verify the submit handler is attached to the audit form button.',
    'Confirm the API request is being sent and persisted.',
    'Release the patch once validation succeeds in staging.',
  ],
});

const getFallbackIssueById = (issueId) => {
  const normalized = slugify(issueId);
  if (normalized === 'audit-form-not-responding') {
    return buildFallbackAuditIssue();
  }

  return null;
};

async function findRealIssueRecord(user, issueId) {
  const access = await getAccessibleUserIds(user);
  const normalizedInput = slugify(issueId);
  const query = supabase
    .from('issues')
    .select('*')
    .in('user_id', access.userIds);

  if (looksLikeUuid(issueId)) {
    const { data, error } = await query.eq('id', issueId).maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }

    return data ?? null;
  }

  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }

  return (
    (data || []).find((issue) => {
      const issueKey = pickField(issue, ['issue_key', 'issueKey'], '');
      const issueTitle = pickField(issue, ['title'], '');
      const issueKeySlug = slugify(String(issueKey).split(':').pop() || issueKey);
      const titleSlug = slugify(issueTitle);
      return issueKeySlug === normalizedInput || titleSlug === normalizedInput;
    }) || null
  );
}

const toSafeDate = (value) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const deriveIssueTypeFromKey = (issueKey) => {
  const normalized = String(issueKey || '').trim().toLowerCase();
  if (!normalized) {
    return 'global';
  }

  if (normalized.includes(':')) {
    return normalized.split(':')[0] || 'global';
  }

  return normalized;
};

const deriveLifecycleStatus = (issue) => {
  const resolvedAt = toSafeDate(pickField(issue, ['resolved_at', 'resolvedAt'], null));
  if (resolvedAt) {
    return 'resolved';
  }

  const lastSeen =
    toSafeDate(pickField(issue, ['last_seen_at', 'lastSeenAt'], null)) ||
    toSafeDate(pickField(issue, ['updated_at', 'updatedAt'], null)) ||
    toSafeDate(pickField(issue, ['created_at', 'createdAt'], null));

  if (!lastSeen) {
    return 'active';
  }

  const ageMs = Date.now() - lastSeen.getTime();
  const oneDayMs = 1000 * 60 * 60 * 24;

  if (ageMs <= oneDayMs * 2) {
    return 'new';
  }

  if (ageMs <= oneDayMs * 7) {
    return 'active';
  }

  if (ageMs <= oneDayMs * 21) {
    return 'aging';
  }

  return 'stale';
};

async function refreshIssueLifecycleState(userIds) {
  const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
  if (ids.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from('issues')
    .select('id, user_id, created_at, updated_at, last_seen_at, resolved_at, lifecycle_status')
    .in('user_id', ids);

  if (error) {
    if (error.code === '42P01' || error.code === '42703') {
      return;
    }
    throw error;
  }

  const updates = (data || [])
    .map((issue) => {
      const lifecycleStatus = deriveLifecycleStatus(issue);
      if (issue.lifecycle_status === lifecycleStatus) {
        return null;
      }

      return {
        id: issue.id,
        lifecycle_status: lifecycleStatus,
      };
    })
    .filter(Boolean);

  if (updates.length === 0) {
    return;
  }

  const { error: updateError } = await supabase
    .from('issues')
    .upsert(updates, { onConflict: 'id' });

  if (updateError && updateError.code !== '42703') {
    throw updateError;
  }
}

const normalizeIssue = (issue) => ({
  id: pickField(issue, ['id']),
  title: pickField(issue, ['title'], 'Untitled issue'),
  issueType: pickField(
    issue,
    ['issue_type', 'issueType'],
    deriveIssueTypeFromKey(pickField(issue, ['issue_key', 'issueKey'], ''))
  ),
  sources: pickField(issue, ['sources', 'source_list'], []),
  reportCount: pickField(issue, ['report_count', 'reportCount', 'count'], 0),
  category: pickField(issue, ['category'], determineIssueCategory(issue)),
  priority: pickField(issue, ['priority', 'severity'], 'LOW'),
  trend: pickField(issue, ['trend', 'status'], 'stable'),
  trendPercent: pickField(issue, ['trend_percent', 'trendPercent'], 0),
  createdAt: pickField(issue, ['created_at', 'createdAt', 'timestamp'], new Date().toISOString()),
  updatedAt: pickField(issue, ['updated_at', 'updatedAt', 'created_at'], new Date().toISOString()),
  lastSeenAt: pickField(issue, ['last_seen_at', 'lastSeenAt', 'updated_at', 'created_at'], null),
  resolvedAt: null,
  lifecycleStatus: pickField(issue, ['lifecycle_status', 'lifecycleStatus'], deriveLifecycleStatus(issue)),
  intelligenceScore: pickField(issue, ['intelligence_score', 'intelligenceScore'], 0),
  severityScore: pickField(issue, ['severity_score', 'severityScore'], 0),
  trendScore: pickField(issue, ['trend_score', 'trendScore'], 0),
  confidenceScore: pickField(issue, ['confidence_score', 'confidenceScore'], 0),
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

async function getRealIssues(user) {
  const access = await getAccessibleUserIds(user);
  await refreshIssueLifecycleState(access.userIds);
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .in('user_id', access.userIds);

  if (error) {
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }

  const statusFilter = String(user.issueStatusFilter || '').toLowerCase();
  const issueTypeFilter = String(user.issueTypeFilter || '').toLowerCase();

  return (data ?? [])
    .map((issue) => normalizeIssue(issue))
    .filter((issue) => {
      if (!statusFilter || statusFilter === 'all') {
        return true;
      }

      if (statusFilter === 'active') {
        return issue.lifecycleStatus !== 'resolved';
      }

      return issue.lifecycleStatus === statusFilter;
    })
    .filter((issue) => {
      if (!issueTypeFilter || issueTypeFilter === 'all') {
        return true;
      }

      return String(issue.issueType || 'global') === issueTypeFilter;
    })
    .sort(
      (a, b) =>
        (b.intelligenceScore || 0) - (a.intelligenceScore || 0) ||
        new Date(b.lastSeenAt || b.updatedAt || b.createdAt).getTime() -
          new Date(a.lastSeenAt || a.updatedAt || a.createdAt).getTime()
    )
    .map(({ summary, sourceBreakdown, suggestedActions, ...issue }) => issue);
}

async function getRealIssueDetail(user, issueId) {
  const access = await getAccessibleUserIds(user);
  await refreshIssueLifecycleState(access.userIds);
  const issue = await findRealIssueRecord(user, issueId);

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
    issueType: normalizedIssue.issueType,
    sources: normalizedIssue.sources,
    reportCount: normalizedIssue.reportCount,
    category: normalizedIssue.category,
    priority: normalizedIssue.priority,
    trend: normalizedIssue.trend,
    trendPercent: normalizedIssue.trendPercent,
    createdAt: normalizedIssue.createdAt,
    updatedAt: normalizedIssue.updatedAt,
    lastSeenAt: normalizedIssue.lastSeenAt,
    resolvedAt: normalizedIssue.resolvedAt,
    lifecycleStatus: normalizedIssue.lifecycleStatus,
    intelligenceScore: normalizedIssue.intelligenceScore,
    severityScore: normalizedIssue.severityScore,
    trendScore: normalizedIssue.trendScore,
    confidenceScore: normalizedIssue.confidenceScore,
    summary: normalizedIssue.summary,
    feedbackMessages,
    sourceBreakdown: normalizedIssue.sourceBreakdown,
    locationBreakdown: normalizedIssue.locationBreakdown,
    timeline,
    suggestedActions: normalizedIssue.suggestedActions,
  };
}

async function getAccessibleIssueRecord(user, issueId) {
  const issue = await findRealIssueRecord(user, issueId);
  if (!issue) {
    return null;
  }

  return {
    id: issue.id,
    user_id: issue.user_id,
  };
}

const listIssues = async (req, res) => {
  try {
    if (!isDemoUser(req.user)) {
      const issues = await getRealIssues({
        ...req.user,
        issueStatusFilter: req.query?.status || null,
        issueTypeFilter: req.query?.issueType || null,
      });
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
      const issue = await getRealIssueDetail(req.user, req.params.id);

      if (!issue) {
        const fallbackIssue = getFallbackIssueById(req.params.id);
        if (fallbackIssue) {
          return res.json(fallbackIssue);
        }

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

const updateIssue = async (req, res) => {
  try {
    const statusInput = req.body?.status;
    if (!statusInput) {
      return res.status(400).json({ error: 'status is required.' });
    }

    const normalizedStatus = String(statusInput).trim().toLowerCase();
    if (!['resolved', 'active'].includes(normalizedStatus)) {
      return res.status(400).json({ error: 'status must be active or resolved.' });
    }

    const updatedAt = new Date().toISOString();

    const issueRecord = await getAccessibleIssueRecord(req.user, req.params.id);

    if (!issueRecord) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    const { data, error } = await supabase
      .from('issues')
      .update({
        resolved_at: null,
        updated_at: updatedAt,
      })
      .eq('id', req.params.id)
      .eq('user_id', issueRecord.user_id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw error;
    }
    await publishSystemEvent({
      userId: req.user.id,
      type: 'issue_updated',
      payload: {
        issueId: data.id,
        status: 'active',
        resolved: false,
      },
    });

    res.json(normalizeIssue(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  listIssues,
  getIssueById,
  updateIssue,
};
