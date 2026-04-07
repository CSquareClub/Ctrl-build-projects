const supabase = require('../lib/supabaseClient');
const { createCalendarEvent, findFreeSlot } = require('./calendarService');
const { isNoReplyAddress, sendReply } = require('./emailService');
const { createNotification } = require('./notificationService');
const { storeAgentMemory } = require('./agentMemoryService');
const {
  calculateConfidence,
  updateLearningConfidence,
} = require('./learningService');
const {
  getOutcomeGuidance,
  recordAgentOutcome,
} = require('./selfHealingService');
const { clearSignalCache } = require('./issueIntelligenceService');
const { planIssue } = require('./plannerAgentService');
const { getDailyIssueStats } = require('../controllers/timelineController');
const { findGroup } = require('../lib/issueAggregator');
const { ensureUserRecords } = require('../lib/ensureUserRecords');
const {
  addIssueComment,
  createApprovalRequest,
  logWorkspaceActivity,
  resolveWorkspaceContext,
} = require('./collaborationService');
const { publishSystemEvent } = require('./liveEventsService');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const AGENT_ID = 'product-pulse-agent-v1';
const AGENT_SENTINEL = '[Created by Agent]';
const DEFAULT_SETTINGS = {
  enabled: true,
  state: 'idle',
  lastRunAt: null,
  lastSummary: null,
};
const AGENT_MAX_FEEDBACK_ITEMS = 10;
const AGENT_MAX_ISSUES = 5;
const AGENT_MAX_ACTIONS = 20;
const AGENT_MAX_CANDIDATES = 1;
const AGENT_REPLY_LIMIT = 5;
const AGENT_STATUS_TIMEOUT_MS = 3000;
const AGENT_AI_TIMEOUT_MS = 1500;
const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'been',
  'being',
  'between',
  'could',
  'does',
  'from',
  'have',
  'here',
  'into',
  'just',
  'like',
  'more',
  'most',
  'only',
  'over',
  'please',
  'really',
  'should',
  'than',
  'that',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'through',
  'very',
  'were',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your',
]);

function withTimeout(promise, timeoutMs, fallbackFactory) {
  let timer = null;
  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise((resolve) => {
      timer = setTimeout(() => {
        resolve(typeof fallbackFactory === 'function' ? fallbackFactory() : fallbackFactory);
      }, timeoutMs);
    }),
  ]);
}

function buildAcknowledgementMessage({ senderName, userEmail, sentiment }) {
  const name = String(senderName || '').trim() || 'there';
  const signature = userEmail ? `— ${userEmail}` : '— Product Pulse';
  const normalizedSentiment = String(sentiment || 'neutral').toLowerCase();

  if (normalizedSentiment === 'negative') {
    return [
      `Hi ${name},`,
      '',
      'We’re sorry you ran into this, and we really appreciate you taking the time to tell us about it.',
      '',
      'Our team has received your feedback and is reviewing the issue closely so we can work on a fix as soon as possible.',
      '',
      'If needed, we may follow up for a bit more context.',
      '',
      'Thanks again for helping us improve.',
      '',
      signature,
    ].join('\n');
  }

  if (normalizedSentiment === 'positive') {
    return [
      `Hi ${name},`,
      '',
      'Thank you for the kind feedback. We really appreciate you taking the time to share it with us.',
      '',
      'Our team has received your message, and it helps us understand what is working well for users.',
      '',
      'If there’s ever anything more you’d like to share, we’d love to hear it.',
      '',
      'Thanks again for supporting Product Pulse.',
      '',
      signature,
    ].join('\n');
  }

  return [
    `Hi ${name},`,
    '',
    'We’ve received your feedback and really appreciate you taking the time to share it.',
    '',
    'Our team is currently reviewing it, and we’ll work on resolving the issue as soon as possible.',
    '',
    'If needed, we may reach out for more details.',
    '',
    'Thanks again for helping us improve.',
    '',
    signature,
  ].join('\n');
}

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function normalizeAgentAction(row) {
  return {
    id: row.id,
    userId: row.user_id,
    agentId: row.agent_id,
    actionType: row.action_type,
    reason: row.reason,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function parseAgentDescription(value) {
  const text = String(value || '');
  const createdByAgent = text.includes(AGENT_SENTINEL);
  return {
    createdByAgent,
    description: text.replace(`\n\n${AGENT_SENTINEL}`, '').trim(),
  };
}

async function getAgentSettings(userId) {
  const { data, error } = await supabase
    .from('agent_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return { ...DEFAULT_SETTINGS };
    }
    throw error;
  }

  if (!data) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    enabled: data.autonomous_actions_enabled !== false,
    state: data.last_state || 'idle',
    lastRunAt: data.last_run_at || null,
    lastSummary: data.last_summary || null,
  };
}

