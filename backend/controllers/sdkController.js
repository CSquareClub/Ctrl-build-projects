const crypto = require('crypto');
const supabase = require('../lib/supabaseClient');
const { rebuildIssuesFromFeedback } = require('../lib/issueAggregator');
const { extractLocation } = require('../services/locationService');
const { resolveUserIdFromSdkApiKey } = require('../lib/sdkAuth');

async function resolveSdkUser(req) {
  const apiKey = String(req.headers['x-product-pulse-key'] || req.body?.apiKey || '').trim();
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

async function insertFeedbackEvent(row) {
  const { error } = await supabase.from('feedback_events').insert(row);
  if (error) {
    throw error;
  }
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  return url || null;
}

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

    const url = normalizeUrl(req.body?.url);
    const timestamp = normalizeTimestamp(req.body?.timestamp);
    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};
    const serialized = JSON.stringify(data);

    await insertFeedbackEvent({
      user_id: user.id,
      source: 'sdk_event',
      external_id: `sdk-event-${crypto.randomUUID()}`,
      title: `Event: ${event}`,
      body: serialized.length > 4000 ? serialized.slice(0, 4000) : serialized || event,
      author: 'website_visitor',
      url,
      occurred_at: timestamp,
      sentiment: 'neutral',
      location: extractLocation({
        source: 'sdk_event',
        title: event,
        body: serialized,
        author: 'website_visitor',
        metadata: { url },
      }),
      metadata: {
        isProductFeedback: false,
        event,
        data,
        url,
        userAgent: normalizeText(req.body?.userAgent),
      },
    });

    return res.status(202).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to track event.',
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

    const url = normalizeUrl(req.body?.url);
    const timestamp = normalizeTimestamp(req.body?.timestamp);

    await insertFeedbackEvent({
      user_id: user.id,
      source: 'sdk_feedback',
      external_id: `sdk-feedback-${crypto.randomUUID()}`,
      title: 'Website feedback',
      body: message,
      author: 'website_visitor',
      url,
      occurred_at: timestamp,
      sentiment: 'neutral',
      location: extractLocation({
        source: 'sdk_feedback',
        title: 'Website feedback',
        body: message,
        author: 'website_visitor',
        metadata: { url },
      }),
      metadata: {
        isProductFeedback: true,
        url,
        userAgent: normalizeText(req.body?.userAgent),
      },
    });

    await rebuildIssuesFromFeedback(user.id);

    return res.status(201).json({ success: true });
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

    const url = normalizeUrl(req.body?.url);
    const stack = normalizeText(req.body?.stack);
    const timestamp = normalizeTimestamp(req.body?.timestamp);

    await insertFeedbackEvent({
      user_id: user.id,
      source: 'sdk_error',
      external_id: `sdk-error-${crypto.randomUUID()}`,
      title: 'Website error',
      body: stack ? `${errorMessage}\n\n${stack}` : errorMessage,
      author: 'website_runtime',
      url,
      occurred_at: timestamp,
      sentiment: 'negative',
      location: extractLocation({
        source: 'sdk_error',
        title: 'Website error',
        body: errorMessage,
        author: 'website_runtime',
        metadata: { url },
      }),
      metadata: {
        isProductFeedback: true,
        stack,
        url,
        userAgent: normalizeText(req.body?.userAgent),
      },
    });

    await rebuildIssuesFromFeedback(user.id);

    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to capture error.',
    });
  }
}

module.exports = {
  postSdkEvent,
  postSdkFeedback,
  postSdkError,
};
