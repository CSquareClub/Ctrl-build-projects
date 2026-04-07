const crypto = require('crypto');
const supabase = require('../lib/supabaseClient');
const { insertFeedbackEventsDeduped } = require('../lib/feedbackDedup');
const { ensureUserRecords } = require('../lib/ensureUserRecords');
const { detectSentiment } = require('../lib/issueAggregator');
const { classifyFeedbackEvents } = require('../lib/groqFeedbackClassifier');
const { extractLocation } = require('../services/locationService');
const { searchReddit, MAX_LIMIT } = require('../services/redditService');
const { enqueueSystemEvent, EVENT_TYPES } = require('../services/eventPipelineService');
const { processClaimedFeedback } = require('../services/feedbackProcessingService');

const DEMO_DIRECT_PROCESSING = process.env.DEMO_DIRECT_PROCESSING !== 'false';

function buildRedditDedupeKey(userId, rows) {
  const hash = crypto
    .createHash('sha1')
    .update((rows || []).map((row) => row.unique_key || row.id || '').join('|'))
    .digest('hex')
    .slice(0, 12);

  return `feedback:reddit:${userId}:${hash}`;
}

async function fetchRedditPosts(req, res) {
  try {
    await ensureUserRecords(req.user);

    const query = String(req.body?.query || '').trim();
    const count = Math.min(Number(req.body?.count || MAX_LIMIT), MAX_LIMIT);

    if (!query) {
      return res.status(400).json({ error: 'query is required.' });
    }

    const posts = await searchReddit(query, count);

    if (posts.length === 0) {
      return res.status(404).json({ error: 'No Reddit posts found for this query.' });
    }

    const candidates = posts.map((post) => ({
      externalId: post.externalId,
      title: post.title,
      body: post.body,
      snippet: post.body,
      occurredAt: post.occurredAt,
      metadata: {
        subreddit: post.subreddit,
      },
    }));

    const classifications = await classifyFeedbackEvents(candidates, {
      source: 'reddit',
      userId: req.user.id,
      query,
    });
    const classificationById = new Map(
      classifications.map((classification) => [classification.externalId, classification])
    );
    const shortlistedPosts = posts.filter(
      (post) => classificationById.get(post.externalId)?.include
    );

    if (shortlistedPosts.length === 0) {
      return res.status(404).json({
        error: 'No relevant Reddit posts matched your keywords after filtering.',
      });
    }

    const rows = shortlistedPosts
      .map((post) => {
        const classification = classificationById.get(post.externalId);
        return {
          user_id: req.user.id,
          source: 'reddit',
          external_id: post.externalId,
          title: post.title,
          body: post.body,
          author: post.author,
          url: post.url,
          occurred_at: post.occurredAt,
          sentiment:
            classification?.sentiment || detectSentiment(`${post.title} ${post.body}`),
          location: extractLocation({
            source: 'reddit',
            title: post.title,
            body: post.body,
            author: post.author,
            metadata: {
              subreddit: post.subreddit,
            },
          }),
          metadata: {
            subreddit: post.subreddit,
            query,
            classificationReason: classification?.reason || null,
            issueType: classification?.issueType || 'global',
            issueGroupSlug: classification?.issueGroupSlug || null,
            issueGroupTitle: classification?.issueGroupTitle || null,
            classificationConfidence:
              classification?.classificationConfidence == null
                ? null
                : Number(classification.classificationConfidence),
            isProductFeedback: true,
          },
        };
      });

    const insertResult = await insertFeedbackEventsDeduped(req.user.id, rows, {
      logLabel: 'reddit',
    });

    if (insertResult.inserted > 0 && DEMO_DIRECT_PROCESSING) {
      await processClaimedFeedback(req.user, insertResult.rows, {
        background: false,
        mode: 'sync:reddit:inline',
        skipAutoInspection: true,
      }).catch(() => null);
    }

    if (insertResult.inserted > 0 && !DEMO_DIRECT_PROCESSING) {
      await enqueueSystemEvent({
        type: EVENT_TYPES.FEEDBACK_RECEIVED,
        userId: req.user.id,
        source: 'reddit',
        dedupeKey: buildRedditDedupeKey(req.user.id, insertResult.rows),
        payload: {
          uniqueKeys: insertResult.rows.map((row) => row.unique_key).filter(Boolean),
          background: true,
          mode: 'sync:reddit',
        },
        priority: 1,
      }).catch(() => null);
    }

    return res.json({
      success: true,
      fetched: posts.length,
      count: insertResult.inserted,
      duplicatesSkipped: insertResult.duplicatesSkipped,
      filteredOut: posts.length - shortlistedPosts.length,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to fetch Reddit posts.',
    });
  }
}

module.exports = {
  fetchRedditPosts,
};
