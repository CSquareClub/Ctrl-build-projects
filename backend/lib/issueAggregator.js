const supabase = require('./supabaseClient');
const { summarizeLocations } = require('../services/locationService');

const KEYWORD_GROUPS = [
  {
    slug: 'audit-form-submission-glitch',
    title: 'Audit form submission glitch',
    matchers: [
      'audit form',
      'audit page',
      'submit button does nothing',
      'submit does nothing',
      'form is not submitting',
      'lead form is stuck',
      'request not reaching backend',
      'click submit',
    ],
    category: 'Bug',
  },
  {
    slug: 'login-auth-friction',
    title: 'Login and authentication friction',
    matchers: ['login', 'sign in', 'signin', 'auth', 'password', 'otp'],
    category: 'Problem',
  },
  {
    slug: 'billing-and-payments',
    title: 'Billing and payment friction',
    matchers: ['billing', 'invoice', 'payment', 'refund', 'subscription'],
    category: 'Problem',
  },
  {
    slug: 'onboarding-confusion',
    title: 'Onboarding confusion',
    matchers: ['onboarding', 'setup', 'started', 'start', 'confusing'],
    category: 'Problem',
  },
  {
    slug: 'performance-and-crashes',
    title: 'Performance and crash issues',
    matchers: ['crash', 'freeze', 'slow', 'lag', 'performance'],
    category: 'Bug',
  },
  {
    slug: 'feature-requests',
    title: 'Feature requests and product ideas',
    matchers: [
      'feature request',
      'would like',
      'please add',
      'can you add',
      'suggestion',
      'wish there was',
      'request',
      'it would be great if',
      'missing feature',
    ],
    category: 'Feature Request',
  },
  {
    slug: 'product-praise',
    title: 'Product love and praise',
    matchers: [
      'love',
      'great',
      'amazing',
      'awesome',
      'excellent',
      'smooth',
      'helpful',
      'fantastic',
      'perfect',
      'impressed',
      'thank you',
      'thanks',
      'works well',
      'working well',
      'easy to use',
      'super useful',
      'really like',
      'intuitive',
      'clean ui',
    ],
    category: 'Praise',
  },
];

function detectSentiment(text) {
  const negativeTerms = ['not', 'cannot', 'cant', 'issue', 'problem', 'broken', 'fail', 'crash', 'friction', 'confusing', 'terrible', 'bad', 'annoying'];
  const positiveTerms = ['love', 'great', 'nice', 'good', 'amazing', 'awesome', 'excellent', 'smooth', 'helpful', 'fantastic', 'perfect', 'impressed', 'thanks', 'thank you', 'works well', 'working well', 'easy to use', 'useful'];
  const normalized = text.toLowerCase();

  if (positiveTerms.some((term) => normalized.includes(term))) {
    return 'positive';
  }

  if (negativeTerms.some((term) => normalized.includes(term))) {
    return 'negative';
  }

  return 'neutral';
}

function findGroup(text) {
  const normalized = text.toLowerCase();
  return (
    KEYWORD_GROUPS.find((group) =>
      group.matchers.some((matcher) => normalized.includes(matcher))
    ) || {
      slug: 'customer-feedback-signals',
      title: 'General customer feedback signals',
      category: 'Problem',
    }
  );
}

function groupCategoryFromEvents(events) {
  const reportCount = events.length;
  const positiveCount = events.filter((event) => event.sentiment === 'positive').length;
  const negativeCount = events.filter((event) => event.sentiment === 'negative').length;
  const featureSignals = events.filter((event) =>
    KEYWORD_GROUPS.find((group) => group.slug === 'feature-requests').matchers.some((matcher) =>
      `${event.title || ''} ${event.body || ''}`.toLowerCase().includes(matcher)
    )
  ).length;
  const praiseSignals = events.filter((event) =>
    KEYWORD_GROUPS.find((group) => group.slug === 'product-praise').matchers.some((matcher) =>
      `${event.title || ''} ${event.body || ''}`.toLowerCase().includes(matcher)
    )
  ).length;

  if (praiseSignals >= 1 && positiveCount >= Math.max(1, negativeCount) && positiveCount / reportCount >= 0.5) {
    return KEYWORD_GROUPS.find((group) => group.slug === 'product-praise');
  }

  if (featureSignals >= 1 && featureSignals >= negativeCount) {
    return KEYWORD_GROUPS.find((group) => group.slug === 'feature-requests');
  }

  return null;
}

