const crypto = require('crypto');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GMAIL_MESSAGES_URL =
  'https://gmail.googleapis.com/gmail/v1/users/me/messages';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

const GMAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];
const GOOGLE_WORKSPACE_SCOPES = [
  ...GMAIL_SCOPES,
  GOOGLE_CALENDAR_SCOPE,
];
const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'profile',
  ...GOOGLE_WORKSPACE_SCOPES.filter((scope, index, scopes) => scopes.indexOf(scope) === index),
];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in backend environment.`);
  }
  return value;
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getAppUrl() {
  return normalizeUrl(process.env.APP_URL || 'http://localhost:3000');
}

function getBackendUrl() {
  return normalizeUrl(
    process.env.BACKEND_URL ||
      process.env.API_URL ||
      process.env.PUBLIC_BACKEND_URL ||
      'http://localhost:8000'
  );
}

function getRedirectUri() {
  return process.env.GMAIL_REDIRECT_URI || `${getBackendUrl()}/api/integrations/gmail/callback`;
}

function getCalendarRedirectUri() {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    process.env.GMAIL_REDIRECT_URI ||
    `${getBackendUrl()}/api/integrations/google-calendar/callback`
  );
}

function getStateSecret() {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'product-pulse-oauth-state'
  );
}

function signState(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const signature = crypto
    .createHmac('sha256', getStateSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifyState(token) {
  const [encodedPayload, signature] = String(token || '').split('.');

  if (!encodedPayload || !signature) {
    throw new Error('Invalid OAuth state.');
  }

  const expected = crypto
    .createHmac('sha256', getStateSecret())
    .update(encodedPayload)
    .digest('base64url');

  if (signature !== expected) {
    throw new Error('OAuth state signature mismatch.');
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, 'base64url').toString('utf8')
  );

  if (!payload.userId || !payload.redirectTo) {
    throw new Error('OAuth state is incomplete.');
  }

  return payload;
}

function createGmailAuthUrl({ userId }) {
  return createGoogleAuthUrl({
    userId,
    redirectUri: getRedirectUri(),
    scopes: GOOGLE_WORKSPACE_SCOPES,
  });
}

function createGoogleCalendarAuthUrl({ userId }) {
  return createGoogleAuthUrl({
    userId,
    redirectUri: getCalendarRedirectUri(),
    scopes: GOOGLE_CALENDAR_SCOPES,
  });
}

function createGoogleAuthUrl({ userId, redirectUri, scopes }) {
  const clientId = getRequiredEnv('GOOGLE_CLIENT_ID');
  const state = signState({
    userId,
    redirectTo: `${getAppUrl()}/dashboard/connect`,
    createdAt: Date.now(),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: scopes.join(' '),
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  return exchangeCodeForTokensWithRedirect(code, getRedirectUri());
}

async function exchangeCalendarCodeForTokens(code) {
  return exchangeCodeForTokensWithRedirect(code, getCalendarRedirectUri());
}

async function exchangeCodeForTokensWithRedirect(code, redirectUri) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || 'Gmail token exchange failed.');
  }

  return data;
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || 'Gmail token refresh failed.');
  }

  return data;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch Google profile.');
  }

  return data;
}

async function listRecentMessages(accessToken) {
  const params = new URLSearchParams({
    maxResults: '100',
    q: '-in:spam -in:trash',
  });

  const response = await fetch(`${GMAIL_MESSAGES_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to list Gmail messages.');
  }

  return data.messages ?? [];
}

function decodeBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function extractHeader(headers, name) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value;
}

function toSafeIsoDate(primaryValue, fallbackValue) {
  const primary = primaryValue ? new Date(primaryValue) : null;
  if (primary && !Number.isNaN(primary.getTime())) {
    return primary.toISOString();
  }

  const fallback = fallbackValue != null ? new Date(Number(fallbackValue)) : new Date();
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return new Date().toISOString();
}

function parseSender(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return {
      author: 'Unknown sender',
      senderEmail: null,
      senderName: null,
    };
  }

  const angleMatch = rawValue.match(/^(.*?)(?:<([^>]+)>)$/);
  if (angleMatch) {
    const senderName = angleMatch[1].trim().replace(/^"|"$/g, '') || null;
    const senderEmail = angleMatch[2].trim().toLowerCase() || null;
    return {
      author: senderName ? `${senderName} <${senderEmail}>` : senderEmail,
      senderEmail,
      senderName,
    };
  }

  const emailMatch = rawValue.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    const senderEmail = emailMatch[0].trim().toLowerCase();
    const senderName = rawValue.replace(emailMatch[0], '').replace(/[<>()"]/g, '').trim() || null;
    return {
      author: senderName ? `${senderName} <${senderEmail}>` : senderEmail,
      senderEmail,
      senderName,
    };
  }

  return {
    author: rawValue,
    senderEmail: null,
    senderName: rawValue,
  };
}

async function getMessageDetail(accessToken, messageId) {
  const response = await fetch(
    `${GMAIL_MESSAGES_URL}/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch Gmail message.');
  }

  const headers = data.payload?.headers ?? [];
  const plainPart =
    data.payload?.parts?.find((part) => part.mimeType === 'text/plain') ||
    (data.payload?.mimeType === 'text/plain' ? data.payload : null);

  const bodyText = plainPart?.body?.data
    ? decodeBase64Url(plainPart.body.data)
    : data.snippet || '';
  const fromHeader = extractHeader(headers, 'from');
  const replyToHeader = extractHeader(headers, 'reply-to');
  const sender = parseSender(replyToHeader || fromHeader);

  return {
    externalId: data.id,
    threadId: data.threadId,
    title: extractHeader(headers, 'subject') || 'Gmail feedback',
    body: bodyText.trim() || data.snippet || 'No body available.',
    author: sender.author,
    senderEmail: sender.senderEmail,
    senderName: sender.senderName,
    messageIdHeader: extractHeader(headers, 'message-id') || null,
    occurredAt: toSafeIsoDate(extractHeader(headers, 'date'), data.internalDate || Date.now()),
    url: `https://mail.google.com/mail/u/0/#inbox/${data.threadId || data.id}`,
  };
}

async function getMessagePreview(accessToken, messageId) {
  const response = await fetch(
    `${GMAIL_MESSAGES_URL}/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch Gmail preview.');
  }

  const headers = data.payload?.headers ?? [];
  const fromHeader = extractHeader(headers, 'from');
  const sender = parseSender(fromHeader);

  return {
    externalId: data.id,
    threadId: data.threadId,
    title: extractHeader(headers, 'subject') || 'Gmail feedback',
    author: sender.author,
    senderEmail: sender.senderEmail,
    senderName: sender.senderName,
    snippet: data.snippet || '',
    occurredAt: toSafeIsoDate(extractHeader(headers, 'date'), data.internalDate || Date.now()),
  };
}

module.exports = {
  createGoogleCalendarAuthUrl,
  createGmailAuthUrl,
  exchangeCalendarCodeForTokens,
  exchangeCodeForTokens,
  fetchGoogleProfile,
  getMessageDetail,
  getMessagePreview,
  listRecentMessages,
  refreshAccessToken,
  verifyState,
};
