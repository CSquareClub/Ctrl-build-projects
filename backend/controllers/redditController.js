const supabase = require('../lib/supabaseClient');
const { rebuildIssuesFromFeedback, detectSentiment } = require('../lib/issueAggregator');
const { classifyFeedbackEvents } = require('../lib/groqFeedbackClassifier');
const { extractLocation } = require('../services/locationService');
const { searchReddit, MAX_LIMIT } = require('../services/redditService');

async function fetchRedditPosts(req, res) {
  try {
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

    const externalIds = shortlistedPosts.map((post) => post.externalId);
    const { data: existingRows, error: existingError } = await supabase
      .from('feedback_events')
      .select('external_id')
      .eq('user_id', req.user.id)
      .eq('source', 'reddit')
      .in('external_id', externalIds);

    if (existingError) {
      throw existingError;
    }

    const existingIds = new Set((existingRows || []).map((row) => row.external_id));
    const rows = shortlistedPosts
      .filter((post) => !existingIds.has(post.externalId))
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
      duplicatesSkipped: shortlistedPosts.length - rows.length,
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
