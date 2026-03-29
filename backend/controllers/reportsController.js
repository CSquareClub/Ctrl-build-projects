const supabase = require('../lib/supabaseClient');
const { findGroup } = require('../lib/issueAggregator');
const { getDailyIssueStats } = require('./timelineController');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function safeAverage(values) {
  if (values.length === 0) {
    return null;
  }

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  );
}

function sortEntries(record) {
  return Object.entries(record || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function normalizeDateRange(endDateInput) {
  const endDate = endDateInput ? new Date(endDateInput) : new Date();
  const normalizedEnd = Number.isNaN(endDate.getTime()) ? new Date() : endDate;
  normalizedEnd.setHours(23, 59, 59, 999);

  const startDate = new Date(normalizedEnd);
  startDate.setDate(startDate.getDate() - 6);
  startDate.setHours(0, 0, 0, 0);

  return {
    startDate,
    endDate: normalizedEnd,
  };
}

async function generateWeeklyReportData(userId, endDateInput) {
  const { startDate, endDate } = normalizeDateRange(endDateInput);
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const [
    { data: feedbackEvents, error: feedbackError },
    { data: issues, error: issuesError },
    { data: tickets, error: ticketsError },
    dailyStats,
  ] = await Promise.all([
    supabase
      .from('feedback_events')
      .select('*')
      .eq('user_id', userId)
      .gte('occurred_at', startIso)
      .lte('occurred_at', endIso)
      .order('occurred_at', { ascending: true }),
    supabase
      .from('issues')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('tickets')
      .select('id, title, status, priority, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    getDailyIssueStats(userId),
  ]);

  if (feedbackError && feedbackError.code !== '42P01') {
    throw feedbackError;
  }

  if (issuesError && issuesError.code !== '42P01') {
    throw issuesError;
  }

  if (ticketsError && ticketsError.code !== '42P01') {
    throw ticketsError;
  }

  const feedback = feedbackEvents || [];
  const issueRows = issues || [];
  const ticketRows = tickets || [];
  const weeklyTimeline = dailyStats.filter(
    (row) => row.date >= startIso.slice(0, 10) && row.date <= endIso.slice(0, 10)
  );
  const totalFeedbackCount = feedback.length;
  const totalIssueCount = weeklyTimeline.reduce((sum, row) => sum + row.issue_count, 0);

  const groupedIssues = issueRows.reduce((acc, issue) => {
    const group = findGroup(`${issue.title || ''} ${issue.summary || ''}`);
    acc[group.title] = (acc[group.title] || 0) + (issue.report_count || 0);
    return acc;
  }, {});

  const groupedLocations = feedback.reduce((acc, event) => {
    const country = event.location?.country;
    if (!country) {
      return acc;
    }

    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});

  const resolutionHours = ticketRows
    .filter(
      (ticket) =>
        ticket.status === 'resolved' &&
        ticket.updated_at >= startIso &&
        ticket.updated_at <= endIso
    )
    .map((ticket) => {
      return (
        (new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()) /
        (1000 * 60 * 60)
      );
    })
    .filter((value) => !Number.isNaN(value) && value >= 0);

  const avgResolutionTime = safeAverage(resolutionHours);
  const unresolvedIssues = ticketRows
    .filter((ticket) => ticket.status !== 'resolved')
    .slice(0, 8)
    .map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
    }));

  const dailyAverage =
    weeklyTimeline.length > 0
      ? weeklyTimeline.reduce((sum, row) => sum + row.issue_count, 0) / weeklyTimeline.length
      : 0;
  const spikeDays = weeklyTimeline.filter(
    (row) => dailyAverage > 0 && row.issue_count > dailyAverage * 1.5
  );
  const highestSpikeDay = [...weeklyTimeline].sort(
    (a, b) => b.issue_count - a.issue_count
  )[0] || null;
  const mostReportedIssue =
    [...issueRows].sort((a, b) => (b.report_count || 0) - (a.report_count || 0))[0] || null;
  const fastestGrowingIssue =
    [...issueRows].sort((a, b) => (b.trend_percent || 0) - (a.trend_percent || 0))[0] || null;
  const topLocations = sortEntries(groupedLocations).slice(0, 3);
  const resolvedCount = ticketRows.filter(
    (ticket) =>
      ticket.status === 'resolved' &&
      ticket.updated_at >= startIso &&
      ticket.updated_at <= endIso
  ).length;
  const resolutionEfficiency =
    ticketRows.length === 0 ? null : Number(((resolvedCount / ticketRows.length) * 100).toFixed(1));

  return {
    weekStart: startIso.slice(0, 10),
    weekEnd: endIso.slice(0, 10),
    metrics: {
      total_feedback_count: totalFeedbackCount,
      total_issue_count: totalIssueCount,
      avg_resolution_time: avgResolutionTime,
      unresolved_issue_count: unresolvedIssues.length,
    },
    spikes: spikeDays.map((day) => ({
      date: day.date,
      issue_count: day.issue_count,
      feedback_count: day.feedback_count,
      severity: day.severity,
    })),
    top_issues: issueRows.slice(0, 5).map((issue) => ({
      id: issue.id,
      title: issue.title,
      report_count: issue.report_count || 0,
      priority: issue.priority,
      trend_percent: issue.trend_percent || 0,
      category: findGroup(`${issue.title || ''} ${issue.summary || ''}`).title,
    })),
    locations: topLocations,
    resolution: {
      avg_resolution_time: avgResolutionTime,
      resolved_count: resolvedCount,
      unresolved_count: unresolvedIssues.length,
      resolution_efficiency: resolutionEfficiency,
      unresolved_issues: unresolvedIssues,
    },
    derived: {
      spike_days: spikeDays.map((day) => day.date),
      highest_spike_day: highestSpikeDay
        ? {
            date: highestSpikeDay.date,
            issue_count: highestSpikeDay.issue_count,
            feedback_count: highestSpikeDay.feedback_count,
          }
        : null,
      most_reported_issue: mostReportedIssue
        ? {
            id: mostReportedIssue.id,
            title: mostReportedIssue.title,
            report_count: mostReportedIssue.report_count || 0,
          }
        : null,
      fastest_growing_issue: fastestGrowingIssue
        ? {
            id: fastestGrowingIssue.id,
            title: fastestGrowingIssue.title,
            trend_percent: fastestGrowingIssue.trend_percent || 0,
          }
        : null,
      top_locations: topLocations,
      issues_by_category: sortEntries(groupedIssues),
      issues_by_location: sortEntries(groupedLocations),
    },
    timeline: weeklyTimeline,
  };
}

