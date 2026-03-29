const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { decryptSecret } = require('../lib/credentialCipher');

const DEFAULT_IMAP_PORT = 993;
const MAX_EMAILS_PER_SYNC = 100;

function normalizeSecure(value) {
  return value !== false;
}

function normalizeImapAccount(connectionOrAccount = {}) {
  const metadata = connectionOrAccount.metadata || {};

  return {
    user_id: connectionOrAccount.user_id || connectionOrAccount.userId || null,
    email:
      connectionOrAccount.email ||
      connectionOrAccount.accountEmail ||
      metadata.email ||
      metadata.accountName ||
      '',
    imap_host:
      connectionOrAccount.imap_host ||
      connectionOrAccount.imapHost ||
      metadata.imap_host ||
      metadata.imapHost ||
      '',
    imap_port: Number(
      connectionOrAccount.imap_port ||
        connectionOrAccount.imapPort ||
        metadata.imap_port ||
        metadata.imapPort ||
        DEFAULT_IMAP_PORT
    ),
    secure: normalizeSecure(
      connectionOrAccount.secure !== undefined
        ? connectionOrAccount.secure
        : metadata.secure
    ),
    encrypted_password:
      connectionOrAccount.encrypted_password ||
      connectionOrAccount.encryptedPassword ||
      metadata.encrypted_password ||
      metadata.encryptedPassword ||
      null,
  };
}

function mapImapError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  const responseText =
    error && typeof error === 'object' && typeof error.responseText === 'string'
      ? error.responseText
      : '';
  const responseCode =
    error && typeof error === 'object' && typeof error.serverResponseCode === 'string'
      ? error.serverResponseCode
      : '';
  const response =
    error && typeof error === 'object' && typeof error.response === 'string'
      ? error.response
      : '';
  const combined = `${message} ${responseText} ${responseCode} ${response}`.trim();
  const normalized = combined.toLowerCase();

  if (
    normalized.includes('authentication failed') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('login failed') ||
    normalized.includes('authent') ||
    normalized.includes('authorizationfailed')
  ) {
    return new Error(
      'IMAP login failed. Check your email address and password or app password.'
    );
  }

  if (
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('econnrefused') ||
    normalized.includes('enotfound')
  ) {
    return new Error('Unable to reach the IMAP server. Check the host, port, and security settings.');
  }

  if (normalized.includes('mailbox doesn\'t exist') || normalized.includes('no such mailbox')) {
    return new Error('The INBOX mailbox could not be opened for this IMAP account.');
  }

  if (normalized.includes('command failed')) {
    if (responseText) {
      return new Error(`IMAP server rejected the request: ${responseText}`);
    }

    if (responseCode) {
      return new Error(`IMAP server rejected the request (${responseCode}).`);
    }
  }

  return error instanceof Error ? error : new Error('IMAP connection failed.');
}

async function connectIMAP(connectionOrAccount) {
  const account = normalizeImapAccount(connectionOrAccount);

  if (!account.imap_host || !account.email || !account.encrypted_password) {
    throw new Error('IMAP account is missing host, email, or encrypted password.');
  }

  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port || DEFAULT_IMAP_PORT,
    secure: normalizeSecure(account.secure),
    auth: {
      user: account.email,
      pass: decryptSecret(account.encrypted_password),
    },
    logger: false,
  });

  try {
    await client.connect();
    return client;
  } catch (error) {
    await client.logout().catch(() => {});
    throw mapImapError(error);
  }
}

function extractAuthor(fromValue) {
  const first = Array.isArray(fromValue?.value) ? fromValue.value[0] : null;
  if (!first) {
    return 'Unknown sender';
  }

  return first.name || first.address || 'Unknown sender';
}

function buildExternalId(email, uid) {
  return `${email}:${uid}`;
}

async function fetchEmails(connection, options = {}) {
  const account = normalizeImapAccount(connection);
  const client = await connectIMAP(account);
  const emails = [];
  const fetchLimit = Math.min(Number(options.limit || MAX_EMAILS_PER_SYNC), MAX_EMAILS_PER_SYNC);

  try {
    const lock = await client.getMailboxLock('INBOX');

    try {
      const mailbox = client.mailbox;
      const exists = Number(mailbox?.exists || 0);

      if (exists === 0) {
        return [];
      }

      const start = Math.max(1, exists - fetchLimit + 1);

      for await (const message of client.fetch(`${start}:${exists}`, {
        uid: true,
        envelope: true,
        internalDate: true,
        source: true,
      })) {
        const parsed = await simpleParser(message.source);
        const text = parsed.text || parsed.html || '';

        emails.push({
          source: 'imap_email',
          externalId: buildExternalId(account.email, message.uid),
          title: parsed.subject || message.envelope?.subject || 'Email feedback',
          body: String(text).trim() || parsed.textAsHtml || 'No body available.',
          author: extractAuthor(parsed.from || message.envelope?.from),
          occurredAt: (
            parsed.date ||
            message.internalDate ||
            new Date()
          ).toISOString(),
          uid: message.uid,
          accountEmail: account.email,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return emails.reverse();
}

module.exports = {
  MAX_EMAILS_PER_SYNC,
  connectIMAP,
  fetchEmails,
  normalizeImapAccount,
};
