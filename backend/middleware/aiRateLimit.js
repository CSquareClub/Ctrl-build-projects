const WINDOW_MS = Number(process.env.AI_CHAT_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const MAX_REQUESTS = Number(process.env.AI_CHAT_RATE_LIMIT_MAX || 8);

const requestLog = new Map();

function cleanupUserRequests(userId, now) {
  const existing = requestLog.get(userId) ?? [];
  const recent = existing.filter((timestamp) => now - timestamp < WINDOW_MS);
  requestLog.set(userId, recent);
  return recent;
}

function aiChatRateLimit(req, res, next) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Missing authenticated user for rate limit.' });
  }

  const now = Date.now();
  const recent = cleanupUserRequests(userId, now);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfterMs = WINDOW_MS - (now - recent[0]);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: `AI Helper limit reached. Try again in about ${retryAfterSeconds} seconds.`,
    });
  }

  recent.push(now);
  requestLog.set(userId, recent);
  next();
}

module.exports = {
  aiChatRateLimit,
};