function buildFallbackSummary(data) {
  const summary = `In the last 7 days, Product Pulse captured ${data.metrics.total_feedback_count} feedback signals and ${data.metrics.total_issue_count} issue events. ${
    data.derived.most_reported_issue
      ? `The biggest recurring issue was "${data.derived.most_reported_issue.title}".`
      : 'No dominant issue stood out this week.'
  }`;

  const insights = [];
  if (data.derived.highest_spike_day) {
    insights.push(
      `Highest activity landed on ${data.derived.highest_spike_day.date} with ${data.derived.highest_spike_day.issue_count} issues.`
    );
  }
  if (data.derived.fastest_growing_issue) {
    insights.push(
      `"${data.derived.fastest_growing_issue.title}" is growing fastest at ${data.derived.fastest_growing_issue.trend_percent}% trend growth.`
    );
  }
  if (data.locations.length > 0) {
    insights.push(
      `Top user impact came from ${data.locations
        .map((entry) => `${entry.name} (${entry.count})`)
        .join(', ')}.`
    );
  }

  const recommendations = [];
  if (data.top_issues[0]) {
    recommendations.push(`Assign an owner to ${data.top_issues[0].title} this week.`);
  }
  if (data.spikes[0]) {
    recommendations.push(`Inspect the spike on ${data.spikes[0].date} for release or campaign triggers.`);
  }
  recommendations.push('Review unresolved tickets and close the highest-priority items first.');

  return {
    summary,
    insights: insights.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
    generation_mode: 'rules',
  };
}

async function generateGroqSummary(data) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY on the backend.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a senior product analyst. Analyze weekly product feedback and generate concise, actionable insights.',
        },
        {
          role: 'user',
          content: [
            'Here is the weekly product data:',
            JSON.stringify(data),
            'Generate strict JSON with this shape:',
            '{"summary":"string","insights":["string"],"recommendations":["string"]}',
            'Generate:',
            '1. A short summary (3–4 lines)',
            '2. Key insights (bullet points)',
            '3. Actionable recommendations (bullet points)',
            'Focus on spikes, major issues, user impact, and trends.',
            'Avoid generic statements. Be specific and data-driven.',
          ].join('\n'),
        },
      ],
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Groq weekly report request failed.');
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned an empty weekly report.');
  }

  const parsed = JSON.parse(content);

  return {
    summary: parsed.summary || '',
    insights: Array.isArray(parsed.insights) ? parsed.insights.slice(0, 6) : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.slice(0, 6)
      : [],
    generation_mode: 'ai',
  };
}

async function getWeeklyReport(req, res) {
  try {
    const data = await generateWeeklyReportData(req.user.id, req.query.endDate);
    let aiSection;

    try {
      aiSection = await generateGroqSummary(data);
    } catch {
      aiSection = buildFallbackSummary(data);
    }

    res.json({
      summary: aiSection.summary,
      insights: aiSection.insights,
      recommendations: aiSection.recommendations,
      metrics: data.metrics,
      spikes: data.spikes,
      top_issues: data.top_issues,
      locations: data.locations,
      resolution: data.resolution,
      derived: data.derived,
      timeline: data.timeline,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      generation_mode: aiSection.generation_mode,
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to generate weekly report.',
    });
  }
}

module.exports = {
  generateGroqSummary,
  generateWeeklyReportData,
  getWeeklyReport,
};
