const DEFAULT_LOCATION = Object.freeze({
  country: null,
  state: null,
  confidence: 'low',
});

const COUNTRY_BY_TLD = {
  in: 'India',
  uk: 'United Kingdom',
  au: 'Australia',
  ca: 'Canada',
  de: 'Germany',
  fr: 'France',
  jp: 'Japan',
  br: 'Brazil',
};

const STATE_TO_COUNTRY = {
  california: 'United States',
  texas: 'United States',
  florida: 'United States',
  washington: 'United States',
  delhi: 'India',
  karnataka: 'India',
  maharashtra: 'India',
  london: 'United Kingdom',
  england: 'United Kingdom',
  victoria: 'Australia',
  'new south wales': 'Australia',
  ontario: 'Canada',
};

function normalizeLocation(location) {
  if (!location || typeof location !== 'object') {
    return { ...DEFAULT_LOCATION };
  }

  const country =
    typeof location.country === 'string' && location.country.trim()
      ? location.country.trim()
      : null;
  const state =
    typeof location.state === 'string' && location.state.trim()
      ? location.state.trim()
      : null;
  const confidence =
    location.confidence === 'high' ||
    location.confidence === 'medium' ||
    location.confidence === 'low'
      ? location.confidence
      : country || state
        ? 'medium'
        : 'low';

  return {
    country,
    state,
    confidence,
  };
}

function fromStructuredLocation(location, confidence = 'high') {
  if (!location) {
    return null;
  }

  if (typeof location === 'string') {
    return null;
  }

  const normalized = normalizeLocation(location);

  if (!normalized.country && !normalized.state) {
    return null;
  }

  return {
    ...normalized,
    confidence,
  };
}

function inferFromDomain(value) {
  const normalized = String(value || '').toLowerCase();
  const match = normalized.match(/\.([a-z]{2})(?:>|$|\s)/);

  if (!match) {
    return null;
  }

  const country = COUNTRY_BY_TLD[match[1]];
  if (!country) {
    return null;
  }

  return {
    country,
    state: null,
    confidence: 'low',
  };
}

function inferFromText(text) {
  const normalized = String(text || '').toLowerCase();

  const phraseMatch = normalized.match(
    /\b(?:i am from|i'm from|we are from|here in|based in|from)\s+([a-z\s]{2,40})\b/
  );

  if (phraseMatch) {
    const candidate = phraseMatch[1].trim();
    const mappedCountry = STATE_TO_COUNTRY[candidate];

    if (mappedCountry) {
      return {
        country: mappedCountry,
        state: candidate.replace(/\b\w/g, (char) => char.toUpperCase()),
        confidence: 'medium',
      };
    }

    return {
      country: candidate.replace(/\b\w/g, (char) => char.toUpperCase()),
      state: null,
      confidence: 'medium',
    };
  }

  for (const [state, country] of Object.entries(STATE_TO_COUNTRY)) {
    if (normalized.includes(state)) {
      return {
        country,
        state: state.replace(/\b\w/g, (char) => char.toUpperCase()),
        confidence: 'medium',
      };
    }
  }

  return null;
}

function extractLocation(feedback = {}) {
  const explicitLocation =
    fromStructuredLocation(feedback.location) ||
    fromStructuredLocation(feedback.metadata?.location) ||
    fromStructuredLocation(
      {
        country: feedback.metadata?.country || feedback.country || null,
        state: feedback.metadata?.state || feedback.state || null,
        confidence: feedback.metadata?.locationConfidence || null,
      },
      feedback.metadata?.country || feedback.country || feedback.metadata?.state || feedback.state
        ? 'high'
        : 'low'
    );

  if (explicitLocation) {
    return explicitLocation;
  }

  const source = String(feedback.source || '').toLowerCase();

  if (source === 'app-reviews' || source === 'google-play' || source === 'app_review') {
    const appReviewLocation = fromStructuredLocation(
      {
        country: feedback.metadata?.country || feedback.country || null,
        state: feedback.metadata?.state || feedback.state || null,
      },
      feedback.metadata?.country || feedback.country ? 'high' : 'low'
    );

    if (appReviewLocation) {
      return appReviewLocation;
    }
  }

  const domainLocation =
    inferFromDomain(feedback.author) || inferFromDomain(feedback.metadata?.accountEmail);
  if (domainLocation) {
    return domainLocation;
  }

  const textLocation = inferFromText(
    `${feedback.title || ''} ${feedback.body || ''} ${feedback.description || ''}`
  );
  if (textLocation) {
    return textLocation;
  }

  return { ...DEFAULT_LOCATION };
}

function summarizeLocations(events = []) {
  return events.reduce((accumulator, event) => {
    const location = normalizeLocation(event.location);
    if (!location.country) {
      return accumulator;
    }

    accumulator[location.country] = (accumulator[location.country] || 0) + 1;
    return accumulator;
  }, {});
}

async function getTopLocations(issueId, supabase) {
  const { data, error } = await supabase
    .from('issues')
    .select('location_breakdown')
    .eq('id', issueId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const breakdown =
    data && typeof data.location_breakdown === 'object' && data.location_breakdown
      ? data.location_breakdown
      : {};

  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({ country, count }));
}

module.exports = {
  extractLocation,
  getTopLocations,
  normalizeLocation,
  summarizeLocations,
};
