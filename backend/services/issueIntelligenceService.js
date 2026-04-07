const supabase = require('../lib/supabaseClient');

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === '42703' ||
    String(error?.message || '').toLowerCase().includes('does not exist')
  );
}

function pickTopBreakdownKey(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value)
    .map(([key, count]) => [key, safeNumber(count, 0)])
    .sort((left, right) => right[1] - left[1]);

  return entries[0]?.[0] || null;
}

function normalizeIssueRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || 'Untitled issue',
    summary: row.summary || '',
    priority: String(row.priority || 'LOW').toUpperCase(),
    reportCount: safeNumber(row.report_count, 0),
    trend: String(row.trend || 'stable'),
    trendPercent: safeNumber(row.trend_percent, 0),
    sources: Array.isArray(row.sources) ? row.sources : [],
    sourceBreakdown: row.source_breakdown || {},
    locationBreakdown: row.location_breakdown || {},
    intelligenceScore: safeNumber(row.intelligence_score, 0),
    severityScore: safeNumber(row.severity_score, 0),
    trendScore: safeNumber(row.trend_score, 0),
    confidenceScore: safeNumber(row.confidence_score, 0),
  };
}

function normalizeTimeline(rows) {
  return (rows || [])
    .map((row) => ({
      date: row.date,
      count: safeNumber(row.count, 0),
    }))
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

function extractApiHint(rawData) {
  const failures = Array.isArray(rawData?.networkFailures) ? rawData.networkFailures : [];
  for (const failure of failures) {
    const rawUrl = String(failure?.url || '').trim();
    if (!rawUrl) continue;
    try {
      const parsed = new URL(rawUrl);
      if (parsed.pathname && parsed.pathname !== '/') {
        return parsed.pathname;
      }
    } catch {
      if (rawUrl.startsWith('/')) {
        return rawUrl;
      }
    }
  }
  return null;
}

function extractPageHint(rawData) {
  const direct = String(rawData?.page || '').trim();
  if (direct) {
    return direct;
  }

  const uiContext = String(rawData?.uiContext || '').trim();
  if (uiContext) {
    return uiContext;
  }

  return null;
}

function toPascalCase(value) {
  return String(value || '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function inferComponentHint(issue, pageHint) {
  const title = `${issue.title} ${issue.summary}`.toLowerCase();

  if (title.includes('login') || title.includes('sign in') || title.includes('auth')) {
    return 'LoginForm';
  }
  if (title.includes('signup') || title.includes('sign up') || title.includes('register')) {
    return 'SignupForm';
  }
  if (title.includes('billing') || title.includes('payment')) {
    return 'BillingForm';
  }

  if (pageHint) {
    const cleanPath = String(pageHint).replace(/^\/+|\/+$/g, '');
    const lastSegment = cleanPath.split('/').filter(Boolean).pop();
    if (lastSegment) {
      return `${toPascalCase(lastSegment)}Page`;
    }
  }

  return null;
}

function summarizeTimelinePattern(timeline, trendPercent) {
  if (!timeline.length) {
    return trendPercent > 0 ? 'issue is trending upward' : 'not enough timeline data yet';
  }

  const recent = timeline.slice(-3);
  const counts = recent.map((point) => point.count);
  const increasing = counts.every((value, index) => index === 0 || value >= counts[index - 1]);

  if (increasing && counts[counts.length - 1] > counts[0]) {
    return 'recent reports are climbing';
  }

  if (trendPercent >= 20) {
    return 'sharp increase in recent reports';
  }

  if (trendPercent <= -10) {
    return 'volume is easing';
  }

  return 'report volume is relatively stable';
}

function sumCounts(rows) {
  return (rows || []).reduce((total, row) => total + safeNumber(row?.count, 0), 0);
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + safeNumber(value, 0), 0) / values.length;
}

function normalizeSummaryIssue(input) {
  return {
    id: input?.id,
    title: String(input?.title || 'Untitled issue'),
    summary: String(input?.summary || ''),
    priority: String(input?.priority || 'LOW').toUpperCase(),
    reportCount: safeNumber(input?.reportCount ?? input?.report_count, 0),
    trendPercent: safeNumber(input?.trendPercent ?? input?.trend_percent, 0),
    createdAt: input?.createdAt || input?.created_at || null,
  };
}

function buildSignalSummary(issue, timelineRows, metricRow) {
  const timeline = normalizeTimeline(timelineRows);
  const now = Date.now();
  const hourMs = 1000 * 60 * 60;

  const lastHourRows = timeline.filter(
    (row) => now - new Date(row.date).getTime() <= hourMs
  );
  const lastThreeHourRows = timeline.filter(
    (row) => now - new Date(row.date).getTime() <= hourMs * 3
  );
  const previousThreeHourRows = timeline.filter((row) => {
    const age = now - new Date(row.date).getTime();
    return age > hourMs * 3 && age <= hourMs * 6;
  });
  const lastSixHourRows = timeline.filter(
    (row) => now - new Date(row.date).getTime() <= hourMs * 6
  );

  const timelineCounts = timeline.map((row) => safeNumber(row.count, 0));
  const baselineCandidates = timeline.slice(0, Math.max(0, timeline.length - 1));
  const baselineHourlyRate = average(
    baselineCandidates.length > 0 ? baselineCandidates.map((row) => row.count) : timelineCounts
  );
  const currentHourlyRate =
    timeline.length > 0
      ? safeNumber(timeline[timeline.length - 1].count, 0)
      : safeNumber(issue.reportCount, 0);

  return {
    issueId: issue.id,
    issueType: issue.id || issue.title,
    issueTypeLabel: issue.title,
    frequencyCount: safeNumber(metricRow?.frequency_count, issue.reportCount),
    avgResolutionTimeHours: safeNumber(metricRow?.avg_resolution_time_hours, 0),
    weeklyGrowthPercent: safeNumber(
      metricRow?.trend_growth_percent,
      issue.trendPercent
    ),
    lastHourCount: sumCounts(lastHourRows),
    lastThreeHoursCount: sumCounts(lastThreeHourRows),
    previousThreeHoursCount: sumCounts(previousThreeHourRows),
    lastSixHoursCount: sumCounts(lastSixHourRows),
    baselineHourlyRate: Number(baselineHourlyRate.toFixed(2)),
    currentHourlyRate: Number(currentHourlyRate.toFixed(2)),
  };
}

async function getIssueSignalSummary(userId, issueInput) {
  const issue =
    issueInput && typeof issueInput === 'object' && issueInput.id
      ? normalizeSummaryIssue(issueInput)
      : null;

  let resolvedIssue = issue;

  if (!resolvedIssue) {
    const issueId = String(issueInput || '').trim();
    const { data: issueRow, error: issueError } = await supabase
      .from('issues')
      .select('*')
      .eq('user_id', userId)
      .eq('id', issueId)
      .maybeSingle();

    if (issueError) {
      if (isMissingRelationError(issueError)) {
        return buildSignalSummary(
          {
            id: issueId,
            title: 'Issue',
            reportCount: 0,
            trendPercent: 0,
          },
          [],
          null
        );
      }
      throw issueError;
    }

    if (!issueRow) {
      return buildSignalSummary(
        {
          id: issueId,
          title: 'Issue',
          reportCount: 0,
          trendPercent: 0,
        },
        [],
        null
      );
    }

    resolvedIssue = normalizeSummaryIssue(issueRow);
  }

  const [{ data: timelineRows, error: timelineError }, { data: metricRow, error: metricError }] =
    await Promise.all([
      supabase
        .from('issue_timeline')
        .select('date, count')
        .eq('issue_id', resolvedIssue.id)
        .order('date', { ascending: true })
        .limit(30),
      supabase
        .from('issue_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('issue_id', resolvedIssue.id)
        .maybeSingle(),
    ]);

  if (timelineError && !isMissingRelationError(timelineError)) {
    throw timelineError;
  }

  if (metricError && !isMissingRelationError(metricError)) {
    throw metricError;
  }

  return buildSignalSummary(resolvedIssue, timelineRows || [], metricRow || null);
}

async function loadIssueSignals(userId) {
  const { data: issueRows, error: issueError } = await supabase
    .from('issues')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (issueError) {
    if (isMissingRelationError(issueError)) {
      return [];
    }
    throw issueError;
  }

  const issues = (issueRows || []).map(normalizeSummaryIssue);
  if (issues.length === 0) {
    return [];
  }

  return Promise.all(issues.map((issue) => getIssueSignalSummary(userId, issue)));
}

async function buildIssueIntelligence(userId, issueId) {
  const [{ data: issueRow, error: issueError }, { data: feedbackRows, error: feedbackError }, { data: metricRow, error: metricError }, { data: timelineRows, error: timelineError }, { data: inspectionRows, error: inspectionError }] = await Promise.all([
    supabase
      .from('issues')
      .select('*')
      .eq('user_id', userId)
      .eq('id', issueId)
      .maybeSingle(),
    supabase
      .from('issue_feedback')
      .select('text, source, sentiment, timestamp')
      .eq('issue_id', issueId)
      .order('timestamp', { ascending: false })
      .limit(8),
    supabase
      .from('issue_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('issue_id', issueId)
      .maybeSingle(),
    supabase
      .from('issue_timeline')
      .select('date, count')
      .eq('issue_id', issueId)
      .order('date', { ascending: true })
      .limit(14),
    supabase
      .from('inspection_results')
      .select('*')
      .eq('user_id', userId)
      .eq('issue_id', issueId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  if (issueError) throw issueError;
  if (!issueRow) {
    throw new Error('Issue not found.');
  }
  if (feedbackError && feedbackError.code !== '42P01') throw feedbackError;
  if (metricError && metricError.code !== '42P01') throw metricError;
  if (timelineError && timelineError.code !== '42P01') throw timelineError;
  if (inspectionError && inspectionError.code !== '42P01') throw inspectionError;

  const issue = normalizeIssueRow(issueRow);
  const timeline = normalizeTimeline(timelineRows);
  const latestInspection = inspectionRows?.[0] || null;
  const rawInspection = latestInspection?.raw_data || {};
  const pageHint = extractPageHint(rawInspection) || pickTopBreakdownKey(issue.locationBreakdown) || null;
  const apiHint = extractApiHint(rawInspection);
  const componentHint = inferComponentHint(issue, pageHint);
  const topSource = pickTopBreakdownKey(issue.sourceBreakdown);

  const feedbackSignals = (feedbackRows || [])
    .map((entry) => String(entry.text || '').trim())
    .filter(Boolean)
    .slice(0, 6);

  const issueIntelligence = {
    issue_id: issue.id,
    title: issue.title,
    summary: issue.summary || feedbackSignals[0] || 'No issue summary available yet.',
    severity: issue.priority,
    frequency: safeNumber(metricRow?.frequency_count, issue.reportCount),
    affected_area: topSource || pageHint || componentHint || 'Product experience',
    feedback_signals: feedbackSignals,
    inspection_data: {
      observed_behavior: latestInspection?.observed_behavior || null,
      logs: Array.isArray(rawInspection?.consoleErrors)
        ? rawInspection.consoleErrors.map((entry) => entry?.text).filter(Boolean).slice(0, 5)
        : [],
      failed_actions: Array.isArray(rawInspection?.networkFailures)
        ? rawInspection.networkFailures
            .map((entry) => `${entry?.method || 'REQUEST'} ${entry?.url || ''}`.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [],
      ui_context: pageHint || null,
    },
    analytics: {
      occurrence_count: issue.reportCount,
      spike_detected: issue.trendPercent >= 20,
      trend: issue.trend,
      affected_users: issue.reportCount,
      timeline_pattern: summarizeTimelinePattern(timeline, issue.trendPercent),
    },
    probable_context: {
      page: pageHint,
      api: apiHint,
      component_hint: componentHint,
    },
  };

  const descriptionParts = [
    issueIntelligence.summary,
    feedbackSignals.length ? `Feedback:\n- ${feedbackSignals.join('\n- ')}` : null,
    issueIntelligence.inspection_data.observed_behavior
      ? `Observed behavior:\n${issueIntelligence.inspection_data.observed_behavior}`
      : null,
    issueIntelligence.inspection_data.failed_actions.length
      ? `Failed actions:\n- ${issueIntelligence.inspection_data.failed_actions.join('\n- ')}`
      : null,
    issueIntelligence.analytics.timeline_pattern
      ? `Analytics:\n${issueIntelligence.analytics.timeline_pattern}`
      : null,
  ].filter(Boolean);

  return {
    issue: {
      id: issue.id,
      title: issue.title,
      summary: issue.summary || '',
      description: descriptionParts.join('\n\n'),
      priority: issue.priority,
      reportCount: issue.reportCount,
      sources: issue.sources,
      confidenceScore: issue.confidenceScore,
      severityScore: issue.severityScore,
      trendScore: issue.trendScore,
    },
    issueIntelligence,
  };
}

module.exports = {
  buildIssueIntelligence,
  getIssueSignalSummary,
  loadIssueSignals,
};
