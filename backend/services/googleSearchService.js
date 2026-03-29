const cheerio = require('cheerio');

const GOOGLE_SEARCH_URL = 'https://www.google.com/search';
const PLATFORM_SITES = ['twitter.com', 'threads.net'];
const MAX_RESULTS_PER_PLATFORM = 10;
const QUERY_CACHE_TTL_MS = 10 * 60 * 1000;
const queryCache = new Map();

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeQuery(query) {
  return cleanText(query).toLowerCase();
}

function looksBlocked(html) {
  const normalized = html.toLowerCase();
  return (
    normalized.includes('unusual traffic') ||
    normalized.includes('detected unusual traffic') ||
    normalized.includes('our systems have detected')
  );
}

function extractSnippet($, node) {
  const candidates = [
    '.VwiC3b',
    '.yXK7lf',
    '.s3v9rd',
    '[data-sncf="1"]',
    'span',
    'div',
  ];

  for (const selector of candidates) {
    const text = cleanText($(node).find(selector).first().text());
    if (text.length >= 20) {
      return text;
    }
  }

  return '';
}

function detectPlatform(link) {
  if (link.includes('threads.net')) {
    return 'threads';
  }

  if (link.includes('twitter.com') || link.includes('x.com')) {
    return 'twitter';
  }

  return null;
}

function extractResults(html) {
  const $ = cheerio.load(html);
  const results = [];
  const seenLinks = new Set();
  const platformCounts = {
    twitter: 0,
    threads: 0,
  };

  $('div.g').each((_, element) => {
    if (
      platformCounts.twitter >= MAX_RESULTS_PER_PLATFORM &&
      platformCounts.threads >= MAX_RESULTS_PER_PLATFORM
    ) {
      return false;
    }

    const linkElement = $(element).find('a[href]').first();
    const titleElement = $(element).find('h3').first();
    const link = cleanText(linkElement.attr('href'));
    const title = cleanText(titleElement.text());
    const snippet = extractSnippet($, element);

    if (!link || !title || !snippet || snippet.length < 20) {
      return;
    }

    const platform = detectPlatform(link);
    if (!platform) {
      return;
    }

    if (platformCounts[platform] >= MAX_RESULTS_PER_PLATFORM) {
      return;
    }

    if (seenLinks.has(link)) {
      return;
    }

    seenLinks.add(link);
    platformCounts[platform] += 1;
    results.push({
      externalId: link,
      title,
      body: snippet,
      author: 'unknown',
      occurredAt: new Date().toISOString(),
      metadata: {
        platform,
        url: link,
      },
    });
  });

  return results;
}

async function fetchSearchResults(query) {
  const searchQuery = `${query} (${PLATFORM_SITES.map((site) => `site:${site}`).join(' OR ')})`;
  const url = `${GOOGLE_SEARCH_URL}?q=${encodeURIComponent(
    searchQuery
  )}&num=${MAX_RESULTS_PER_PLATFORM * PLATFORM_SITES.length}&hl=en`;

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (response.status === 429) {
    throw new Error(
      'Google temporarily rate-limited social listening. Please wait a few minutes and try again, or use Reddit Listening in the meantime.'
    );
  }

  if (!response.ok) {
    throw new Error(`Google search failed with status ${response.status}.`);
  }

  const html = await response.text();

  if (looksBlocked(html)) {
    throw new Error('Google temporarily blocked the search request. Please try again later.');
  }

  return extractResults(html);
}

async function searchSocialMentions(query) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    throw new Error('query is required.');
  }

  const cached = queryCache.get(normalizedQuery);
  if (cached && Date.now() - cached.timestamp < QUERY_CACHE_TTL_MS) {
    return cached.results;
  }

  const allResults = await fetchSearchResults(normalizedQuery);

  queryCache.set(normalizedQuery, {
    timestamp: Date.now(),
    results: allResults,
  });

  return allResults;
}

module.exports = {
  MAX_RESULTS_PER_PLATFORM,
  searchSocialMentions,
};
