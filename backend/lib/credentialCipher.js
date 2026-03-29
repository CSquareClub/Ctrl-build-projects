const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getCipherSecret() {
  return (
    process.env.IMAP_CREDENTIAL_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'product-pulse-imap-credentials'
  );
}

function getKey() {
  return crypto.createHash('sha256').update(getCipherSecret()).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString(
    'base64url'
  )}`;
}

function decryptSecret(payload) {
  const [ivRaw, tagRaw, encryptedRaw] = String(payload || '').split('.');

  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error('Invalid encrypted credential payload.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivRaw, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  decryptSecret,
  encryptSecret,
};