async function updateAgentSettings(userId, patch) {
  const payload = {
    user_id: userId,
    autonomous_actions_enabled:
      patch.enabled === undefined ? true : Boolean(patch.enabled),
    last_state: patch.state || 'idle',
    last_run_at: patch.lastRunAt || null,
    last_summary: patch.lastSummary || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('agent_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        enabled: payload.autonomous_actions_enabled,
        state: payload.last_state,
        lastRunAt: payload.last_run_at,
        lastSummary: payload.last_summary,
      };
    }
    throw error;
  }

  const settings = {
    enabled: data?.autonomous_actions_enabled !== false,
    state: data?.last_state || payload.last_state,
    lastRunAt: data?.last_run_at || payload.last_run_at,
    lastSummary: data?.last_summary || payload.last_summary,
  };

  await publishSystemEvent({
    userId,
    type: 'agent_status',
    queueName: 'realtime',
    priority: settings.state === 'processing' ? 'high' : 'normal',
    payload: settings,
  }).catch(() => null);

  return settings;
}

async function listAgentActions(userId, limit = 25) {
  const { data, error } = await supabase
    .from('agent_actions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeAgentAction);
}

async function logAgentAction(userId, actionType, reason, metadata = {}) {
  const { data, error } = await supabase
    .from('agent_actions')
    .insert({
      user_id: userId,
      agent_id: AGENT_ID,
      action_type: actionType,
      reason,
      metadata,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        id: `temp-${Date.now()}`,
        userId,
        agentId: AGENT_ID,
        actionType,
        reason,
        metadata,
        createdAt: new Date().toISOString(),
      };
    }
    throw error;
  }

  const action = normalizeAgentAction(data);
  await publishSystemEvent({
    userId,
    type: 'agent_action',
    queueName: 'realtime',
    priority:
      actionType === 'predictive_alert' || actionType === 'ticket_created'
        ? 'high'
        : 'normal',
    payload: {
      action,
    },
  }).catch(() => null);

  try {
    await storeAgentMemory(userId, 'action', {
      actionType,
      reason,
      metadata,
    });
  } catch {
    // Memory capture must never block agent execution.
  }

  return action;
}

async function notifyAgentAction(userId, input) {
  try {
    await createNotification(userId, {
      title: input.title,
      message: input.message,
      type: input.type,
      metadata: input.metadata || {},
    });
  } catch {
    // Notifications should never block core agent actions.
  }
}

function toPriority(weight) {
  if (weight >= 8) return 'high';
  if (weight >= 5) return 'medium';
  return 'low';
}

function toSeverity(weight) {
  if (weight >= 9) return 'critical';
  if (weight >= 6) return 'high';
  if (weight >= 4) return 'medium';
  return 'low';
}

function calculateSpike(timeline) {
  if (timeline.length < 2) {
    return null;
  }

  const latest = timeline[timeline.length - 1];
  const previous = timeline.slice(0, -1);
  const avg = previous.reduce((sum, row) => sum + row.issue_count, 0) / previous.length;

  if (avg <= 0) {
    return latest.issue_count >= 3
      ? {
          date: latest.date,
          issueCount: latest.issue_count,
          previousAverage: 0,
          growthPercent: 100,
        }
      : null;
  }

  const growthPercent = Number((((latest.issue_count - avg) / avg) * 100).toFixed(1));
  if (growthPercent <= 30) {
    return null;
  }

  return {
    date: latest.date,
    issueCount: latest.issue_count,
    previousAverage: Number(avg.toFixed(1)),
    growthPercent,
  };
}

