const supabase = require('../lib/supabaseClient');
const { rebuildIssuesFromFeedback } = require('../lib/issueAggregator');
const { fetchPlayReviews, MAX_REVIEW_COUNT } = require('../services/reviewService');
const { extractLocation } = require('../services/locationService');

function detectReviewSentiment(rating) {
  if (rating >= 4) {
    return 'positive';
  }

  if (rating <= 2) {
    return 'negative';
  }

  return 'neutral';
}

async function fetchReviews(req, res) {
  try {
    const appId = String(req.body?.appId || '').trim();
    const count = Math.min(Number(req.body?.count || MAX_REVIEW_COUNT), MAX_REVIEW_COUNT);

    if (!appId) {
      return res.status(400).json({ error: 'appId is required.' });
    }

    const reviews = await fetchPlayReviews(appId, count);

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'No reviews available.' });
    }

    const externalIds = reviews.map((review) => review.externalId);
    const { data: existingRows, error: existingError } = await supabase
      .from('feedback_events')
      .select('external_id')
      .eq('user_id', req.user.id)
      .eq('source', 'app_review')
      .in('external_id', externalIds);

    if (existingError) {
      throw existingError;
    }

    const existingIds = new Set((existingRows || []).map((row) => row.external_id));

    const rows = reviews
      .filter((review) => !existingIds.has(review.externalId))
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

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('feedback_events').insert(rows);

      if (insertError) {
        throw insertError;
      }

      await rebuildIssuesFromFeedback(req.user.id);
    }

    res.json({
      success: true,
      count: rows.length,
      duplicatesSkipped: reviews.length - rows.length,
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
