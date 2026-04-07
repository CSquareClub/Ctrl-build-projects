const {
  enqueueSdkEventBatch,
  getSdkAnalyticsFromInsights,
  getLegacySdkAnalytics,
  getLegacySdkConnectedApps,
  getSdkConnectedApps: getSdkConnectedAppsFromInsights,
  normalizeBehaviorPayload,
  resolveSdkUser,
} = require('../services/sdkPipelineService');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeTimestamp(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  return url || null;
}

function buildBatchEnvelope(body, overrides = {}) {
  return {
    ...body,
    ...overrides,
  };
}

async function postSdkEvent(req, res) {
  try {
    const { user, error: userError } = await resolveSdkUser(req);
    if (userError) {
      return res.status(401).json({ error: userError });
    }

    const event = normalizeText(req.body?.event);
    if (!event) {
      return res.status(400).json({ error: 'Event name is required.' });
    }

    const result = await enqueueSdkEventBatch({
      user,
      payloads: [
        buildBatchEnvelope({
          project_id: req.body?.project_id || req.body?.projectId || req.headers['x-product-pulse-key'],
          user_id: req.body?.user_id || req.body?.userId || null,
          session_id: req.body?.session_id || req.body?.sessionId || `sdk-session-${Date.now()}`,
          page: req.body?.page || req.body?.url || null,
          url: normalizeUrl(req.body?.url),
          timestamp: normalizeTimestamp(req.body?.timestamp),
          events: [
            {
              type: String(event || 'custom_event'),
              at: normalizeTimestamp(req.body?.timestamp),
              target: event,
              value: null,
              x: 0,
              y: 0,
              meta: req.body?.data && typeof req.body.data === 'object' ? req.body.data : {},
            },
          ],
          signals: {},
          metadata: {
            ingestion: 'sdk_event',
            userAgent: normalizeText(req.body?.userAgent),
          },
          userAgent: normalizeText(req.body?.userAgent),
        }),
      ],
    });

    return res.status(202).json({
      success: true,
      message: 'SDK event batch queued',
      batch_id: result.batchId,
      event_count: result.eventCount,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to track event.',
    });
  }
}

async function postSdkEvents(req, res) {
  try {
    const { user, error: userError } = await resolveSdkUser(req);
    if (userError) {
      return res.status(401).json({ error: userError });
    }

    const result = await enqueueSdkEventBatch({
      user,
      payloads: [normalizeBehaviorPayload(req.body)],
      batchId: req.body?.batch_id || req.body?.batchId || null,
    });

    return res.status(202).json({
      success: true,
      message: 'Behavior batch accepted',
      batch_id: result.batchId,
      event_count: result.eventCount,
      flush_count: result.flushCount,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to capture SDK behavior events.',
    });
  }
}

async function postSdkEventsBatch(req, res) {
  try {
    const { user, error: userError } = await resolveSdkUser(req);
    if (userError) {
      return res.status(401).json({ error: userError });
    }

    const payloads = Array.isArray(req.body?.batches)
      ? req.body.batches.map((batch) => normalizeBehaviorPayload(batch))
      : Array.isArray(req.body)
        ? req.body.map((batch) => normalizeBehaviorPayload(batch))
        : [];

    if (!payloads.length) {
      return res.status(400).json({ error: 'batches array is required.' });
    }

    const result = await enqueueSdkEventBatch({
      user,
      payloads,
      batchId: req.body?.batch_id || req.body?.batchId || null,
    });

    return res.status(202).json({
      success: true,
      message: 'SDK event batch queued',
      batch_id: result.batchId,
      event_count: result.eventCount,
      flush_count: result.flushCount,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to queue SDK event batch.',
    });
  }
}

async function postSdkFeedback(req, res) {
  try {
    const { user, error: userError } = await resolveSdkUser(req);
    if (userError) {
      return res.status(401).json({ error: userError });
    }

    const message = normalizeText(req.body?.message);
    if (!message) {
      return res.status(400).json({ error: 'Feedback message is required.' });
    }

    const result = await enqueueSdkEventBatch({
      user,
      payloads: [
        normalizeBehaviorPayload({
          project_id: req.body?.project_id || req.headers['x-product-pulse-key'],
          user_id: req.body?.user_id || null,
          session_id: req.body?.session_id || `sdk-session-${Date.now()}`,
          page: req.body?.page || req.body?.url || null,
          url: req.body?.url,
          timestamp: req.body?.timestamp,
          events: [],
          signals: {},
          feedback: {
            message,
            intent: req.body?.intent || 'feedback',
            severity: req.body?.severity || 'medium',
          },
          metadata: {
            ingestion: 'sdk_feedback',
            name: normalizeText(req.body?.name),
            email: normalizeText(req.body?.email),
          },
          userAgent: normalizeText(req.body?.userAgent),
        }),
      ],
    });

    return res.status(202).json({
      success: true,
      message: 'Feedback queued',
      batch_id: result.batchId,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to submit feedback.',
    });
  }
}

async function postSdkError(req, res) {
  try {
    const { user, error: userError } = await resolveSdkUser(req);
    if (userError) {
      return res.status(401).json({ error: userError });
    }

    const errorMessage = normalizeText(req.body?.error_message);
    if (!errorMessage) {
      return res.status(400).json({ error: 'Error message is required.' });
    }

    const result = await enqueueSdkEventBatch({
      user,
      payloads: [
        normalizeBehaviorPayload({
          project_id: req.body?.project_id || req.headers['x-product-pulse-key'],
          user_id: req.body?.user_id || null,
          session_id: req.body?.session_id || `sdk-session-${Date.now()}`,
          page: req.body?.page || req.body?.url || null,
          url: req.body?.url,
          timestamp: req.body?.timestamp,
          events: [
            {
              type: 'runtime_error',
              at: normalizeTimestamp(req.body?.timestamp),
              target: 'window.onerror',
              value: errorMessage,
              x: 0,
              y: 0,
              meta: {
                stack: normalizeText(req.body?.stack),
                filename: normalizeText(req.body?.filename),
                lineno: req.body?.lineno || null,
                colno: req.body?.colno || null,
              },
            },
          ],
          signals: {
            error_loops: 1,
          },
          metadata: {
            ingestion: 'sdk_error',
          },
          userAgent: normalizeText(req.body?.userAgent),
        }),
      ],
    });

    return res.status(202).json({
      success: true,
      message: 'Error event queued',
      batch_id: result.batchId,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to capture error.',
    });
  }
}

async function getSdkConnectedApps(req, res) {
  try {
    const apps =
      (await getSdkConnectedAppsFromInsights(req.user.id)) ||
      (await getLegacySdkConnectedApps(req.user.id));
    return res.json({
      apps: apps.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()),
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load connected apps.',
    });
  }
}

async function getSdkAnalytics(req, res) {
  try {
    const analytics = (await getSdkAnalyticsFromInsights(req.user.id)) || (await getLegacySdkAnalytics(req.user.id));
    return res.json(analytics);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to load SDK analytics.',
    });
  }
}

module.exports = {
  getSdkAnalytics,
  getSdkConnectedApps,
  postSdkEvent,
  postSdkEvents,
  postSdkEventsBatch,
  postSdkFeedback,
  postSdkError,
};