function extractRepeatedKeywords(feedbackEvents) {
  const counts = new Map();

  for (const event of feedbackEvents) {
    const text = `${event.title || ''} ${event.body || ''}`.toLowerCase();
    const tokens = text.match(/[a-z]{4,}/g) || [];

    for (const token of tokens) {
      if (STOP_WORDS.has(token)) {
        continue;
      }
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([keyword, count]) => ({ keyword, count }));
}

function buildIssueCandidate(issue, unresolvedTicketCount, repeatedKeywords, spike) {
  const group = findGroup(`${issue.title || ''} ${issue.summary || ''}`);
  const reportCount = Number(issue.report_count || 0);
  const trendPercent = Number(issue.trend_percent || 0);
  const priority = String(issue.priority || 'LOW').toUpperCase();
  const issueText = `${issue.title || ''} ${issue.summary || ''}`.toLowerCase();
  const matchingKeywords = repeatedKeywords.filter(({ keyword }) =>
    issueText.includes(keyword)
  );

  let weight = 0;
  if (priority === 'HIGH') weight += 4;
  if (priority === 'MEDIUM') weight += 2;
  if (reportCount >= 15) weight += 4;
  else if (reportCount >= 8) weight += 3;
  else if (reportCount >= 4) weight += 2;
  if (trendPercent >= 45) weight += 3;
  else if (trendPercent >= 30) weight += 2;
  else if (trendPercent >= 15) weight += 1;
  if (unresolvedTicketCount > 0) weight += 2;
  if (matchingKeywords.length > 0) weight += 1;
  if (spike && issueText.includes('login')) weight += 1;

  const severity = toSeverity(weight);
  const actionRequired =
    severity === 'critical' ||
    severity === 'high' ||
    unresolvedTicketCount > 0 ||
    reportCount >= 8 ||
    trendPercent >= 30;

  const impact = reportCount >= 15 ? 'broad' : reportCount >= 6 ? 'noticeable' : 'localized';
  const reason = [
    `${issue.title} has ${reportCount} reports`,
    trendPercent > 0 ? `and is trending ${trendPercent}%` : null,
    unresolvedTicketCount > 0
      ? `with ${unresolvedTicketCount} unresolved ticket${unresolvedTicketCount === 1 ? '' : 's'}`
      : null,
    matchingKeywords[0] ? `while "${matchingKeywords[0].keyword}" keeps repeating in feedback` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    issue,
    group,
    issueType: group.slug,
    issueTypeLabel: group.title,
    severity,
    actionRequired,
    impact,
    userCount: reportCount,
    weight,
    repeatedKeywords: matchingKeywords,
    unresolvedTicketCount,
    reason,
  };
}

function buildFallbackRecommendation(candidate) {
  if (candidate.severity === 'critical') {
    return 'Escalate immediately, open an investigation ticket, and set a follow-up reminder for the team.';
  }

  if (candidate.severity === 'high') {
    return 'Create a triage ticket now and review fresh evidence before the next release window.';
  }

  return 'Continue monitoring this issue and keep a reminder in place until the trend stabilizes.';
}

async function getGroqReasoning(candidate, context) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      summary: buildFallbackRecommendation(candidate),
      action: candidate.actionRequired ? 'create_ticket_and_reminder' : 'monitor',
    };
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
            'Analyze this issue and suggest what action should be taken in a product system. Be concise and actionable. Return strict JSON with keys summary and action.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            issue: {
              id: candidate.issue.id,
              title: candidate.issue.title,
              summary: candidate.issue.summary,
              priority: candidate.issue.priority,
              reportCount: candidate.issue.report_count,
              trendPercent: candidate.issue.trend_percent,
            },
            trend: context.spike,
            impact: candidate.impact,
            user_count: candidate.userCount,
            repeated_keywords: candidate.repeatedKeywords,
            unresolved_ticket_count: candidate.unresolvedTicketCount,
          }),
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      summary: buildFallbackRecommendation(candidate),
      action: candidate.actionRequired ? 'create_ticket_and_reminder' : 'monitor',
    };
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return {
      summary: buildFallbackRecommendation(candidate),
      action: candidate.actionRequired ? 'create_ticket_and_reminder' : 'monitor',
    };
  }

  try {
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || buildFallbackRecommendation(candidate),
      action: parsed.action || (candidate.actionRequired ? 'create_ticket_and_reminder' : 'monitor'),
    };
  } catch {
    return {
      summary: buildFallbackRecommendation(candidate),
      action: candidate.actionRequired ? 'create_ticket_and_reminder' : 'monitor',
    };
  }
}

