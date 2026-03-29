const supabase = require('../lib/supabaseClient');
const { rebuildIssuesFromFeedback, detectSentiment } = require('../lib/issueAggregator');
const { classifyFeedbackEvents } = require('../lib/groqFeedbackClassifier');
const { extractLocation } = require('../services/locationService');
const { searchSocialMentions } = require('../services/googleSearchService');

async function fetchSocialMentions(req, res) {
  try {
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

    const externalIds = shortlistedMentions.map((mention) => mention.externalId);
    const { data: existingRows, error: existingError } = await supabase
      .from('feedback_events')
      .select('external_id')
      .eq('user_id', req.user.id)
      .eq('source', 'social_search')
      .in('external_id', externalIds);

    if (existingError) {
      throw existingError;
    }

    const existingIds = new Set((existingRows || []).map((row) => row.external_id));
    const rows = shortlistedMentions
      .filter((mention) => !existingIds.has(mention.externalId))
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
            isProductFeedback: true,
          },
        };
      });

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('feedback_events').insert(rows);

      if (insertError) {
        throw insertError;
      }

      await rebuildIssuesFromFeedback(req.user.id);
    }

    return res.json({
      success: true,
      count: rows.length,
      duplicatesSkipped: shortlistedMentions.length - rows.length,
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
