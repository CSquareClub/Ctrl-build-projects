const crypto = require('crypto');

const SDK_PREFIX = 'pp_live';
const SDK_SECRET = process.env.SDK_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'product-pulse-sdk-secret';

function compactUserId(userId) {
  return String(userId || '').replace(/-/g, '');
}

function expandUserId(compactId) {
  if (!/^[a-f0-9]{32}$/i.test(compactId)) {
    return null;
  }

  return [
    compactId.slice(0, 8),
    compactId.slice(8, 12),
    compactId.slice(12, 16),
    compactId.slice(16, 20),
    compactId.slice(20),
  ].join('-');
}

function signCompactId(compactId) {
  return crypto
    .createHmac('sha256', SDK_SECRET)
    .update(compactId)
    .digest('hex')
    .slice(0, 12);
}

function generateSdkApiKey(userId) {
  const compactId = compactUserId(userId);
  if (!compactId) {
    return null;
  }

  return `${SDK_PREFIX}_${compactId}_${signCompactId(compactId)}`;
}

function resolveUserIdFromSdkApiKey(apiKey) {
  const value = String(apiKey || '').trim();
  const match = value.match(/^pp_live_([a-f0-9]{32})_([a-f0-9]{12})$/i);

  if (!match) {
    return null;
  }

  const [, compactId, signature] = match;
  if (signCompactId(compactId) !== signature.toLowerCase()) {
    return null;
  }

  return expandUserId(compactId);
}

module.exports = {
  generateSdkApiKey,
  resolveUserIdFromSdkApiKey,
};
