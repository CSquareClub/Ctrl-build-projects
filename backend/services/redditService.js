const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 30;

function normalizeLimit(limit) {
  const parsed = Number(limit || DEFAULT_LIMIT);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function searchReddit(keyword, limit = DEFAULT_LIMIT) {
  const normalizedKeyword = cleanText(keyword);

  if (!normalizedKeyword) {
    throw new Error('query is required.');
  }

  const normalizedLimit = normalizeLimit(limit);
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    normalizedKeyword
  )}&sort=new&limit=${normalizedLimit}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ProductPulse/1.0 (social listening)',
    },
  });

  if (!response.ok) {
    throw new Error(`Reddit request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const posts = Array.isArray(payload?.data?.children) ? payload.data.children : [];

  return posts
    .map((child) => child?.data)
    .filter(Boolean)
    .map((post) => {
      const title = cleanText(post.title);
      const selftext = cleanText(post.selftext);
      const body = selftext || title;

      return {
        externalId: String(post.id || ''),
        title,
        body,
        author: cleanText(post.author) || 'reddit-user',
        occurredAt: post.created_utc
          ? new Date(Number(post.created_utc) * 1000).toISOString()
          : new Date().toISOString(),
        subreddit: cleanText(post.subreddit),
        url: post.permalink
          ? `https://www.reddit.com${post.permalink}`
          : post.url || null,
      };
    })
    .filter(
      (post) =>
        post.externalId &&
        post.body &&
        post.body.length >= 20 &&
        post.title.length > 0
    )
    .slice(0, normalizedLimit);
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  searchReddit,
};