function summarizeGroup(events) {
  const allText = events.map((event) => `${event.title} ${event.body}`).join(' ');
  const inferredGroup = groupCategoryFromEvents(events);
  const group = inferredGroup || findGroup(allText);
  const reportCount = events.length;
  const negativeCount = events.filter((event) => event.sentiment === 'negative').length;
  const positiveCount = events.filter((event) => event.sentiment === 'positive').length;

  if (group.category === 'Praise') {
    return {
      id: group.slug,
      title: group.title,
      category: group.category,
      reportCount,
      priority: 'LOW',
      trend: reportCount >= 3 ? 'increasing' : 'stable',
      trendPercent: Math.min(28, Math.max(6, reportCount * 6)),
      summary: `Detected ${reportCount} positive feedback signals. Users are actively highlighting parts of the product that feel strong, useful, and worth keeping.`,
      suggestedActions: [
        'Capture the strongest praise examples for marketing, release notes, or founder updates.',
        'Identify which recent product change triggered this positive response.',
        'Share the praise with the team and protect the experience users already love.',
      ],
      sources: [...new Set(events.map((event) => event.source))],
      sourceBreakdown: events.reduce((acc, event) => {
        acc[event.source] = (acc[event.source] || 0) + 1;
        return acc;
      }, {}),
      locationBreakdown: summarizeLocations(events),
    };
  }

  return {
    id: group.slug,
    title: group.title,
    category: group.category,
    reportCount,
    priority:
      group.category === 'Feature Request'
        ? reportCount >= 6
          ? 'MEDIUM'
          : 'LOW'
        : negativeCount >= 6 || reportCount >= 10
        ? 'HIGH'
        : negativeCount >= 3 || reportCount >= 5
          ? 'MEDIUM'
          : 'LOW',
    trend: reportCount >= 4 || positiveCount >= 4 ? 'increasing' : 'stable',
    trendPercent: Math.min(95, Math.max(8, reportCount * (group.category === 'Feature Request' ? 6 : 8))),
    summary:
      group.category === 'Feature Request'
        ? `Detected ${reportCount} product requests. Users are consistently asking for ${group.title.toLowerCase()}.`
        : group.slug === 'customer-feedback-signals' && positiveCount > negativeCount
          ? `Detected ${reportCount} general customer feedback signals with a mostly positive tone. Users are reacting well, but the feedback is broad rather than tied to one narrow theme.`
        : `Detected ${reportCount} related feedback items. The strongest recent signal is around ${group.title.toLowerCase()}.`,
    suggestedActions:
      group.category === 'Feature Request'
        ? [
            `Review the latest ${Math.min(5, reportCount)} requests linked to ${group.title.toLowerCase()}.`,
            'Estimate product impact and decide whether this belongs in the roadmap.',
            'Close the loop with users who asked for this capability.',
          ]
        : [
            `Review the latest ${Math.min(5, reportCount)} messages linked to ${group.title.toLowerCase()}.`,
            'Confirm whether the issue is reproducible and assign an owner.',
            'Close the loop with affected users after the next product update.',
          ],
    sources: [...new Set(events.map((event) => event.source))],
    sourceBreakdown: events.reduce((acc, event) => {
      acc[event.source] = (acc[event.source] || 0) + 1;
      return acc;
    }, {}),
    locationBreakdown: summarizeLocations(events),
  };
}

async function rebuildIssuesFromFeedback(userId) {
  const { data: events, error } = await supabase
    .from('feedback_events')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return { issues: [] };
    }
    throw error;
  }

  const feedbackEvents = events ?? [];
  const productFeedbackEvents = feedbackEvents.filter((event) => {
    if (event.source === 'gmail') {
      return event.metadata?.isProductFeedback === true;
    }

    return event.metadata?.isProductFeedback !== false;
  });
  const grouped = new Map();

  for (const event of productFeedbackEvents) {
    const group = findGroup(`${event.title || ''} ${event.body || ''}`);
    const current = grouped.get(group.slug) ?? [];
    current.push({
      ...event,
      sentiment: event.sentiment || detectSentiment(`${event.title || ''} ${event.body || ''}`),
    });
    grouped.set(group.slug, current);
  }

  const issueRows = Array.from(grouped.values()).map((groupEvents) => {
    const summary = summarizeGroup(groupEvents);
    return {
      user_id: userId,
      title: summary.title,
      sources: summary.sources,
      report_count: summary.reportCount,
      priority: summary.priority,
      trend: summary.trend,
      trend_percent: summary.trendPercent,
      summary: summary.summary,
      source_breakdown: summary.sourceBreakdown,
      location_breakdown: summary.locationBreakdown,
      suggested_actions: summary.suggestedActions,
    };
  });

  await supabase.from('issue_feedback').delete().in(
    'issue_id',
    (
      await supabase.from('issues').select('id').eq('user_id', userId)
    ).data?.map((row) => row.id) ?? []
  );
  await supabase.from('issue_timeline').delete().in(
    'issue_id',
    (
      await supabase.from('issues').select('id').eq('user_id', userId)
    ).data?.map((row) => row.id) ?? []
  );
  await supabase.from('issues').delete().eq('user_id', userId);

  if (issueRows.length === 0) {
    return { issues: [] };
  }

  const { data: insertedIssues, error: insertError } = await supabase
    .from('issues')
    .insert(issueRows)
    .select('*');

  if (insertError) {
    throw insertError;
  }

  for (const issue of insertedIssues ?? []) {
    const group = findGroup(`${issue.title} ${issue.summary || ''}`);
    const relatedEvents = feedbackEvents.filter((event) => {
      if (event.source === 'gmail' && event.metadata?.isProductFeedback !== true) {
        return false;
      }

      if (event.source !== 'gmail' && event.metadata?.isProductFeedback === false) {
        return false;
      }
      const detected = findGroup(`${event.title || ''} ${event.body || ''}`);
      return detected.slug === group.slug;
    });

    if (relatedEvents.length > 0) {
      await supabase.from('issue_feedback').insert(
        relatedEvents.slice(0, 12).map((event) => ({
          issue_id: issue.id,
          text: event.body,
          source: event.source,
          author: event.author || 'Unknown',
          timestamp: event.occurred_at,
          sentiment: event.sentiment || detectSentiment(`${event.title || ''} ${event.body || ''}`),
        }))
      );

      const timelineMap = relatedEvents.reduce((acc, event) => {
        const date = new Date(event.occurred_at).toISOString().slice(0, 10);
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      await supabase.from('issue_timeline').insert(
        Object.entries(timelineMap).map(([date, count]) => ({
          issue_id: issue.id,
          date,
          count,
        }))
      );
    }
  }

  return { issues: insertedIssues ?? [] };
}

module.exports = {
  detectSentiment,
  findGroup,
  rebuildIssuesFromFeedback,
};
