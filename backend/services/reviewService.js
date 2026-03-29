const DEFAULT_REVIEW_COUNT = 50;
const MAX_REVIEW_COUNT = 50;
const PLAY_REVIEW_LOCALES = [
  { lang: 'en', country: 'us' },
  { lang: 'en', country: 'in' },
  { lang: 'en', country: 'gb' },
];

let gplayModulePromise;

async function getGooglePlayScraper() {
  if (!gplayModulePromise) {
    gplayModulePromise = import('google-play-scraper').then(
      (module) => module.default || module
    );
  }

  return gplayModulePromise;
}

function normalizeCount(count) {
  const parsed = Number(count || DEFAULT_REVIEW_COUNT);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_REVIEW_COUNT;
  }

  return Math.min(parsed, MAX_REVIEW_COUNT);
}

async function fetchPlayReviews(appId, count = DEFAULT_REVIEW_COUNT) {
  const normalizedAppId = String(appId || '').trim();

  if (!normalizedAppId) {
    throw new Error('App ID is required.');
  }

  try {
    const gplay = await getGooglePlayScraper();
    const requestedCount = normalizeCount(count);
    let collectedReviews = [];
    let selectedLocale = PLAY_REVIEW_LOCALES[0];

    for (const locale of PLAY_REVIEW_LOCALES) {
      const result = await gplay.reviews({
        appId: normalizedAppId,
        sort: gplay.sort.NEWEST,
        num: requestedCount,
        lang: locale.lang,
        country: locale.country,
      });

      const reviews = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      if (reviews.length > 0) {
        collectedReviews = reviews;
        selectedLocale = locale;
        break;
      }
    }

    return collectedReviews
      .filter((review) => review?.id && review?.text)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, requestedCount)
      .map((review) => ({
        externalId: String(review.id),
        title: review.title?.trim() || 'App Review',
        body: String(review.text || '').trim(),
        author: review.userName?.trim() || 'Anonymous reviewer',
        occurredAt: review.date
          ? new Date(review.date).toISOString()
          : new Date().toISOString(),
        rating: Number(review.score || 0),
        url: review.url || null,
        appId: normalizedAppId,
        version: review.version || null,
        country: selectedLocale.country.toUpperCase(),
      }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    const normalized = message.toLowerCase();

    if (
      normalized.includes('app not found') ||
      normalized.includes('no application was found') ||
      normalized.includes('not found')
    ) {
      throw new Error('App not found.');
    }

    throw error instanceof Error
      ? error
      : new Error('Failed to fetch Google Play reviews.');
  }
}

module.exports = {
  DEFAULT_REVIEW_COUNT,
  MAX_REVIEW_COUNT,
  fetchPlayReviews,
};
