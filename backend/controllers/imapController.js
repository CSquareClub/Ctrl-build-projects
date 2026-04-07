const crypto = require('crypto');
const supabase = require('../lib/supabaseClient');
const { encryptSecret } = require('../lib/credentialCipher');
const { insertFeedbackEventsDeduped } = require('../lib/feedbackDedup');
const { detectSentiment } = require('../lib/issueAggregator');
const { classifyFeedbackEvents } = require('../lib/groqFeedbackClassifier');
const { ensureUserRecords } = require('../lib/ensureUserRecords');
const { connectIMAP, fetchEmails, MAX_EMAILS_PER_SYNC } = require('../services/imapService');
const { extractLocation } = require('../services/locationService');
const { enqueueSystemEvent, EVENT_TYPES } = require('../services/eventPipelineService');
const { processClaimedFeedback } = require('../services/feedbackProcessingService');

function getErrorMessage(error, fallback) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

function sanitizeMetadata(metadata = {}) {
  const nextMetadata = { ...metadata };
  delete nextMetadata.encrypted_password;
  delete nextMetadata.encryptedPassword;
  return nextMetadata;
}

function filterRowsAfterTimestamp(rows, lastProcessedAt) {
  const cutoff = Date.parse(lastProcessedAt || '');
  if (!Number.isFinite(cutoff)) {
    return {
      rows,
      skipped: 0,
    };
  }

  const nextRows = rows.filter((row) => {
    const occurredAt = Date.parse(row.occurred_at || row.occurredAt || '');
    return Number.isFinite(occurredAt) && occurredAt > cutoff;
  });

  return {
    rows: nextRows,
    skipped: rows.length - nextRows.length,
  };
}

function getLatestProcessedAt(rows, fallback = null) {
  const latest = rows.reduce((currentLatest, row) => {
    const occurredAt = Date.parse(row.occurred_at || row.occurredAt || '');
    if (!Number.isFinite(occurredAt)) {
      return currentLatest;
    }

    return currentLatest === null || occurredAt > currentLatest
      ? occurredAt
      : currentLatest;
  }, null);

  return latest === null ? fallback : new Date(latest).toISOString();
}

function buildImapFeedbackDedupeKey(userId, rows) {
  const hash = crypto
    .createHash('sha1')
    .update((rows || []).map((row) => row.unique_key || row.id || '').join('|'))
    .digest('hex')
    .slice(0, 12);

  return `feedback:imap:${userId}:${hash}`;
}

function mapConnection(connection) {
  return {
    id: connection.id,
    provider: connection.provider,
    metadata: sanitizeMetadata(connection.metadata || {}),
    created_at: connection.created_at,
    status: connection.status ?? 'connected',
    last_synced_at:
      connection.last_synced_at ?? connection.metadata?.lastSyncedAt ?? null,
    last_error: connection.last_error ?? null,
  };
}

