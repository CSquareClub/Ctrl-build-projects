const supabase = require('../lib/supabaseClient');

function formatDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function toSeverity(issueCount) {
  if (issueCount === 0) {
    return 'green';
  }

  if (issueCount <= 5) {
    return 'yellow';
  }

  return 'red';
}

function average(values) {
  if (values.length === 0) {
    return null;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

async function getDailyIssueStats(userId) {
  const [
    { data: issues, error: issuesError },
    { data: feedbackEvents, error: feedbackError },
    { data: resolvedTickets, error: ticketsError },
  ] = await Promise.all([
    supabase
      .from('issues')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('feedback_events')
      .select('id, occurred_at')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: true }),
    supabase
      .from('tickets')
      .select('id, created_at, updated_at, status')
      .eq('user_id', userId)
      .eq('status', 'resolved')
      .order('updated_at', { ascending: true }),
  ]);

  if (issuesError && issuesError.code !== '42P01') {
    throw issuesError;
  }

  if (feedbackError && feedbackError.code !== '42P01') {
    throw feedbackError;
  }

  if (ticketsError && ticketsError.code !== '42P01') {
    throw ticketsError;
  }

  const byDay = new Map();

  for (const issue of issues || []) {
    const key = formatDateKey(issue.created_at);
    const current = byDay.get(key) || {
      date: key,
      issue_count: 0,
      feedback_count: 0,
      resolutionTimes: [],
    };
    current.issue_count += 1;
    byDay.set(key, current);
  }

  for (const feedbackEvent of feedbackEvents || []) {
    const key = formatDateKey(feedbackEvent.occurred_at);
    const current = byDay.get(key) || {
      date: key,
      issue_count: 0,
      feedback_count: 0,
      resolutionTimes: [],
    };
    current.feedback_count += 1;
    byDay.set(key, current);
  }

  for (const ticket of resolvedTickets || []) {
    const key = formatDateKey(ticket.updated_at);
    const current = byDay.get(key) || {
      date: key,
      issue_count: 0,
      feedback_count: 0,
      resolutionTimes: [],
    };
    const durationHours =
      (new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime()) /
      (1000 * 60 * 60);

    if (!Number.isNaN(durationHours) && durationHours >= 0) {
      current.resolutionTimes.push(durationHours);
    }
    byDay.set(key, current);
  }

  return Array.from(byDay.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry) => ({
      date: entry.date,
      issue_count: entry.issue_count,
      feedback_count: entry.feedback_count,
      severity: toSeverity(entry.issue_count),
      avg_resolution_time: average(entry.resolutionTimes),
    }));
}

async function getTimeline(req, res) {
  try {
    const stats = await getDailyIssueStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load timeline.',
    });
  }
}

module.exports = {
  getDailyIssueStats,
  getTimeline,
};
