const crypto = require('crypto');

const MICROSOFT_AUTH_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL =
  'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_GRAPH_ME_URL = 'https://graph.microsoft.com/v1.0/me';
const MICROSOFT_GRAPH_MESSAGES_URL =
  'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages';

const OUTLOOK_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
  'Mail.Read',
];

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in backend environment.`);
  }
  return value;
}

function getRedirectUri() {
  return (
    process.env.OUTLOOK_REDIRECT_URI ||
    'http://localhost:8000/api/integrations/outlook/callback'
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

function createOutlookAuthUrl({ userId }) {
  const clientId = getRequiredEnv('MICROSOFT_CLIENT_ID');
  const redirectUri = getRedirectUri();
  const state = signState({
    userId,
    redirectTo: process.env.APP_URL || 'http://localhost:3000/dashboard/connect',
    createdAt: Date.now(),
    provider: 'outlook',
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'query',
    scope: OUTLOOK_SCOPES.join(' '),
    state,
    prompt: 'select_account',
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForTokens(code) {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getRequiredEnv('MICROSOFT_CLIENT_ID'),
      client_secret: getRequiredEnv('MICROSOFT_CLIENT_SECRET'),
      code,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
      scope: OUTLOOK_SCOPES.join(' '),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description || data?.error || 'Outlook token exchange failed.'
    );
  }

  return data;
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getRequiredEnv('MICROSOFT_CLIENT_ID'),
      client_secret: getRequiredEnv('MICROSOFT_CLIENT_SECRET'),
      refresh_token: refreshToken,
      redirect_uri: getRedirectUri(),
      grant_type: 'refresh_token',
      scope: OUTLOOK_SCOPES.join(' '),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error_description || data?.error || 'Outlook token refresh failed.'
    );
  }

  return data;
}

async function graphRequest(path, accessToken) {
  const response = await fetch(path, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Microsoft Graph request failed.');
  }

  return data;
}

async function fetchMicrosoftProfile(accessToken) {
  return graphRequest(MICROSOFT_GRAPH_ME_URL, accessToken);
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapSender(from) {
  const emailAddress = from?.emailAddress;
  if (!emailAddress) {
    return 'Unknown sender';
  }

  return emailAddress.name || emailAddress.address || 'Unknown sender';
}

async function listRecentMessages(accessToken) {
  const params = new URLSearchParams({
    $top: '40',
    $orderby: 'receivedDateTime desc',
    $select: 'id,subject,from,receivedDateTime,bodyPreview,webLink',
  });

  const data = await graphRequest(
    `${MICROSOFT_GRAPH_MESSAGES_URL}?${params.toString()}`,
    accessToken
  );

  return (data.value || []).map((message) => ({
    externalId: message.id,
    title: message.subject || 'Outlook feedback',
    author: mapSender(message.from),
    snippet: message.bodyPreview || '',
    occurredAt: message.receivedDateTime || new Date().toISOString(),
    url: message.webLink || null,
  }));
}

async function getMessageDetail(accessToken, messageId) {
  const params = new URLSearchParams({
    $select: 'id,subject,from,receivedDateTime,body,bodyPreview,webLink',
  });

  const data = await graphRequest(
    `${MICROSOFT_GRAPH_MESSAGES_URL}/${messageId}?${params.toString()}`,
    accessToken
  );

  const bodyContent =
    data.body?.contentType === 'html'
      ? stripHtml(data.body?.content)
      : String(data.body?.content || '').trim();

  return {
    externalId: data.id,
    title: data.subject || 'Outlook feedback',
    body: bodyContent || data.bodyPreview || 'No body available.',
    author: mapSender(data.from),
    occurredAt: data.receivedDateTime || new Date().toISOString(),
    url: data.webLink || null,
  };
}

module.exports = {
  createOutlookAuthUrl,
  exchangeCodeForTokens,
  fetchMicrosoftProfile,
  getMessageDetail,
  listRecentMessages,
  refreshAccessToken,
  verifyState,
};
