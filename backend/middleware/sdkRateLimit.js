const buckets = new Map();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 120;

function sdkRateLimit(req, res, next) {
  const apiKey = String(req.headers['x-product-pulse-key'] || req.body?.apiKey || '');
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const bucketKey = `${apiKey}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    buckets.set(bucketKey, {
      startedAt: now,
      count: 1,
    });
    return next();
  }

  if (bucket.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - bucket.startedAt)) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'SDK rate limit reached. Please slow down and try again shortly.',
    });
  }

  bucket.count += 1;
  return next();
}

module.exports = {
  sdkRateLimit,
};
