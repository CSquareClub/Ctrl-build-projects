const crypto = require('crypto');
const supabase = require('../lib/supabaseClient');
const { insertFeedbackEventsDeduped } = require('../lib/feedbackDedup');
const { ensureUserRecords } = require('../lib/ensureUserRecords');
const { detectSentiment } = require('../lib/issueAggregator');
const { classifyFeedbackEvents } = require('../lib/groqFeedbackClassifier');
const { extractLocation } = require('../services/locationService');
const { searchSocialMentions } = require('../services/googleSearchService');
const { enqueueSystemEvent, EVENT_TYPES } = require('../services/eventPipelineService');
const { processClaimedFeedback } = require('../services/feedbackProcessingService');

const DEMO_DIRECT_PROCESSING = process.env.DEMO_DIRECT_PROCESSING !== 'false';

function buildSocialDedupeKey(userId, rows) {
  const hash = crypto
    .createHash('sha1')
    .update((rows || []).map((row) => row.unique_key || row.id || '').join('|'))
    .digest('hex')
    .slice(0, 12);

  return `feedback:social:${userId}:${hash}`;
}

async function fetchSocialMentions(req, res) {
  try {
    await ensureUserRecords(req.user);

    const query = String(req.body?.query || '').trim();

    if (!query) {
      return res.status(400).json({ error: 'query is required.' });
    }

    const mentions = await searchSocialMentions(query);

    if (mentions.length === 0) {
      return res.status(404).json({ error: 'No social mentions found for this query.' });
    }

    const candidates = mentions.map((mention) => ({
      externalId: mention.externalId,
      title: mention.title,
      body: mention.body,
      snippet: mention.body,
      occurredAt: mention.occurredAt,
      metadata: mention.metadata,
    }));

    const classifications = await classifyFeedbackEvents(candidates, {
      source: 'social_search',
      userId: req.user.id,
      query,
    });
    const classificationById = new Map(
      classifications.map((classification) => [classification.externalId, classification])
    );
    const shortlistedMentions = mentions.filter(
      (mention) => classificationById.get(mention.externalId)?.include
    );

    if (shortlistedMentions.length === 0) {
      return res.status(404).json({
        error: 'No relevant social mentions matched your keywords after filtering.',
      });
    }

    const rows = shortlistedMentions
      .map((mention) => {
        const classification = classificationById.get(mention.externalId);

        return {
          user_id: req.user.id,
          source: 'social_search',
          external_id: mention.externalId,
          title: mention.title,
          body: mention.body,
          author: mention.author,
          url: mention.metadata.url,
          occurred_at: mention.occurredAt,
          sentiment:
            classification?.sentiment ||
            detectSentiment(`${mention.title} ${mention.body}`),
          location: extractLocation({
            source: 'social_search',
            title: mention.title,
            body: mention.body,
            author: mention.author,
            metadata: mention.metadata,
          }),
          metadata: {
            ...mention.metadata,
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
      logLabel: 'social_search',
    });

    if (insertResult.inserted > 0 && DEMO_DIRECT_PROCESSING) {
      await processClaimedFeedback(req.user, insertResult.rows, {
        background: false,
        mode: 'sync:social:inline',
        skipAutoInspection: true,
      }).catch(() => null);
    }

    if (insertResult.inserted > 0 && !DEMO_DIRECT_PROCESSING) {
      await enqueueSystemEvent({
        type: EVENT_TYPES.FEEDBACK_RECEIVED,
        userId: req.user.id,
        source: 'social_search',
        dedupeKey: buildSocialDedupeKey(req.user.id, insertResult.rows),
        payload: {
          uniqueKeys: insertResult.rows.map((row) => row.unique_key).filter(Boolean),
          background: true,
          mode: 'sync:social',
        },
        priority: 1,
      }).catch(() => null);
    }

    return res.json({
      success: true,
      fetched: mentions.length,
      count: insertResult.inserted,
      duplicatesSkipped: insertResult.duplicatesSkipped,
      filteredOut: mentions.length - shortlistedMentions.length,
      mentions: shortlistedMentions.map((mention) => ({
        title: mention.title,
        snippet: mention.body,
        platform: mention.metadata.platform,
        link: mention.metadata.url,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch social mentions.';

    if (message.toLowerCase().includes('rate-limited')) {
      return res.status(429).json({
        error: message,
      });
    }

    return res.status(500).json({
      error: message,
    });
  }
}

module.exports = {
  fetchSocialMentions,
};
