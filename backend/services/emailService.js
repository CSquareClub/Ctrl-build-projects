const supabase = require('../lib/supabaseClient');
const { refreshAccessToken } = require('../lib/gmail');

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const AUTO_REPLY_SUBJECT_MARKER = '[ProductPulse-AutoReply]';

function toBase64Url(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || null;
}

function isNoReplyAddress(value) {
  const email = normalizeEmail(value);
  if (!email) {
    return true;
  }

  return /(^|[^a-z])(noreply|no-reply|donotreply|do-not-reply)([^a-z]|$)/i.test(email);
}

async function getGmailConnection(userId) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureReplyAccessToken(userId) {
  const connection = await getGmailConnection(userId);
  if (!connection) {
    return null;
  }

  let accessToken = connection.access_token;
  let refreshToken = connection.refresh_token;

  if (refreshToken) {
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      accessToken = refreshed.access_token || accessToken;
      refreshToken = refreshed.refresh_token || refreshToken;

      await supabase
        .from('connected_accounts')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expiry: refreshed.expires_in
            ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString()
            : connection.expiry || null,
          last_error: null,
          status: 'connected',
        })
        .eq('id', connection.id);
    } catch (error) {
      await supabase
        .from('connected_accounts')
        .update({
          status: 'error',
          last_error:
            error instanceof Error ? error.message : 'Failed to refresh Gmail token for replies.',
        })
        .eq('id', connection.id);

      throw error;
    }
  }

  return {
    ...connection,
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function buildReplyMessage(input) {
  const lines = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ];

  if (input.inReplyTo) {
    lines.push(`In-Reply-To: ${input.inReplyTo}`);
  }

  if (input.references) {
    lines.push(`References: ${input.references}`);
  }

  return `${lines.join('\r\n')}\r\n\r\n${input.message}`;
}

async function sendReply({ userId, to, subject, message, threadId = null, inReplyTo = null, references = null }) {
  const recipient = normalizeEmail(to);
  if (!recipient) {
    throw new Error('Reply recipient email is required.');
  }

  if (isNoReplyAddress(recipient)) {
    return {
      skipped: true,
      reason: 'Recipient is a no-reply address.',
    };
  }

  const connection = await ensureReplyAccessToken(userId);
  if (!connection) {
    return {
      skipped: true,
      reason: 'Gmail is not connected.',
    };
  }

  const normalizedSubject = String(subject || '').includes(AUTO_REPLY_SUBJECT_MARKER)
    ? String(subject || '').trim()
    : `${AUTO_REPLY_SUBJECT_MARKER} ${String(subject || 'Your feedback').trim()}`;

  const raw = toBase64Url(
    buildReplyMessage({
      to: recipient,
      subject: normalizedSubject,
      message,
      inReplyTo,
      references,
    })
  );

  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw,
      threadId: threadId || undefined,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data?.error?.message || 'Failed to send Gmail reply.'
    );
  }

  return {
    skipped: false,
    id: data.id,
    threadId: data.threadId || threadId || null,
    email: connection.metadata?.email || null,
  };
}

module.exports = {
  isNoReplyAddress,
  normalizeEmail,
  sendReply,
};
