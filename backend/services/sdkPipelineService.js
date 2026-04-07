const crypto = require('crypto');
const { Worker } = require('bullmq');
const supabase = require('../lib/supabaseClient');
const { getRedisConnection } = require('../lib/redis');
const { sdkEventsQueue } = require('../queues/sdkEventsQueue');
const { insertFeedbackEventsDeduped } = require('../lib/feedbackDedup');
const { extractLocation } = require('./locationService');
const { resolveUserIdFromSdkApiKey } = require('../lib/sdkAuth');
const { enqueueSystemEvent, EVENT_TYPES, getEventPipelineHealth } = require('./eventPipelineService');
const { getInspectionHealth } = require('./inspectionService');

const SDK_BEHAVIOR_SOURCE = 'sdk_event';
const SDK_BATCH_JOB_NAME = 'sdk:events:batch';
const SESSION_INSIGHTS_TABLE = 'session_insights';
const SDK_EVENT_BATCHES_TABLE = 'sdk_event_batches';
const SDK_PIPELINE_STATE_TABLE = 'sdk_pipeline_state';
const SIGNAL_THRESHOLD = 55;
const DUPLICATE_WINDOW_MS = 900;
const EVENT_RETENTION = 200;

let workerInstance = null;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeString(value, maxLength = 4000) {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maxLength) : '';
}

function normalizeUrl(value) {
  const url = sanitizeString(value, 1000);
  return url || null;
}

function normalizeTimestamp(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function pickMeaningfulPage(page, url) {
  const safePage = sanitizeString(page, 600);
  if (safePage) return safePage;
  return normalizeUrl(url) || null;
}

function summarizeBehaviorPayload(payload) {
  const signalParts = [
    payload.signals.rage_clicks ? `${payload.signals.rage_clicks} rage clicks` : null,
    payload.signals.dead_clicks ? `${payload.signals.dead_clicks} dead clicks` : null,
    payload.signals.form_struggle ? `${payload.signals.form_struggle} form struggles` : null,
    payload.signals.error_loops ? `${payload.signals.error_loops} error loops` : null,
  ].filter(Boolean);

  const headline = payload.feedback.message
    ? payload.feedback.message
    : signalParts.length
      ? signalParts.join(', ')
      : 'Behavior intelligence batch';

  return `${headline}${payload.frictionScore ? ` | friction ${payload.frictionScore}` : ''}`;
}

function normalizeEvent(event) {
  return {
    type: sanitizeString(event?.type, 80) || 'event',
    at: normalizeTimestamp(event?.at || event?.timestamp),
    target: sanitizeString(event?.target, 240) || null,
    value: sanitizeString(event?.value, 240) || null,
    x: toNumber(event?.x, 0),
    y: toNumber(event?.y, 0),
    meta: event?.meta && typeof event.meta === 'object' ? event.meta : {},
  };
}

function normalizeBehaviorPayload(body) {
  const events = Array.isArray(body?.events)
    ? body.events.slice(0, EVENT_RETENTION).map(normalizeEvent)
    : [];

  const signals = body?.signals && typeof body.signals === 'object' ? body.signals : {};
  const feedback = body?.feedback && typeof body.feedback === 'object' ? body.feedback : {};
  const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};

  return {
    projectId: sanitizeString(body?.project_id || body?.projectId, 120) || null,
    userId: sanitizeString(body?.user_id || body?.userId, 120) || null,
    sessionId: sanitizeString(body?.session_id || body?.sessionId, 180) || null,
    page: pickMeaningfulPage(body?.page, body?.url),
    url: normalizeUrl(body?.url || body?.page),
    timestamp: normalizeTimestamp(body?.timestamp),
    frictionScore: Math.max(0, Math.min(100, toNumber(body?.friction_score || body?.frictionScore, 0))),
    events,
    signals: {
      rage_clicks: toNumber(signals.rage_clicks, 0),
      dead_clicks: toNumber(signals.dead_clicks, 0),
      error_loops: toNumber(signals.error_loops, 0),
      hesitation: toNumber(signals.hesitation, 0),
      drop_off: toNumber(signals.drop_off, 0),
      form_struggle: toNumber(signals.form_struggle, 0),
      scroll_depth: toNumber(signals.scroll_depth, 0),
      fast_scroll: toNumber(signals.fast_scroll, 0),
    },
    feedback: {
      message: sanitizeString(feedback.message, 4000),
      intent: sanitizeString(feedback.intent, 200),
      severity: sanitizeString(feedback.severity, 60),
    },
    metadata,
    userAgent: sanitizeString(body?.userAgent, 600),
  };
}

