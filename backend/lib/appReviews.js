const APPLE_REVIEWS_URL = (appId, country = 'us') =>
  `https://itunes.apple.com/rss/customerreviews/page=1/id=${appId}/sortby=mostrecent/json?l=en&cc=${country}`;

async function fetchAppleReviews(appId, country = 'us') {
  const response = await fetch(APPLE_REVIEWS_URL(appId, country));
  const data = await response.json();

  if (!response.ok) {
    throw new Error('Failed to fetch App Store reviews.');
  }

  const entries = data?.feed?.entry ?? [];
  const reviews = entries
    .filter((entry) => entry['im:rating'] && entry.id?.label)
    .slice(0, 25)
    .map((entry) => ({
      externalId: entry.id.label,
      title: entry.title?.label || 'App review',
      body: entry.content?.label || '',
      author: entry.author?.name?.label || 'Anonymous reviewer',
      url: entry.id?.label || null,
      occurredAt: entry.updated?.label || new Date().toISOString(),
      rating: Number(entry['im:rating']?.label || 0),
      appName: entry['im:name']?.label || null,
      version: entry['im:version']?.label || null,
      country: country.toUpperCase(),
    }));

  return reviews;
}

module.exports = {
  fetchAppleReviews,
};