async function createAgentTicket(userId, candidate, reasoning) {
  const description = `${reasoning.summary}\n\n${AGENT_SENTINEL}`;
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      user_id: userId,
      title: `Investigate ${candidate.issue.title}`,
      description,
      status: 'open',
      priority: toPriority(candidate.weight),
      linked_issue_id: candidate.issue.id,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function createAgentReminder(userId, candidate, ticketId, reasoning) {
  const hoursFromNow = candidate.severity === 'critical' ? 6 : candidate.severity === 'high' ? 12 : 24;
  const remindAt = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
  const description = `${reasoning.summary}\n\n${AGENT_SENTINEL}`;

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      title: `Follow up on ${candidate.issue.title}`,
      description,
      remind_at: remindAt,
      status: 'pending',
      linked_issue_id: candidate.issue.id,
      linked_ticket_id: ticketId || null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function createAgentCalendarEvent(userId, candidate, ticketId, reasoning) {
  try {
    const preferredStart = new Date(
      Date.now() +
        (candidate.severity === 'critical' ? 2 : 6) * 60 * 60 * 1000
    );
    const slot = await findFreeSlot(userId, {
      earliestStart: preferredStart.toISOString(),
      durationMinutes: 30,
    });

    if (slot.skipped || !slot.startTime || !slot.endTime) {
      return {
        skipped: true,
        reason: slot.reason || 'No suitable calendar slot was available.',
        event: null,
      };
    }

    return createCalendarEvent(userId, {
      title: `Follow up: ${candidate.issue.title}`,
      description: [
        reasoning.summary,
        ticketId ? `Linked ticket: ${ticketId}` : null,
        `Issue reports: ${candidate.userCount}`,
        `Severity: ${candidate.severity}`,
      ]
        .filter(Boolean)
        .join('\n'),
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  } catch (error) {
    return {
      skipped: true,
      reason:
        error instanceof Error
          ? error.message
          : 'Calendar scheduling failed for this account.',
      event: null,
    };
  }
}

async function createAgentSuggestion(userId, candidate, reasoning, confidence) {
  let approvalRequest = null;
  try {
    const workspaceContext = await resolveWorkspaceContext({ id: userId }, null);
    approvalRequest = await createApprovalRequest(workspaceContext.workspace.id, {
      issueId: candidate.issue.id,
      requestedByType: 'agent',
      requestedByUserId: null,
      actionType: 'create_ticket',
      payload: {
        title: `Investigate ${candidate.issue.title}`,
        description: reasoning.summary,
        priority: toPriority(candidate.weight),
      },
      reasoning: `${reasoning.summary} ${confidence.reasoning}`.trim(),
    });
    await addIssueComment(
      workspaceContext.workspace.id,
      candidate.issue.id,
      null,
      `${reasoning.summary} Team approval is recommended before execution.`,
      { isAi: true }
    );
    await logWorkspaceActivity(workspaceContext.workspace.id, {
      actorType: 'agent',
      actionType: 'approval_requested',
      entityType: 'approval_request',
      entityId: approvalRequest.id,
      summary: `AI requested approval for ${candidate.issue.title}.`,
      metadata: {
        issueId: candidate.issue.id,
        issueType: candidate.issueType,
      },
    });
  } catch {
    approvalRequest = null;
  }

  const action = await logAgentAction(
    userId,
    'action_suggested',
    `Suggested follow-up for ${candidate.issue.title}, pending user approval.`,
    {
      issueId: candidate.issue.id,
      issueType: candidate.issueType,
      severity: candidate.severity,
      confidenceScore: confidence.confidenceScore,
      confidenceLevel: confidence.confidenceLevel,
      priorityScore: confidence.priorityScore ?? null,
      priorityLevel: confidence.priorityLevel ?? null,
      approvalRequestId: approvalRequest?.id || null,
      why: candidate.reason,
      reasoning: reasoning.summary,
    }
  );

  await notifyAgentAction(userId, {
    title: `Suggestion ready for ${candidate.issue.title}`,
    message: `Confidence is ${confidence.confidenceScore}%. Review the suggested action before Product Pulse proceeds.`,
    type: 'suggestion',
    metadata: action.metadata,
  });

  return action;
}

async function sendAgentReplies(userId, feedbackRows, existingActions) {
  if (!Array.isArray(feedbackRows) || feedbackRows.length === 0) {
    return [];
  }

  const replyCandidates = feedbackRows.filter((row) => {
    const metadata = row.metadata || {};
    const senderEmail = String(metadata.senderEmail || '').trim();

    return (
      row.source === 'gmail' &&
      row.replied !== true &&
      senderEmail &&
      !isNoReplyAddress(senderEmail)
    );
  });

  if (replyCandidates.length === 0) {
    return [];
  }

  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  const actions = [];

  for (const feedback of replyCandidates) {
    const feedbackReference =
      feedback.id || feedback.unique_key || feedback.external_id || null;

    if (
      feedbackReference &&
      hasRecentAction(existingActions, 'email_reply_sent', feedbackReference)
    ) {
      continue;
    }

    const metadata = feedback.metadata || {};
    let replyResult;

    try {
      replyResult = await sendReply({
        userId,
        to: metadata.senderEmail,
        subject: `Re: ${metadata.originalSubject || feedback.title || 'Your feedback'}`,
        message: buildAcknowledgementMessage({
          senderName: metadata.senderName,
          userEmail: userRecord?.email || null,
          sentiment: feedback.sentiment,
        }),
        threadId: metadata.threadId || null,
        inReplyTo: metadata.messageIdHeader || null,
        references: metadata.messageIdHeader || null,
      });
    } catch (error) {
      actions.push(
        await logAgentAction(
          userId,
          'email_reply_skipped',
          `Could not send a reply to ${metadata.senderEmail || 'unknown sender'}.`,
          {
            issueId: feedback.id,
            feedbackEventId: feedback.id,
            senderEmail: metadata.senderEmail || null,
            reason:
              error instanceof Error ? error.message : 'Reply sending failed.',
          }
        )
      );
      continue;
    }

    if (replyResult.skipped) {
      actions.push(
        await logAgentAction(
          userId,
          'email_reply_skipped',
          `Skipped reply for ${metadata.senderEmail || 'unknown sender'}.`,
          {
            issueId: feedbackReference,
            feedbackEventId: feedback.id || null,
            feedbackUniqueKey: feedback.unique_key || null,
            senderEmail: metadata.senderEmail || null,
            reason: replyResult.reason,
          }
        )
      );
      continue;
    }

    let updateQuery = supabase.from('feedback_events').update({
      replied: true,
      metadata: {
        ...metadata,
        repliedAt: new Date().toISOString(),
        replyMessageId: replyResult.id || null,
      },
    });

    if (feedback.id) {
      updateQuery = updateQuery.eq('id', feedback.id);
    } else if (feedback.unique_key) {
      updateQuery = updateQuery.eq('unique_key', feedback.unique_key);
    } else if (feedback.source && feedback.external_id) {
      updateQuery = updateQuery
        .eq('source', feedback.source)
        .eq('external_id', feedback.external_id);
    } else {
      throw new Error('Missing feedback identifier for reply tracking.');
    }

    const { error: updateError } = await updateQuery.eq('user_id', userId);

    if (updateError) {
      throw updateError;
    }

    const action = await logAgentAction(
      userId,
      'email_reply_sent',
      `Sent an acknowledgment reply to ${metadata.senderEmail}.`,
      {
        issueId: feedbackReference,
        feedbackEventId: feedback.id || null,
        feedbackUniqueKey: feedback.unique_key || null,
        senderEmail: metadata.senderEmail || null,
        threadId: replyResult.threadId || metadata.threadId || null,
        replyMessageId: replyResult.id || null,
      }
    );
    actions.push(action);

    await notifyAgentAction(userId, {
      title: 'Reply sent by agent',
      message: `The agent acknowledged feedback from ${metadata.senderEmail}.`,
      type: 'email',
      metadata: action.metadata,
    });
  }

  return actions;
}

function hasRecentAction(actions, actionType, issueId) {
  return actions.some(
    (action) =>
      action.actionType === actionType &&
      action.metadata?.issueId === issueId &&
      Date.now() - new Date(action.createdAt).getTime() < 1000 * 60 * 60 * 18
  );
}

async function getAgentStatus(userId) {
  const [settings, actions] = await Promise.all([
    getAgentSettings(userId),
    listAgentActions(userId, 8),
  ]);

  const latestAction = actions[0] || null;
  const state = settings.enabled ? 'active' : 'idle';

  return {
    enabled: settings.enabled,
    state,
    lastRunAt: settings.lastRunAt,
    latestBanner: settings.lastSummary,
    latestAction,
    actions,
    listening: settings.enabled,
  };
}

async function updateAgentEnabled(userId, enabled) {
  return updateAgentSettings(userId, {
    enabled,
    state: enabled ? 'active' : 'idle',
    lastRunAt: new Date().toISOString(),
    lastSummary: enabled ? 'Agent is active and listening to product signals.' : 'Agent is idle.',
  });
}

async function runAgent(user, options = {}) {
  const userId = typeof user === 'string' ? user : user?.id;
  if (!userId) {
    return { enabled: false, state: 'idle', actions: [] };
  }

  if (typeof user === 'object') {
    await ensureUserRecords(user);
  }

  const currentSettings = await getAgentSettings(userId);
  if (!currentSettings.enabled) {
    return {
      enabled: false,
      state: 'idle',
      actions: [],
      banner: 'Autonomous actions are disabled.',
    };
  }

  await updateAgentSettings(userId, {
    enabled: true,
    state: 'processing',
    lastRunAt: new Date().toISOString(),
    lastSummary: 'Agent is reviewing fresh feedback...',
  });
  clearSignalCache(userId);

  try {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
    const [
      { data: feedbackEvents, error: feedbackError },
      { data: issues, error: issuesError },
      { data: unresolvedTickets, error: ticketsError },
      { data: pendingReminders, error: remindersError },
      timeline,
      existingActions,
    ] = await withTimeout(Promise.all([
      supabase
        .from('feedback_events')
        .select('id, title, body, source, occurred_at, sentiment, metadata, replied')
        .eq('user_id', userId)
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(AGENT_MAX_FEEDBACK_ITEMS),
      supabase
        .from('issues')
        .select('*')
        .eq('user_id', userId)
        .order('report_count', { ascending: false })
        .limit(AGENT_MAX_ISSUES),
      supabase
        .from('tickets')
        .select('id, title, description, status, priority, linked_issue_id, created_at, updated_at')
        .eq('user_id', userId)
        .neq('status', 'resolved'),
      supabase
        .from('reminders')
        .select('id, title, description, status, linked_issue_id, linked_ticket_id, remind_at')
        .eq('user_id', userId)
        .eq('status', 'pending'),
      getDailyIssueStats(userId),
      listAgentActions(userId, AGENT_MAX_ACTIONS),
    ]), AGENT_STATUS_TIMEOUT_MS, [
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      [],
      [],
    ]);

    if (feedbackError && !isMissingRelationError(feedbackError)) throw feedbackError;
    if (issuesError && !isMissingRelationError(issuesError)) throw issuesError;
    if (ticketsError && !isMissingRelationError(ticketsError)) throw ticketsError;
    if (remindersError && !isMissingRelationError(remindersError)) throw remindersError;

    const feedback = (feedbackEvents || []).slice(0, AGENT_MAX_FEEDBACK_ITEMS);
    const issueRows = issues || [];
    const openTickets = unresolvedTickets || [];
    const reminders = pendingReminders || [];
    const repeatedKeywords = extractRepeatedKeywords(feedback);
    const spike = calculateSpike(timeline || []);
    const candidates = issueRows
      .map((issue) => {
        const unresolvedTicketCount = openTickets.filter(
          (ticket) => ticket.linked_issue_id === issue.id
        ).length;
        return buildIssueCandidate(issue, unresolvedTicketCount, repeatedKeywords, spike);
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, AGENT_MAX_CANDIDATES);

    const newActions = await withTimeout(sendAgentReplies(
      userId,
      Array.isArray(options.newFeedbackRows) ? options.newFeedbackRows.slice(0, AGENT_REPLY_LIMIT) : [],
      existingActions
    ), AGENT_AI_TIMEOUT_MS, []);

    if (spike && !hasRecentAction(existingActions, 'spike_detected', 'timeline-spike')) {
      const action = await logAgentAction(
        userId,
        'spike_detected',
        `Issue volume increased by ${spike.growthPercent}% on ${spike.date}.`,
        {
          issueId: 'timeline-spike',
          date: spike.date,
          issueCount: spike.issueCount,
          previousAverage: spike.previousAverage,
          growthPercent: spike.growthPercent,
        }
      );
      newActions.push(action);
      await notifyAgentAction(userId, {
        title: '🚨 Issue spike detected',
        message: `Issue volume increased by ${spike.growthPercent}% on ${spike.date}. The agent is monitoring for follow-up action.`,
        type: 'spike',
        metadata: action.metadata,
      });
    }

    for (const candidate of candidates) {
      const reasoning = await withTimeout(
        getGroqReasoning(candidate, { spike }),
        AGENT_AI_TIMEOUT_MS,
        () => ({
          summary: buildFallbackRecommendation(candidate),
          action: candidate.actionRequired ? 'create_ticket_and_reminder' : 'monitor',
        })
      );
      const confidence = await withTimeout(calculateConfidence(userId, candidate.issue, {
        frequencyCount: candidate.userCount,
        sourceCount: Array.isArray(candidate.issue.sources)
          ? candidate.issue.sources.length
          : 0,
        repeatedKeywords: candidate.repeatedKeywords,
      }), AGENT_AI_TIMEOUT_MS, () => ({
        issueType: candidate.issueType,
        issueTypeLabel: candidate.issueTypeLabel,
        confidenceScore: candidate.severity === 'critical' ? 90 : candidate.severity === 'high' ? 78 : 64,
        confidenceLevel: candidate.severity === 'critical' ? 'high' : 'medium',
        reasoning: 'Fallback confidence based on issue severity and report volume.',
      }));
      await withTimeout(updateLearningConfidence(
        userId,
        confidence.issueType,
        confidence.confidenceScore / 100
      ), 500, null);
      const decision = await withTimeout(
        planIssue(userId, candidate.issue, confidence),
        AGENT_AI_TIMEOUT_MS,
        () => ({
          priority: candidate.severity === 'critical' ? 'critical' : candidate.severity === 'high' ? 'high' : 'medium',
          priorityScore: candidate.weight * 10,
          executionMode: candidate.actionRequired ? 'auto' : 'observe',
          reasoning: 'Fallback planner decision based on deterministic issue scoring.',
          confidence,
          anomaly: { spike_detected: false, spike_level: 'none' },
          trend: { trend_growth_percent: Number(candidate.issue.trend_percent || 0) },
          prediction: { escalating: false, prediction: '' },
          churn: { affectedUsers: 0, highestRiskScore: 0, highestRiskLevel: 'safe' },
          actions: candidate.actionRequired ? ['create_ticket', 'schedule_reminder'] : ['monitor'],
        })
      );
      const ticketGuidance = await withTimeout(getOutcomeGuidance(userId, {
        issueType: confidence.issueType,
        actionType: 'create_ticket',
        confidence: confidence.confidenceScore / 100,
      }), 700, () => ({ shouldSuppress: false, summary: 'Fallback guidance allowed ticket creation.' }));
      const reminderGuidance = await withTimeout(getOutcomeGuidance(userId, {
        issueType: confidence.issueType,
        actionType: 'schedule_reminder',
        confidence: confidence.confidenceScore / 100,
      }), 700, () => ({ shouldSuppress: false, summary: 'Fallback guidance allowed reminder scheduling.' }));
      const suggestionGuidance = await withTimeout(getOutcomeGuidance(userId, {
        issueType: confidence.issueType,
        actionType: 'suggest_fix',
        confidence: confidence.confidenceScore / 100,
      }), 700, () => ({ shouldSuppress: false, summary: 'Fallback guidance allowed suggestion flow.' }));
      const openTicketForIssue = openTickets.find(
        (ticket) => ticket.linked_issue_id === candidate.issue.id
      );
      const hasOpenTicket = Boolean(openTicketForIssue);
      const hasPendingReminder = reminders.some(
        (reminder) => reminder.linked_issue_id === candidate.issue.id
      );

      if (!hasRecentAction(existingActions, 'issue_detected', candidate.issue.id)) {
        newActions.push(
          await logAgentAction(userId, 'issue_detected', candidate.reason, {
            issueId: candidate.issue.id,
            issueType: confidence.issueType,
            title: candidate.issue.title,
            severity: candidate.severity,
            userCount: candidate.userCount,
            trendPercent: candidate.issue.trend_percent || 0,
            priorityScore: decision.priorityScore,
            priorityLevel: decision.priority,
            confidenceScore: confidence.confidenceScore,
            confidenceLevel: confidence.confidenceLevel,
            confidenceReasoning: confidence.reasoning,
            plannerReasoning: decision.reasoning,
            executionMode: decision.executionMode,
            why: candidate.reason,
            reasoning: reasoning.summary,
          })
        );
      }

      if (decision.anomaly.spike_detected) {
        const anomalyActionId = `${candidate.issue.id}:anomaly`;
        if (!hasRecentAction(existingActions, 'spike_detected', anomalyActionId)) {
          newActions.push(
            await logAgentAction(
              userId,
              'spike_detected',
              `${candidate.issue.title} is showing a ${decision.anomaly.spike_level} anomaly spike.`,
              {
                issueId: anomalyActionId,
                linkedIssueId: candidate.issue.id,
                issueType: confidence.issueType,
                spikeLevel: decision.anomaly.spike_level,
                spikeRatio: decision.anomaly.spike_ratio,
                currentHourlyRate: decision.anomaly.current_hourly_rate,
                baselineHourlyRate: decision.anomaly.baseline_hourly_rate,
              }
            )
          );
        }
      }

      if (decision.executionMode === 'observe') {
        if (!hasRecentAction(existingActions, 'insight_only', candidate.issue.id)) {
          newActions.push(
            await logAgentAction(
              userId,
              'insight_only',
              `Recorded insight for ${candidate.issue.title} without taking automatic action.`,
              {
                issueId: candidate.issue.id,
                issueType: confidence.issueType,
                confidenceScore: confidence.confidenceScore,
                confidenceLevel: confidence.confidenceLevel,
                confidenceReasoning: confidence.reasoning,
                priorityScore: decision.priorityScore,
                priorityLevel: decision.priority,
                plannerReasoning: decision.reasoning,
                why: candidate.reason,
                reasoning: reasoning.summary,
              }
            )
          );
        }
        continue;
      }

      if (decision.executionMode === 'suggest') {
        if (suggestionGuidance.shouldSuppress) {
          newActions.push(
            await logAgentAction(
              userId,
              'action_suppressed',
              `Suppressed suggestion flow for ${candidate.issue.title} due to poor past outcomes.`,
              {
                issueId: candidate.issue.id,
                issueType: confidence.issueType,
                actionType: 'suggest_fix',
                confidenceScore: confidence.confidenceScore,
                confidenceLevel: confidence.confidenceLevel,
                selfHealing: suggestionGuidance,
              }
            )
          );
          await recordAgentOutcome(userId, {
            issueId: candidate.issue.id,
            issueType: confidence.issueType,
            actionType: 'suggest_fix',
            confidence: confidence.confidenceScore / 100,
            outcome: 'suppressed',
            metadata: {
              reason: suggestionGuidance.summary,
            },
          });
          continue;
        }

        if (!hasRecentAction(existingActions, 'action_suggested', candidate.issue.id)) {
          newActions.push(
            await createAgentSuggestion(
              userId,
              candidate,
              {
                ...reasoning,
                summary: `${reasoning.summary} ${decision.reasoning}`.trim(),
              },
              {
                ...confidence,
                priorityScore: decision.priorityScore,
                priorityLevel: decision.priority,
              }
            )
          );
        }
        continue;
      }

      if (
        decision.prediction.escalating &&
        !hasRecentAction(existingActions, 'predictive_alert', candidate.issue.id)
      ) {
        const alertAction = await logAgentAction(
          userId,
          'predictive_alert',
          decision.prediction.prediction,
          {
            issueId: candidate.issue.id,
            issueType: confidence.issueType,
            priorityScore: decision.priorityScore,
            priorityLevel: decision.priority,
            confidenceScore: confidence.confidenceScore,
            confidenceLevel: confidence.confidenceLevel,
            anomaly: decision.anomaly,
            trend: decision.trend,
            prediction: decision.prediction,
          }
        );
        newActions.push(alertAction);
        await notifyAgentAction(userId, {
          title: `${candidate.issue.title} is escalating`,
          message: decision.prediction.prediction,
          type: 'prediction',
          metadata: alertAction.metadata,
        });
      }

      let createdTicket = null;
      if (ticketGuidance.shouldSuppress) {
        newActions.push(
          await logAgentAction(
            userId,
            'action_suppressed',
            `Suppressed automatic ticket creation for ${candidate.issue.title}.`,
            {
              issueId: candidate.issue.id,
              issueType: confidence.issueType,
              actionType: 'create_ticket',
              confidenceScore: confidence.confidenceScore,
              confidenceLevel: confidence.confidenceLevel,
              selfHealing: ticketGuidance,
            }
          )
        );
        await recordAgentOutcome(userId, {
          issueId: candidate.issue.id,
          issueType: confidence.issueType,
          actionType: 'create_ticket',
          confidence: confidence.confidenceScore / 100,
          outcome: 'suppressed',
          metadata: {
            reason: ticketGuidance.summary,
          },
        });
      } else if (!hasOpenTicket && !hasRecentAction(existingActions, 'ticket_created', candidate.issue.id)) {
        createdTicket = await createAgentTicket(userId, candidate, reasoning);
        const action = await logAgentAction(
          userId,
          'ticket_created',
          `Created a ticket for ${candidate.issue.title}.`,
          {
            issueId: candidate.issue.id,
            issueType: confidence.issueType,
            ticketId: createdTicket.id,
            severity: candidate.severity,
            confidenceScore: confidence.confidenceScore,
            confidenceLevel: confidence.confidenceLevel,
            confidenceReasoning: confidence.reasoning,
            why: candidate.reason,
            reasoning: reasoning.summary,
          }
        );
        newActions.push(action);
        await notifyAgentAction(userId, {
          title: `🎟 Ticket created for ${candidate.issue.title}`,
          message: `${candidate.userCount} reports are linked to this issue. A ticket has been created automatically.`,
          type: 'ticket',
          metadata: action.metadata,
        });
        await recordAgentOutcome(userId, {
          issueId: candidate.issue.id,
          issueType: confidence.issueType,
          actionType: 'create_ticket',
          confidence: confidence.confidenceScore / 100,
          outcome: 'success',
          metadata: {
            ticketId: createdTicket.id,
          },
        });
      }

      if (reminderGuidance.shouldSuppress) {
        newActions.push(
          await logAgentAction(
            userId,
            'action_suppressed',
            `Suppressed automatic reminder scheduling for ${candidate.issue.title}.`,
            {
              issueId: candidate.issue.id,
              issueType: confidence.issueType,
              actionType: 'schedule_reminder',
              confidenceScore: confidence.confidenceScore,
              confidenceLevel: confidence.confidenceLevel,
              selfHealing: reminderGuidance,
            }
          )
        );
        await recordAgentOutcome(userId, {
          issueId: candidate.issue.id,
          issueType: confidence.issueType,
          actionType: 'schedule_reminder',
          confidence: confidence.confidenceScore / 100,
          outcome: 'suppressed',
          metadata: {
            reason: reminderGuidance.summary,
          },
        });
      } else if (
        !hasPendingReminder &&
        !hasRecentAction(existingActions, 'reminder_created', candidate.issue.id)
      ) {
        const reminder = await createAgentReminder(
          userId,
          candidate,
          createdTicket?.id || openTicketForIssue?.id || null,
          reasoning
        );
        const action = await logAgentAction(
          userId,
          'reminder_created',
          `Scheduled a follow-up reminder for ${candidate.issue.title}.`,
          {
            issueId: candidate.issue.id,
            issueType: confidence.issueType,
            ticketId: createdTicket?.id || openTicketForIssue?.id || null,
            reminderId: reminder.id,
            severity: candidate.severity,
            confidenceScore: confidence.confidenceScore,
            confidenceLevel: confidence.confidenceLevel,
            confidenceReasoning: confidence.reasoning,
            why: candidate.reason,
            reasoning: reasoning.summary,
          }
        );
        newActions.push(action);
        await notifyAgentAction(userId, {
          title: `⏰ Reminder scheduled for ${candidate.issue.title}`,
          message: `A follow-up reminder has been scheduled automatically so this issue is not missed.`,
          type: 'reminder',
          metadata: action.metadata,
        });
        await recordAgentOutcome(userId, {
          issueId: candidate.issue.id,
          issueType: confidence.issueType,
          actionType: 'schedule_reminder',
          confidence: confidence.confidenceScore / 100,
          outcome: 'success',
          metadata: {
            reminderId: reminder.id,
          },
        });
      }

      if (
        (candidate.severity === 'high' || candidate.severity === 'critical') &&
        !hasRecentAction(existingActions, 'calendar_event_created', candidate.issue.id) &&
        !hasRecentAction(existingActions, 'calendar_event_skipped', candidate.issue.id)
      ) {
        const calendarResult = await createAgentCalendarEvent(
          userId,
          candidate,
          createdTicket?.id || openTicketForIssue?.id || null,
          reasoning
        );

        if (calendarResult.skipped) {
          newActions.push(
            await logAgentAction(
              userId,
              'calendar_event_skipped',
              `Skipped calendar event for ${candidate.issue.title}.`,
              {
                issueId: candidate.issue.id,
                issueType: confidence.issueType,
                ticketId: createdTicket?.id || openTicketForIssue?.id || null,
                severity: candidate.severity,
                confidenceScore: confidence.confidenceScore,
                confidenceLevel: confidence.confidenceLevel,
                why: candidate.reason,
                reason: calendarResult.reason,
              }
            )
          );
        } else {
          newActions.push(
            await logAgentAction(
              userId,
              'calendar_event_created',
              `Scheduled a calendar follow-up for ${candidate.issue.title}.`,
              {
                issueId: candidate.issue.id,
                issueType: confidence.issueType,
                ticketId: createdTicket?.id || openTicketForIssue?.id || null,
                severity: candidate.severity,
                confidenceScore: confidence.confidenceScore,
                confidenceLevel: confidence.confidenceLevel,
                why: candidate.reason,
                eventId: calendarResult.event?.id || null,
                eventLink: calendarResult.event?.htmlLink || null,
              }
            )
          );
        }
      }
    }

    const highlightAction =
      newActions.find((action) => action.actionType === 'ticket_created') ||
      newActions.find((action) => action.actionType === 'predictive_alert') ||
      newActions.find((action) => action.actionType === 'reminder_created') ||
      newActions[0];

    const latestSummary =
      highlightAction?.reason ||
      (candidates[0]
        ? `Agent is monitoring ${candidates[0].issue.title} after a fresh signal change.`
        : 'Agent is active and listening to feedback.');

    await updateAgentSettings(userId, {
      enabled: true,
      state: 'active',
      lastRunAt: new Date().toISOString(),
      lastSummary: latestSummary,
    });

    return {
      enabled: true,
      state: 'active',
      actions: newActions,
      banner: latestSummary,
    };
  } catch (error) {
    await updateAgentSettings(userId, {
      enabled: currentSettings.enabled,
      state: 'idle',
      lastRunAt: new Date().toISOString(),
      lastSummary: 'Agent is idle after a processing error.',
    });
    throw error;
  }
}

module.exports = {
  AGENT_ID,
  AGENT_SENTINEL,
  getAgentSettings,
  getAgentStatus,
  listAgentActions,
  parseAgentDescription,
  runAgent,
  updateAgentEnabled,
};