function buildBatchId() {
  return `sdk_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function dedupeEvents(events) {
  const seen = new Map();
  const deduped = [];

  for (const event of events) {
    const key = [
      event.type,
      event.target || '',
      event.value || '',
      Math.round(event.x || 0),
      Math.round(event.y || 0),
    ].join('|');
    const at = new Date(event.at).getTime();
    const lastSeenAt = seen.get(key);
    if (lastSeenAt && Math.abs(at - lastSeenAt) < DUPLICATE_WINDOW_MS) {
      continue;
    }
    seen.set(key, at);
    deduped.push(event);
  }

  return deduped.slice(-EVENT_RETENTION);
}

function computeFrictionScore(signals) {
  const score =
    signals.rage_clicks * 30 +
    signals.dead_clicks * 25 +
    signals.hesitation * 20 +
    signals.drop_off * 15 +
    signals.form_struggle * 10 +
    signals.error_loops * 18;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSignalMatches(signals) {
  return [
    signals.rage_clicks > 0,
    signals.dead_clicks > 0,
    signals.error_loops > 0,
    signals.hesitation > 0,
    signals.drop_off > 0,
    signals.form_struggle > 0,
  ].filter(Boolean).length;
}

function shouldRunHeavyAnalysis(aggregate) {
  return Boolean(
    aggregate.feedback.message ||
    aggregate.frictionScore >= SIGNAL_THRESHOLD ||
    getSignalMatches(aggregate.signals) >= 2
  );
}

function buildInsightSummary(aggregate) {
  const painPoints = [];
  const suggestions = [];

  if (aggregate.signals.dead_clicks > 0) {
    painPoints.push('Dead clicks detected on high-intent UI.');
    suggestions.push('Add loading, disabled, or completion states around the affected action.');
  }
  if (aggregate.signals.form_struggle > 0) {
    painPoints.push('Users struggled in a form flow.');
    suggestions.push('Tighten validation guidance and reduce ambiguity in the form.');
  }
  if (aggregate.signals.rage_clicks > 0) {
    painPoints.push('Repeated clicking suggests the interface is not acknowledging intent.');
    suggestions.push('Add immediate visual response when the action is triggered.');
  }
  if (aggregate.signals.drop_off > 0) {
    painPoints.push('Users are leaving before completing a meaningful action.');
    suggestions.push('Clarify the first-run experience and shorten the path to value.');
  }

  return {
    summary: summarizeBehaviorPayload(aggregate),
    heavyAnalysis: shouldRunHeavyAnalysis(aggregate),
    painPoints,
    suggestions: suggestions.slice(0, 4),
    signalMatches: getSignalMatches(aggregate.signals),
  };
}

async function tableExists(table) {
  const { error } = await supabase.from(table).select('*').limit(1);
  return !error || error.code !== '42P01' ? !error : false;
}

async function safeUpsert(table, rows, onConflict) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict,
    ignoreDuplicates: false,
  });
  if (error && error.code !== '42P01') {
    throw error;
  }
}

async function safeInsert(table, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error && error.code !== '42P01') {
    throw error;
  }
}

async function safeSelect(table, queryBuilderFactory) {
  const query = queryBuilderFactory(supabase.from(table));
  const { data, error } = await query;
  if (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
  return data || [];
}

async function listLegacySdkRows(userId, limit = 250) {
  const { data, error } = await supabase
    .from('feedback_events')
    .select('id, source, title, body, url, occurred_at, metadata, unique_key')
    .eq('user_id', userId)
    .in('source', ['sdk_event', 'sdk_feedback', 'sdk_error'])
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

async function resolveSdkUser(reqOrHeaders, body = null) {
  const headers = reqOrHeaders?.headers || reqOrHeaders || {};
  const payload = body || reqOrHeaders?.body || {};
  const apiKey = String(headers['x-product-pulse-key'] || payload?.apiKey || '').trim();
  const userId = resolveUserIdFromSdkApiKey(apiKey);

  if (!userId) {
    return { error: 'Invalid SDK API key.', user: null };
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    return { error: 'SDK account not found.', user: null };
  }

  return { error: null, user };
}

async function createBatchReceipt(userId, batchId, payloads) {
  const receivedAt = new Date().toISOString();
  await safeInsert(SDK_EVENT_BATCHES_TABLE, [{
    batch_id: batchId,
    user_id: userId,
    event_count: payloads.reduce((sum, payload) => sum + payload.events.length, 0),
    session_count: new Set(payloads.map((payload) => payload.sessionId).filter(Boolean)).size,
    status: 'queued',
    received_at: receivedAt,
    metadata: {
      projectIds: [...new Set(payloads.map((payload) => payload.projectId).filter(Boolean))],
      pages: [...new Set(payloads.map((payload) => payload.page).filter(Boolean))].slice(0, 20),
    },
  }]);

  await safeUpsert(SDK_PIPELINE_STATE_TABLE, [{
    user_id: userId,
    last_received_timestamp: receivedAt,
    last_batch_id: batchId,
    updated_at: receivedAt,
  }], 'user_id');

  return receivedAt;
}

async function enqueueSdkEventBatch({ user, payloads, batchId }) {
  const normalizedPayloads = payloads.map(normalizeBehaviorPayload).filter((payload) => payload.projectId);
  if (!normalizedPayloads.length) {
    throw new Error('project_id is required.');
  }

  const nextBatchId = batchId || buildBatchId();
  const receivedAt = await createBatchReceipt(user.id, nextBatchId, normalizedPayloads);
  const queuePayload = {
    batch_id: nextBatchId,
    received_at: receivedAt,
    userId: user.id,
    events: normalizedPayloads,
  };

  if (process.env.REDIS_URL) {
    await sdkEventsQueue.add(
      SDK_BATCH_JOB_NAME,
      queuePayload,
      {
        jobId: nextBatchId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  } else {
    await processSdkBatchJob({ id: nextBatchId, name: SDK_BATCH_JOB_NAME, data: queuePayload });
  }

  return {
    batchId: nextBatchId,
    eventCount: normalizedPayloads.reduce((sum, payload) => sum + payload.events.length, 0),
    flushCount: normalizedPayloads.length,
  };
}

function buildSessionKey(payload) {
  return [payload.projectId || 'project', payload.sessionId || 'session', payload.page || 'page'].join('::');
}

function aggregatePayloads(payloads) {
  const grouped = new Map();

  for (const payload of payloads) {
    const key = buildSessionKey(payload);
    const current = grouped.get(key) || {
      projectId: payload.projectId,
      sessionId: payload.sessionId || `session-${Date.now()}`,
      userId: payload.userId || null,
      page: payload.page,
      url: payload.url,
      userAgent: payload.userAgent || null,
      firstSeenAt: payload.timestamp,
      lastSeenAt: payload.timestamp,
      events: [],
      signals: {
        rage_clicks: 0,
        dead_clicks: 0,
        error_loops: 0,
        hesitation: 0,
        drop_off: 0,
        form_struggle: 0,
        scroll_depth: 0,
        fast_scroll: 0,
      },
      feedback: {
        message: '',
        intent: '',
        severity: '',
      },
      metadata: [],
    };

    current.url = current.url || payload.url;
    current.userAgent = current.userAgent || payload.userAgent;
    current.firstSeenAt =
      new Date(payload.timestamp).getTime() < new Date(current.firstSeenAt).getTime()
        ? payload.timestamp
        : current.firstSeenAt;
    current.lastSeenAt =
      new Date(payload.timestamp).getTime() > new Date(current.lastSeenAt).getTime()
        ? payload.timestamp
        : current.lastSeenAt;
    current.events.push(...payload.events);
    current.signals.rage_clicks += payload.signals.rage_clicks;
    current.signals.dead_clicks += payload.signals.dead_clicks;
    current.signals.error_loops += payload.signals.error_loops;
    current.signals.hesitation += payload.signals.hesitation;
    current.signals.drop_off += payload.signals.drop_off;
    current.signals.form_struggle += payload.signals.form_struggle;
    current.signals.fast_scroll += payload.signals.fast_scroll;
    current.signals.scroll_depth = Math.max(current.signals.scroll_depth, payload.signals.scroll_depth);
    if (payload.feedback.message) current.feedback.message = payload.feedback.message;
    if (payload.feedback.intent) current.feedback.intent = payload.feedback.intent;
    if (payload.feedback.severity) current.feedback.severity = payload.feedback.severity;
    if (payload.metadata && Object.keys(payload.metadata).length) {
      current.metadata.push(payload.metadata);
    }
    grouped.set(key, current);
  }

  return [...grouped.values()].map((aggregate) => {
    const dedupedEvents = dedupeEvents(
      aggregate.events.sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime())
    );
    const frictionScore = computeFrictionScore(aggregate.signals);
    const insightSummary = buildInsightSummary({
      ...aggregate,
      events: dedupedEvents,
      frictionScore,
    });

    return {
      ...aggregate,
      events: dedupedEvents,
      eventCount: dedupedEvents.length,
      frictionScore,
      insights: insightSummary,
    };
  });
}

async function writeSessionInsights(userId, batchId, aggregates) {
  const rows = aggregates.map((aggregate) => ({
    user_id: userId,
    project_id: aggregate.projectId,
    session_id: aggregate.sessionId,
    page: aggregate.page,
    url: aggregate.url,
    first_seen_at: aggregate.firstSeenAt,
    last_seen_at: aggregate.lastSeenAt,
    event_count: aggregate.eventCount,
    friction_score: aggregate.frictionScore,
    signals: aggregate.signals,
    insights: aggregate.insights,
    last_batch_id: batchId,
    updated_at: new Date().toISOString(),
  }));

  await safeUpsert(SESSION_INSIGHTS_TABLE, rows, 'user_id,session_id,page');
}

async function insertDerivedFeedback(userId, batchId, aggregate) {
  const rows = [];

  if (aggregate.feedback.message) {
    rows.push({
      user_id: userId,
      source: 'sdk_feedback',
      external_id: `feedback:${batchId}:${aggregate.sessionId}:${aggregate.page || 'page'}`,
      title: `Friction feedback: ${aggregate.page || 'Unknown page'}`,
      body: aggregate.feedback.message,
      author: aggregate.userId || 'website_visitor',
      url: aggregate.url,
      occurred_at: aggregate.lastSeenAt,
      sentiment:
        String(aggregate.feedback.severity || '').toLowerCase() === 'high'
          ? 'negative'
          : 'neutral',
      location: extractLocation({
        source: 'sdk_feedback',
        title: aggregate.page || 'Friction feedback',
        body: aggregate.feedback.message,
        author: aggregate.userId || 'website_visitor',
        metadata: { url: aggregate.url },
      }),
      metadata: {
        isProductFeedback: true,
        projectId: aggregate.projectId,
        sessionId: aggregate.sessionId,
        page: aggregate.page,
        intent: aggregate.feedback.intent || null,
        severity: aggregate.feedback.severity || null,
        frictionScore: aggregate.frictionScore,
        batchId,
      },
    });
  }

  if (shouldRunHeavyAnalysis(aggregate)) {
    rows.push({
      user_id: userId,
      source: SDK_BEHAVIOR_SOURCE,
      external_id: `batch:${batchId}:${aggregate.sessionId}:${aggregate.page || 'page'}`,
      title: `Behavior intelligence: ${aggregate.page || 'Unknown page'}`,
      body: summarizeBehaviorPayload(aggregate),
      author: aggregate.userId || 'website_visitor',
      url: aggregate.url,
      occurred_at: aggregate.lastSeenAt,
      sentiment:
        aggregate.frictionScore >= 70 || aggregate.signals.dead_clicks > 0
          ? 'negative'
          : aggregate.frictionScore >= 35
            ? 'neutral'
            : 'positive',
      location: extractLocation({
        source: SDK_BEHAVIOR_SOURCE,
        title: aggregate.page || 'Behavior intelligence batch',
        body: summarizeBehaviorPayload(aggregate),
        author: aggregate.userId || 'website_visitor',
        metadata: { url: aggregate.url },
      }),
      metadata: {
        isProductFeedback: true,
        sdkMode: 'behavior_intelligence',
        projectId: aggregate.projectId,
        sessionId: aggregate.sessionId,
        page: aggregate.page,
        frictionScore: aggregate.frictionScore,
        behaviorPayload: {
          sessionId: aggregate.sessionId,
          projectId: aggregate.projectId,
          page: aggregate.page,
          url: aggregate.url,
          signals: aggregate.signals,
          events: aggregate.events,
          feedback: aggregate.feedback,
        },
        insightSummary: aggregate.insights,
        batchId,
      },
    });
  }

  if (!rows.length) {
    return { inserted: 0, rows: [] };
  }

  return insertFeedbackEventsDeduped(userId, rows, {
    logLabel: 'sdk-pipeline',
  });
}

async function markBatchStatus(batchId, patch) {
  const payload = {
    ...patch,
  };
  const { error } = await supabase
    .from(SDK_EVENT_BATCHES_TABLE)
    .update(payload)
    .eq('batch_id', batchId);

  if (error && error.code !== '42P01') {
    throw error;
  }
}

async function updatePipelineState(userId, values) {
  await safeUpsert(SDK_PIPELINE_STATE_TABLE, [{
    user_id: userId,
    ...values,
    updated_at: new Date().toISOString(),
  }], 'user_id');
}

async function processSdkBatchJob(job) {
  const startedAt = Date.now();
  const batch = job.data || {};
  const batchId = batch.batch_id || buildBatchId();
  const userId = batch.userId;
  const payloads = Array.isArray(batch.events) ? batch.events.map(normalizeBehaviorPayload) : [];

  if (!userId || !payloads.length) {
    throw new Error('SDK batch requires userId and at least one payload.');
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  if (userError || !user) {
    throw new Error('SDK batch user not found.');
  }

  const aggregates = aggregatePayloads(payloads);
  await writeSessionInsights(userId, batchId, aggregates);

  const uniqueKeys = [];
  for (const aggregate of aggregates) {
    const insertResult = await insertDerivedFeedback(userId, batchId, aggregate);
    uniqueKeys.push(...insertResult.rows.map((row) => row.unique_key).filter(Boolean));
  }

  if (uniqueKeys.length) {
    await enqueueSystemEvent({
      type: EVENT_TYPES.FEEDBACK_RECEIVED,
      userId,
      source: 'sdk',
      dedupeKey: `sdk-feedback:${userId}:${batchId}`,
      payload: {
        uniqueKeys,
        background: true,
        mode: 'sdk-batch',
        batchId,
      },
      priority: 1,
    });
  }

  const finishedAt = new Date().toISOString();
  const processingMs = Date.now() - startedAt;

  await markBatchStatus(batchId, {
    status: 'processed',
    processed_at: finishedAt,
    processing_ms: processingMs,
    insights_count: aggregates.length,
    metadata: {
      jobId: job.id || batchId,
      queueName: 'sdk-events',
      heavySessions: aggregates.filter((aggregate) => shouldRunHeavyAnalysis(aggregate)).length,
    },
  });

  await updatePipelineState(userId, {
    last_processed_timestamp: finishedAt,
    last_batch_id: batchId,
  });

  return {
    batchId,
    processed: aggregates.length,
    heavySessions: aggregates.filter((aggregate) => shouldRunHeavyAnalysis(aggregate)).length,
    processingMs,
  };
}

async function getSdkConnectedApps(userId) {
  const insights = await safeSelect(SESSION_INSIGHTS_TABLE, (query) =>
    query
      .select('url, page, last_seen_at, event_count, friction_score, signals, session_id')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
      .limit(500)
  );

  if (!insights) {
    return null;
  }

  const grouped = new Map();

  for (const row of insights) {
    const domainSource = row.url || row.page || '';
    const domain = normalizeUrl(domainSource);
    let hostname = 'Unknown domain';

    if (domain) {
      try {
        hostname = new URL(domain).hostname;
      } catch {
        hostname = domain.replace(/^https?:\/\//, '');
      }
    }

    const current = grouped.get(hostname) || {
      domain: hostname,
      status: 'connected',
      lastActivity: row.last_seen_at,
      eventsCount: 0,
      feedbackCount: 0,
      errorCount: 0,
      avgFriction: 0,
      sessions: new Set(),
      samples: 0,
    };

    current.lastActivity =
      new Date(row.last_seen_at).getTime() > new Date(current.lastActivity).getTime()
        ? row.last_seen_at
        : current.lastActivity;
    current.eventsCount += toNumber(row.event_count, 0);
    current.avgFriction += toNumber(row.friction_score, 0);
    current.samples += 1;
    const signals = row.signals || {};
    current.errorCount += toNumber(signals.error_loops, 0) + toNumber(signals.dead_clicks, 0);
    current.sessions.add(row.session_id);

    if (current.errorCount > 0 && current.avgFriction / current.samples >= 50) {
      current.status = 'warning';
    }

    grouped.set(hostname, current);
  }

  return [...grouped.values()].map((entry) => ({
    domain: entry.domain,
    status: entry.status,
    lastActivity: entry.lastActivity,
    eventsCount: entry.eventsCount,
    feedbackCount: entry.feedbackCount,
    errorCount: entry.errorCount,
    avgFriction: entry.samples ? Number((entry.avgFriction / entry.samples).toFixed(1)) : 0,
    sessionsCount: entry.sessions.size,
  }));
}

async function getSdkAnalyticsFromInsights(userId) {
  const insights = await safeSelect(SESSION_INSIGHTS_TABLE, (query) =>
    query
      .select('page, url, event_count, friction_score, signals, insights, session_id, last_seen_at')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
      .limit(500)
  );

  if (!insights) {
    return null;
  }

  const pages = [];
  const elements = [];
  const painPointMap = new Map();
  const suggestionSet = new Set();
  let clicks = 0;
  let totalFriction = 0;
  let totalScroll = 0;
  const sessions = new Set();

  for (const row of insights) {
    const signals = row.signals || {};
    const insightSummary = row.insights || {};
    sessions.add(row.session_id);
    clicks += toNumber(row.event_count, 0);
    totalFriction += toNumber(row.friction_score, 0);
    totalScroll += toNumber(signals.scroll_depth, 0);
    pages.push({
      page: row.page || row.url || 'Unknown page',
      friction: toNumber(row.friction_score, 0),
      deadClicks: toNumber(signals.dead_clicks, 0),
      rageClicks: toNumber(signals.rage_clicks, 0),
      formStruggle: toNumber(signals.form_struggle, 0),
    });

    if (toNumber(signals.dead_clicks, 0) > 0) {
      elements.push({
        target: `${row.page || row.url || 'Unknown page'} → dead clicks`,
        deadClicks: toNumber(signals.dead_clicks, 0),
        rageClicks: 0,
        totalHits: toNumber(row.event_count, 0),
      });
    }
    if (toNumber(signals.rage_clicks, 0) > 0) {
      elements.push({
        target: `${row.page || row.url || 'Unknown page'} → repeated clicking`,
        deadClicks: 0,
        rageClicks: toNumber(signals.rage_clicks, 0),
        totalHits: toNumber(row.event_count, 0),
      });
    }

    for (const point of insightSummary.painPoints || []) {
      painPointMap.set(point, (painPointMap.get(point) || 0) + 1);
    }
    for (const suggestion of insightSummary.suggestions || []) {
      suggestionSet.add(suggestion);
    }
  }

  const feedbackRows = await safeSelect('feedback_events', (query) =>
    query
      .select('id, body, url, occurred_at, metadata')
      .eq('user_id', userId)
      .eq('source', 'sdk_feedback')
      .order('occurred_at', { ascending: false })
      .limit(5)
  ) || [];

  return {
    behavior: {
      sessions: sessions.size,
      clicks,
      engagement: insights.length ? Number((totalScroll / insights.length).toFixed(1)) : 0,
      avgFriction: insights.length ? Number((totalFriction / insights.length).toFixed(1)) : 0,
    },
    frictionMap: {
      pages: pages.sort((a, b) => b.friction - a.friction).slice(0, 8),
      elements: elements
        .sort((a, b) => b.deadClicks + b.rageClicks - (a.deadClicks + a.rageClicks))
        .slice(0, 6),
    },
    painPoints: [...painPointMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count })),
    uxSuggestions: [...suggestionSet].slice(0, 4),
    feedbackHighlights: feedbackRows.map((row) => ({
      id: row.id,
      message: row.body,
      page: row.url || row.metadata?.page || null,
      createdAt: row.occurred_at,
    })),
  };
}

async function getLegacySdkConnectedApps(userId) {
  const rows = await listLegacySdkRows(userId, 500);
  const grouped = new Map();

  rows.forEach((row) => {
    const metadata = row.metadata || {};
    const payload = metadata.behaviorPayload || {};
    const domainSource = row.url || payload.url || payload.page || '';
    const domain = normalizeUrl(domainSource);
    let hostname = 'Unknown domain';

    if (domain) {
      try {
        hostname = new URL(domain).hostname;
      } catch {
        hostname = domain.replace(/^https?:\/\//, '');
      }
    }

    const current = grouped.get(hostname) || {
      domain: hostname,
      status: 'active',
      lastActivity: row.occurred_at,
      eventsCount: 0,
      feedbackCount: 0,
      errorCount: 0,
      avgFriction: 0,
      sessions: new Set(),
    };

    if (row.source === 'sdk_event') current.eventsCount += 1;
    if (row.source === 'sdk_feedback') current.feedbackCount += 1;
    if (row.source === 'sdk_error') current.errorCount += 1;
    current.lastActivity =
      new Date(row.occurred_at).getTime() > new Date(current.lastActivity).getTime()
        ? row.occurred_at
        : current.lastActivity;

    const frictionScore = toNumber(metadata.frictionScore || payload.frictionScore, 0);
    current.avgFriction += frictionScore;
    const sessionId = payload.sessionId || metadata.sessionId || null;
    if (sessionId) current.sessions.add(sessionId);
    grouped.set(hostname, current);
  });

  return [...grouped.values()].map((entry) => ({
    domain: entry.domain,
    status: entry.errorCount > entry.eventsCount ? 'warning' : 'connected',
    lastActivity: entry.lastActivity,
    eventsCount: entry.eventsCount,
    feedbackCount: entry.feedbackCount,
    errorCount: entry.errorCount,
    avgFriction: entry.eventsCount > 0 ? Number((entry.avgFriction / entry.eventsCount).toFixed(1)) : 0,
    sessionsCount: entry.sessions.size,
  }));
}

async function getLegacySdkAnalytics(userId) {
  const rows = await listLegacySdkRows(userId, 500);
  const behaviorRows = rows.filter((row) => row.source === 'sdk_event');
  const feedbackRows = rows.filter((row) => row.source === 'sdk_feedback');

  const sessions = new Set();
  let totalClicks = 0;
  let totalScrollDepth = 0;
  let totalFriction = 0;
  let engagementCount = 0;
  const pageMap = new Map();
  const elementMap = new Map();
  const suggestionSet = new Set();
  const painPointMap = new Map();

  behaviorRows.forEach((row) => {
    const metadata = row.metadata || {};
    const payload = metadata.behaviorPayload || {};
    const signals = payload.signals || {};
    const events = Array.isArray(payload.events) ? payload.events : [];
    const page = payload.page || row.url || 'Unknown page';
    const frictionScore = toNumber(payload.frictionScore || metadata.frictionScore, 0);
    const sessionId = payload.sessionId || metadata.sessionId || row.unique_key || row.id;
    sessions.add(sessionId);
    totalFriction += frictionScore;
    totalClicks += events.filter((event) => event.type === 'click').length;
    totalScrollDepth += toNumber(signals.scroll_depth, 0);
    engagementCount += 1;

    const currentPage = pageMap.get(page) || {
      page,
      friction: 0,
      samples: 0,
      deadClicks: 0,
      rageClicks: 0,
      formStruggle: 0,
    };
    currentPage.friction += frictionScore;
    currentPage.samples += 1;
    currentPage.deadClicks += toNumber(signals.dead_clicks, 0);
    currentPage.rageClicks += toNumber(signals.rage_clicks, 0);
    currentPage.formStruggle += toNumber(signals.form_struggle, 0);
    pageMap.set(page, currentPage);

    if (toNumber(signals.dead_clicks, 0) > 0) {
      painPointMap.set(`${page} → dead clicks`, (painPointMap.get(`${page} → dead clicks`) || 0) + toNumber(signals.dead_clicks, 0));
      suggestionSet.add('Improve loading states and button feedback for dead-click zones.');
    }
    if (toNumber(signals.form_struggle, 0) > 0) {
      painPointMap.set(`${page} → form struggle`, (painPointMap.get(`${page} → form struggle`) || 0) + toNumber(signals.form_struggle, 0));
      suggestionSet.add('Reduce form ambiguity and tighten validation guidance.');
    }
    if (toNumber(signals.rage_clicks, 0) > 0) {
      painPointMap.set(`${page} → repeated clicking`, (painPointMap.get(`${page} → repeated clicking`) || 0) + toNumber(signals.rage_clicks, 0));
      suggestionSet.add('Add clearer success, loading, or disabled states where users repeat clicks.');
    }

    events.forEach((event) => {
      const target = sanitizeString(event.target, 160);
      if (!target) return;
      const currentElement = elementMap.get(target) || {
        target,
        deadClicks: 0,
        rageClicks: 0,
        totalHits: 0,
      };
      currentElement.totalHits += 1;
      currentElement.deadClicks += event.type === 'dead_click' ? 1 : 0;
      currentElement.rageClicks += event.type === 'rage_click' ? 1 : 0;
      elementMap.set(target, currentElement);
    });
  });

  return {
    behavior: {
      sessions: sessions.size,
      clicks: totalClicks,
      engagement: engagementCount > 0 ? Number((totalScrollDepth / engagementCount).toFixed(1)) : 0,
      avgFriction: engagementCount > 0 ? Number((totalFriction / engagementCount).toFixed(1)) : 0,
    },
    frictionMap: {
      pages: [...pageMap.values()]
        .map((entry) => ({
          page: entry.page,
          friction: entry.samples ? Number((entry.friction / entry.samples).toFixed(1)) : 0,
          deadClicks: entry.deadClicks,
          rageClicks: entry.rageClicks,
          formStruggle: entry.formStruggle,
        }))
        .sort((a, b) => b.friction - a.friction)
        .slice(0, 8),
      elements: [...elementMap.values()]
        .sort((a, b) => b.deadClicks + b.rageClicks - (a.deadClicks + a.rageClicks))
        .slice(0, 6),
    },
    painPoints: [...painPointMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count })),
    uxSuggestions: [...suggestionSet].slice(0, 4),
    feedbackHighlights: feedbackRows.slice(0, 5).map((row) => ({
      id: row.id,
      message: row.body,
      page: row.url || row.metadata?.page || null,
      createdAt: row.occurred_at,
    })),
  };
}

async function getSystemHealth(userId = null) {
  const counts = process.env.REDIS_URL
    ? await sdkEventsQueue.bull.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
    : {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };

  const pipelineState = userId
    ? await safeSelect(SDK_PIPELINE_STATE_TABLE, (query) =>
        query
          .select('last_received_timestamp, last_processed_timestamp, last_batch_id, updated_at')
          .eq('user_id', userId)
          .limit(1)
      )
    : null;

  const recentBatches = await safeSelect(SDK_EVENT_BATCHES_TABLE, (query) =>
    query
      .select('batch_id, status, event_count, session_count, received_at, processed_at, processing_ms')
      .order('received_at', { ascending: false })
      .limit(10)
  );
  const eventPipelineHealth = await getEventPipelineHealth();
  const inspectionHealth = await getInspectionHealth();

  return {
    sdkIngestion: {
      queue: counts,
      state: pipelineState?.[0] || null,
      recentBatches: recentBatches || [],
    },
    ...eventPipelineHealth,
    ...inspectionHealth,
  };
}

function startSdkEventsWorker() {
  if (workerInstance || !process.env.REDIS_URL) {
    return workerInstance;
  }

  workerInstance = new Worker('sdk-events', processSdkBatchJob, {
    connection: getRedisConnection(),
    concurrency: 4,
  });

  workerInstance.on('completed', (job) => {
    console.log(`[sdk-events-worker] completed ${job.name} (${job.id})`);
  });

  workerInstance.on('failed', (job, error) => {
    console.error(`[sdk-events-worker] failed ${job?.name || 'unknown'} (${job?.id || 'n/a'}): ${error.message}`);
  });

  return workerInstance;
}

module.exports = {
  SDK_BATCH_JOB_NAME,
  aggregatePayloads,
  enqueueSdkEventBatch,
  getSdkAnalyticsFromInsights,
  getLegacySdkAnalytics,
  getLegacySdkConnectedApps,
  getSdkConnectedApps,
  getSystemHealth,
  normalizeBehaviorPayload,
  processSdkBatchJob,
  resolveSdkUser,
  startSdkEventsWorker,
};