async function getImapConnection(userId) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'imap')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertImapConnection(userId, payload) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .upsert(
      {
        user_id: userId,
        provider: 'imap',
        access_token: `imap:${payload.email || payload.metadata?.email || 'unknown'}`,
        refresh_token: null,
        metadata: payload.metadata,
        status: payload.status || 'connected',
        last_synced_at: payload.last_synced_at || null,
        last_error: payload.last_error || null,
      },
      { onConflict: 'user_id, provider' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function connectImapAccount(req, res) {
  try {
    const email = String(req.body?.email || '').trim();
    const imapHost = String(req.body?.imap_host || '').trim();
    const password = String(req.body?.password || '').trim();
    const imapPort = Number(req.body?.imap_port || 993);
    const secure = req.body?.secure !== false;

    if (!email || !imapHost || !password) {
      return res.status(400).json({
        error: 'email, imap_host, and password are required.',
      });
    }

    const metadata = {
      email,
      accountName: email,
      imap_host: imapHost,
      imap_port: imapPort,
      secure,
      encrypted_password: encryptSecret(password),
      connectedAt: new Date().toISOString(),
      lastSyncedAt: null,
    };

    const connection = await upsertImapConnection(req.user.id, {
      email,
      metadata,
      status: 'connecting',
      last_error: null,
    });

    try {
      const client = await connectIMAP(connection);
      await client.logout().catch(() => {});
    } catch (imapError) {
      await supabase
        .from('connected_accounts')
        .update({
          status: 'error',
          last_error: getErrorMessage(imapError, 'Failed to connect to IMAP.'),
        })
        .eq('id', connection.id);

      throw imapError;
    }

    const updated = await upsertImapConnection(req.user.id, {
      email,
      metadata,
      status: 'connected',
      last_error: null,
    });

    res.status(201).json(mapConnection(updated));
  } catch (err) {
    res.status(500).json({
      error: getErrorMessage(err, 'Unable to connect IMAP inbox.'),
    });
  }
}

async function getImapStatus(req, res) {
  try {
    const connection = await getImapConnection(req.user.id);

    if (!connection) {
      return res.status(404).json({ error: 'IMAP account is not connected.' });
    }

    res.json(mapConnection(connection));
  } catch (err) {
    res.status(500).json({
      error: getErrorMessage(err, 'Unable to load IMAP status.'),
    });
  }
}

async function syncImapAccount(req, res) {
  try {
    await ensureUserRecords(req.user);

    const connection = await getImapConnection(req.user.id);

    if (!connection) {
      return res.status(404).json({ error: 'Connect IMAP before syncing.' });
    }

    const rawEmails = await fetchEmails(connection, { limit: MAX_EMAILS_PER_SYNC });

    if (rawEmails.length === 0) {
      const lastSyncedAt = new Date().toISOString();
      await supabase
        .from('connected_accounts')
        .update({
          metadata: {
            ...(connection.metadata || {}),
            lastSyncedAt,
            syncedCount: 0,
            skippedCount: 0,
          },
          last_synced_at: lastSyncedAt,
          status: 'connected',
          last_error: null,
        })
        .eq('id', connection.id);

      return res.json({
        success: true,
        provider: 'imap',
        imported: 0,
        skipped: 0,
        lastSyncedAt,
      });
    }

    const previews = rawEmails.map((email) => ({
      externalId: email.externalId,
      title: email.title,
      author: email.author,
      snippet: email.body.slice(0, 500),
      occurredAt: email.occurredAt,
      source: 'imap_email',
    }));

    const classifications = await classifyFeedbackEvents(previews, {
      source: 'imap_email',
      userId: req.user.id,
    });
    const byId = new Map(
      classifications.map((classification) => [classification.externalId, classification])
    );

    const rows = rawEmails.flatMap((email) => {
      const classification = byId.get(email.externalId);

      if (!classification?.include) {
        return [];
      }

      return [
        {
          user_id: req.user.id,
          source: 'imap_email',
          external_id: email.externalId,
          title: email.title,
          body: email.body,
          author: email.author,
          url: null,
          occurred_at: email.occurredAt,
          sentiment:
            classification.sentiment || detectSentiment(`${email.title} ${email.body}`),
          location: extractLocation({
            source: 'imap_email',
            title: email.title,
            body: email.body,
            author: email.author,
            metadata: {
              accountEmail: email.accountEmail,
            },
          }),
          metadata: {
            accountEmail: email.accountEmail,
            uid: email.uid,
            classificationReason: classification.reason,
            issueType: classification.issueType || 'global',
            issueGroupSlug: classification.issueGroupSlug || null,
            issueGroupTitle: classification.issueGroupTitle || null,
            classificationConfidence:
              classification.classificationConfidence == null
                ? null
                : Number(classification.classificationConfidence),
            groqSentiment: classification.sentiment || 'neutral',
            isProductFeedback: true,
          },
        },
      ];
    });

    let filteredOut = rawEmails.length - rows.length;
    const processingWindow = filterRowsAfterTimestamp(
      rows,
      connection.last_processed_at || connection.metadata?.lastProcessedAt || null
    );
    rows = processingWindow.rows;
    filteredOut += processingWindow.skipped;
    const nextLastProcessedAt = getLatestProcessedAt(
      rows,
      connection.last_processed_at || connection.metadata?.lastProcessedAt || null
    );

    const insertResult = await insertFeedbackEventsDeduped(req.user.id, rows, {
      logLabel: 'imap',
    });

    if (insertResult.inserted > 0 && DEMO_DIRECT_PROCESSING) {
      await processClaimedFeedback(req.user, insertResult.rows, {
        background: false,
        mode: 'sync:imap:inline',
        skipAutoInspection: true,
      }).catch(() => null);
    }

    if (insertResult.inserted > 0 && !DEMO_DIRECT_PROCESSING && req.body?._skipAgentProcessing !== true) {
      await enqueueSystemEvent({
        type: EVENT_TYPES.FEEDBACK_RECEIVED,
        userId: req.user.id,
        source: 'imap',
        dedupeKey: buildImapFeedbackDedupeKey(req.user.id, insertResult.rows),
        payload: {
          uniqueKeys: insertResult.rows.map((row) => row.unique_key).filter(Boolean),
          background: true,
          mode: 'sync:imap',
        },
        priority: 1,
      }).catch(() => null);
    }

    const lastSyncedAt = new Date().toISOString();
    await supabase
      .from('connected_accounts')
      .update({
        metadata: {
            ...(connection.metadata || {}),
            lastSyncedAt,
            lastProcessedAt:
              nextLastProcessedAt ||
              connection.last_processed_at ||
              connection.metadata?.lastProcessedAt ||
              null,
            syncedCount: insertResult.inserted,
            skippedCount: filteredOut + insertResult.duplicatesSkipped,
            duplicatesSkipped: insertResult.duplicatesSkipped,
          },
          last_synced_at: lastSyncedAt,
          last_processed_at:
            nextLastProcessedAt ||
            connection.last_processed_at ||
            connection.metadata?.lastProcessedAt ||
            null,
          status: 'connected',
          last_error: null,
        })
      .eq('id', connection.id);

    res.json({
      success: true,
      provider: 'imap',
      fetched: rawEmails.length,
      imported: insertResult.inserted,
      skipped: filteredOut + insertResult.duplicatesSkipped,
      duplicatesSkipped: insertResult.duplicatesSkipped,
      lastSyncedAt,
    });
  } catch (err) {
    try {
      await supabase
        .from('connected_accounts')
        .update({
          status: 'error',
          last_error: getErrorMessage(err, 'IMAP sync failed.'),
        })
        .eq('user_id', req.user.id)
        .eq('provider', 'imap');
    } catch {
      // best effort
    }

    res.status(500).json({
      error: getErrorMessage(err, 'Unable to sync IMAP inbox.'),
    });
  }
}

module.exports = {
  connectImapAccount,
  getImapStatus,
  syncImapAccount,
};
const DEMO_DIRECT_PROCESSING = process.env.DEMO_DIRECT_PROCESSING !== 'false';
