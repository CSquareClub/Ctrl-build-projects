const crypto = require('crypto');
const supabase = require('../lib/supabaseClient');
const { insertFeedbackEventsDeduped } = require('../lib/feedbackDedup');
const { ensureUserRecords } = require('../lib/ensureUserRecords');
const { fetchPlayReviews, MAX_REVIEW_COUNT } = require('../services/reviewService');
const { extractLocation } = require('../services/locationService');
const { enqueueSystemEvent, EVENT_TYPES } = require('../services/eventPipelineService');
const { processClaimedFeedback } = require('../services/feedbackProcessingService');

const DEMO_DIRECT_PROCESSING = process.env.DEMO_DIRECT_PROCESSING !== 'false';

function detectReviewSentiment(rating) {
  if (rating >= 4) {
    return 'positive';
  }

  if (rating <= 2) {
    return 'negative';
  }

  return 'neutral';
}

function buildReviewsDedupeKey(userId, rows) {
  const hash = crypto
    .createHash('sha1')
    .update((rows || []).map((row) => row.unique_key || row.id || '').join('|'))
    .digest('hex')
    .slice(0, 12);

  return `feedback:reviews:${userId}:${hash}`;
}

async function fetchReviews(req, res) {
  try {
    await ensureUserRecords(req.user);

    const appId = String(req.body?.appId || '').trim();
    const count = Math.min(Number(req.body?.count || MAX_REVIEW_COUNT), MAX_REVIEW_COUNT);

    if (!appId) {
      return res.status(400).json({ error: 'appId is required.' });
    }

    const reviews = await fetchPlayReviews(appId, count);

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'No reviews available.' });
    }

    const rows = reviews
      .map((review) => ({
        user_id: req.user.id,
        source: 'app_review',
        external_id: review.externalId,
        title: review.title || 'App Review',
        body: review.body,
        author: review.author,
        url: review.url,
        occurred_at: review.occurredAt,
        sentiment: detectReviewSentiment(review.rating),
        location: extractLocation({
          source: 'app_review',
          title: review.title,
          body: review.body,
          author: review.author,
          metadata: {
            country: review.country,
          },
        }),
        metadata: {
          rating: review.rating,
          appId: review.appId,
          version: review.version,
          platform: 'google-play',
          country: review.country,
          isProductFeedback: true,
        },
      }));

    const insertResult = await insertFeedbackEventsDeduped(req.user.id, rows, {
      logLabel: 'app_review_fetch',
    });

    if (insertResult.inserted > 0 && DEMO_DIRECT_PROCESSING) {
      await processClaimedFeedback(req.user, insertResult.rows, {
        background: false,
        mode: 'sync:google-play:inline',
        skipAutoInspection: true,
      }).catch(() => null);
    }

    if (insertResult.inserted > 0 && !DEMO_DIRECT_PROCESSING) {
      await enqueueSystemEvent({
        type: EVENT_TYPES.FEEDBACK_RECEIVED,
        userId: req.user.id,
        source: 'app-reviews',
        dedupeKey: buildReviewsDedupeKey(req.user.id, insertResult.rows),
        payload: {
          uniqueKeys: insertResult.rows.map((row) => row.unique_key).filter(Boolean),
          background: true,
          mode: 'sync:google-play',
        },
        priority: 1,
      }).catch(() => null);
    }

    res.json({
      success: true,
      fetched: reviews.length,
      count: insertResult.inserted,
      duplicatesSkipped: insertResult.duplicatesSkipped,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch app reviews.';

    if (message === 'App not found.') {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
}

module.exports = {
  fetchReviews,
};
