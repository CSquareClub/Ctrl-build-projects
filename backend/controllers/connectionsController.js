const supabase = require('../lib/supabaseClient');
const { fetchAppleReviews } = require('../lib/appReviews');
const { fetchPlayReviews } = require('../services/reviewService');
const {
  createGmailAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleProfile,
  getMessageDetail,
  getMessagePreview,
  listRecentMessages,
  refreshAccessToken,
  verifyState,
} = require('../lib/gmail');
const {
  createOutlookAuthUrl,
  exchangeCodeForTokens: exchangeOutlookCodeForTokens,
  fetchMicrosoftProfile,
  getMessageDetail: getOutlookMessageDetail,
  listRecentMessages: listRecentOutlookMessages,
  refreshAccessToken: refreshOutlookAccessToken,
  verifyState: verifyOutlookState,
} = require('../lib/outlook');
const { detectSentiment, rebuildIssuesFromFeedback } = require('../lib/issueAggregator');
const { classifyFeedbackEvents } = require('../lib/groqFeedbackClassifier');
const { extractLocation } = require('../services/locationService');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function sanitizeConnectionMetadata(provider, metadata = {}) {
  if (provider !== 'imap') {
    return metadata;
  }

  const nextMetadata = { ...metadata };
  delete nextMetadata.encrypted_password;
  delete nextMetadata.encryptedPassword;
  return nextMetadata;
}

async function getConnections(req, res) {
  try {
    const { data, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json(
      (data ?? []).map((connection) => ({
        id: connection.id,
        provider: connection.provider,
        metadata: sanitizeConnectionMetadata(connection.provider, connection.metadata),
        created_at: connection.created_at,
        status: connection.status ?? 'connected',
        last_synced_at:
          connection.last_synced_at ?? connection.metadata?.lastSyncedAt ?? null,
        last_error: connection.last_error ?? null,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function startGmailOAuth(req, res) {
  try {
    const authUrl = createGmailAuthUrl({ userId: req.user.id });
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function startOutlookOAuth(req, res) {
  try {
    const authUrl = createOutlookAuthUrl({ userId: req.user.id });
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function upsertConnection(userId, provider, payload) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .upsert(
      {
        user_id: userId,
        provider,
        access_token: payload.access_token,
        refresh_token: payload.refresh_token || null,
        metadata: payload.metadata || {},
        status: payload.status || 'connected',
        last_synced_at: payload.last_synced_at || null,
        last_error: payload.last_error || null,
      },
      { onConflict: 'user_id, provider' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function gmailOAuthCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `${APP_URL}/dashboard/connect?gmail=error&message=${encodeURIComponent(
          String(error)
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${APP_URL}/dashboard/connect?gmail=error&message=${encodeURIComponent(
          'Missing Gmail OAuth code or state.'
        )}`
      );
    }

    const oauthState = verifyState(state);
    const tokens = await exchangeCodeForTokens(String(code));
    const profile = await fetchGoogleProfile(tokens.access_token);

    await upsertConnection(oauthState.userId, 'gmail', {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      status: 'connected',
      metadata: {
        accountName: profile.email,
        email: profile.email,
        name: profile.name || '',
        picture: profile.picture || '',
        connectedAt: new Date().toISOString(),
        lastSyncedAt: null,
      },
    });

    return res.redirect(
      `${oauthState.redirectTo}?gmail=connected&message=${encodeURIComponent(
        `Connected ${profile.email}`
      )}`
    );
  } catch (err) {
    return res.redirect(
      `${APP_URL}/dashboard/connect?gmail=error&message=${encodeURIComponent(
        err.message || 'Failed to connect Gmail.'
      )}`
    );
  }
}

async function outlookOAuthCallback(req, res) {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      return res.redirect(
        `${APP_URL}/dashboard/connect?outlook=error&message=${encodeURIComponent(
          String(errorDescription || error)
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${APP_URL}/dashboard/connect?outlook=error&message=${encodeURIComponent(
          'Missing Outlook OAuth code or state.'
        )}`
      );
    }

    const oauthState = verifyOutlookState(state);
    const tokens = await exchangeOutlookCodeForTokens(String(code));
    const profile = await fetchMicrosoftProfile(tokens.access_token);
    const email =
      profile.mail || profile.userPrincipalName || profile.user?.email || 'Outlook Inbox';

    await upsertConnection(oauthState.userId, 'outlook', {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      status: 'connected',
      metadata: {
        accountName: email,
        email,
        name: profile.displayName || '',
        connectedAt: new Date().toISOString(),
        lastSyncedAt: null,
      },
    });

    return res.redirect(
      `${oauthState.redirectTo}?outlook=connected&message=${encodeURIComponent(
        `Connected ${email}`
      )}`
    );
  } catch (err) {
    return res.redirect(
      `${APP_URL}/dashboard/connect?outlook=error&message=${encodeURIComponent(
        err.message || 'Failed to connect Outlook.'
      )}`
    );
  }
}

async function connectProvider(req, res) {
  try {
    const { provider } = req.params;
    const { access_token, refresh_token, metadata } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'access_token is required' });
    }

    const data = await upsertConnection(req.user.id, provider, {
      access_token,
      refresh_token,
      metadata,
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function syncConnection(req, res) {
  try {
    const { provider } = req.params;

    const { data: connection, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('provider', provider)
      .maybeSingle();

    if (error) throw error;
    if (!connection) {
      return res.status(404).json({ error: `Connect ${provider} before syncing.` });
    }

    let rows = [];
    let skipped = 0;
    let updatePayload = {
      status: 'connected',
      last_error: null,
    };

    if (provider === 'gmail') {
      let accessToken = connection.access_token;

      if (connection.refresh_token) {
        try {
          const refreshed = await refreshAccessToken(connection.refresh_token);
          accessToken = refreshed.access_token || accessToken;
        } catch (refreshError) {
          updatePayload = {
            ...updatePayload,
            status: 'error',
            last_error:
              refreshError instanceof Error
                ? refreshError.message
                : 'Failed to refresh Gmail token.',
          };
        }
      }

      const messages = await listRecentMessages(accessToken);
      const previews = [];

      for (const message of messages.slice(0, 40)) {
        const preview = await getMessagePreview(accessToken, message.id);
        previews.push(preview);
      }

      const classifications = await classifyFeedbackEvents(previews, {
        source: 'gmail',
        userId: req.user.id,
      });
      const classificationById = new Map(
        classifications.map((classification) => [classification.externalId, classification])
      );
      const shortlistedPreviews = previews.filter(
        (preview) => classificationById.get(preview.externalId)?.include
      );
      const details = [];

      for (const preview of shortlistedPreviews.slice(0, 12)) {
        const detail = await getMessageDetail(accessToken, preview.externalId);
        details.push(detail);
      }

      skipped = previews.length - details.length;

      rows = details.flatMap((detail) => {
        const classification = classificationById.get(detail.externalId);

        if (!classification?.include) {
          return [];
        }

        return [
          {
            user_id: req.user.id,
            source: 'gmail',
            external_id: detail.externalId,
            title: detail.title,
            body: detail.body,
            author: detail.author,
            url: detail.url,
            occurred_at: detail.occurredAt,
            sentiment: classification.sentiment || detectSentiment(`${detail.title} ${detail.body}`),
            location: extractLocation({
              source: 'gmail',
              title: detail.title,
              body: detail.body,
              author: detail.author,
              metadata: {
                accountEmail: connection.metadata?.email || null,
              },
            }),
            metadata: {
              threadId: detail.threadId,
              classificationReason: classification.reason,
              groqSentiment: classification.sentiment || 'neutral',
              isProductFeedback: true,
            },
          },
        ];
      });

      await supabase
        .from('feedback_events')
        .delete()
        .eq('user_id', req.user.id)
        .eq('source', 'gmail');

      updatePayload.access_token = accessToken;
    } else if (provider === 'outlook') {
      let accessToken = connection.access_token;

      if (connection.refresh_token) {
        try {
          const refreshed = await refreshOutlookAccessToken(connection.refresh_token);
          accessToken = refreshed.access_token || accessToken;
          updatePayload.refresh_token = refreshed.refresh_token || connection.refresh_token;
        } catch (refreshError) {
          updatePayload = {
            ...updatePayload,
            status: 'error',
            last_error:
              refreshError instanceof Error
                ? refreshError.message
                : 'Failed to refresh Outlook token.',
          };
        }
      }

      const previews = await listRecentOutlookMessages(accessToken);
      const classifications = await classifyFeedbackEvents(previews, {
        source: 'outlook',
        userId: req.user.id,
      });
      const classificationById = new Map(
        classifications.map((classification) => [classification.externalId, classification])
      );
      const shortlistedPreviews = previews.filter(
        (preview) => classificationById.get(preview.externalId)?.include
      );
      const details = [];

      for (const preview of shortlistedPreviews.slice(0, 12)) {
        const detail = await getOutlookMessageDetail(accessToken, preview.externalId);
        details.push(detail);
      }

      skipped = previews.length - details.length;

      rows = details.flatMap((detail) => {
        const classification = classificationById.get(detail.externalId);

        if (!classification?.include) {
          return [];
        }

        return [
          {
            user_id: req.user.id,
            source: 'outlook',
            external_id: detail.externalId,
            title: detail.title,
            body: detail.body,
            author: detail.author,
            url: detail.url,
            occurred_at: detail.occurredAt,
            sentiment:
              classification.sentiment ||
              detectSentiment(`${detail.title} ${detail.body}`),
            location: extractLocation({
              source: 'outlook',
              title: detail.title,
              body: detail.body,
              author: detail.author,
              metadata: {
                accountEmail: connection.metadata?.email || null,
              },
            }),
            metadata: {
              classificationReason: classification.reason,
              groqSentiment: classification.sentiment || 'neutral',
              isProductFeedback: true,
            },
          },
        ];
      });

      await supabase
        .from('feedback_events')
        .delete()
        .eq('user_id', req.user.id)
        .eq('source', 'outlook');

      updatePayload.access_token = accessToken;
    } else if (provider === 'app-reviews') {
      const appId = connection.metadata?.appId;
      if (!appId) {
        return res.status(400).json({ error: 'App ID is required to sync app reviews.' });
      }

      const country = connection.metadata?.country || 'us';
      const reviews = await fetchAppleReviews(String(appId), String(country));

      rows = reviews.map((review) => ({
        user_id: req.user.id,
        source: 'app-reviews',
        external_id: review.externalId,
        title: review.title,
        body: review.body,
        author: review.author,
        url: review.url,
        occurred_at: review.occurredAt,
        sentiment:
          review.rating >= 4
            ? 'positive'
            : review.rating <= 2
              ? 'negative'
              : 'neutral',
        location: extractLocation({
          source: 'app-reviews',
          title: review.title,
          body: review.body,
          author: review.author,
          metadata: {
            country: review.country,
          },
        }),
        metadata: {
          rating: review.rating,
          appName: review.appName,
          version: review.version,
          country: review.country,
          isProductFeedback: true,
        },
      }));

      await supabase
        .from('feedback_events')
        .delete()
        .eq('user_id', req.user.id)
        .eq('source', 'app-reviews');
    } else if (provider === 'google-play') {
      const appId = connection.metadata?.appId;
      if (!appId) {
        return res.status(400).json({ error: 'App ID is required to sync Google Play reviews.' });
      }

      const reviews = await fetchPlayReviews(String(appId), 50);

      if (reviews.length === 0) {
        return res.status(404).json({ error: 'No Google Play reviews available.' });
      }

      rows = reviews.map((review) => ({
        user_id: req.user.id,
        source: 'google-play',
        external_id: review.externalId,
        title: review.title || 'App Review',
        body: review.body,
        author: review.author,
        url: review.url,
        occurred_at: review.occurredAt,
        sentiment:
          review.rating >= 4
            ? 'positive'
            : review.rating <= 2
              ? 'negative'
              : 'neutral',
        location: extractLocation({
          source: 'google-play',
          title: review.title,
          body: review.body,
          author: review.author,
          metadata: {
            country: review.country,
          },
        }),
        metadata: {
          rating: review.rating,
          appId: review.appId,
          version: review.version,
          platform: 'google-play',
          country: review.country,
          isProductFeedback: true,
        },
      }));

      await supabase
        .from('feedback_events')
        .delete()
        .eq('user_id', req.user.id)
        .eq('source', 'google-play');
    } else {
      return res.status(400).json({ error: `Sync is not implemented for ${provider} yet.` });
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('feedback_events').upsert(rows, {
        onConflict: 'user_id, source, external_id',
      });

      if (insertError) throw insertError;
    }

    await rebuildIssuesFromFeedback(req.user.id);

    const lastSyncedAt = new Date().toISOString();
    const nextMetadata = {
      ...(connection.metadata || {}),
      lastSyncedAt,
      syncedCount: rows.length,
      skippedCount: skipped,
    };

    await supabase
      .from('connected_accounts')
      .update({
        metadata: nextMetadata,
        last_synced_at: lastSyncedAt,
        ...updatePayload,
      })
      .eq('id', connection.id);

    res.json({
      success: true,
      provider,
      imported: rows.length,
      skipped,
      lastSyncedAt,
    });
  } catch (err) {
    if (req.params?.provider && req.user?.id) {
      try {
        await supabase
          .from('connected_accounts')
          .update({
            status: 'error',
            last_error: err instanceof Error ? err.message : 'Sync failed.',
          })
          .eq('user_id', req.user.id)
          .eq('provider', req.params.provider);
      } catch {
        // Best-effort logging for hackathon speed.
      }
    }
    res.status(500).json({ error: err.message });
  }
}

async function disconnectProvider(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('connected_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateConnection(req, res) {
  try {
    const { id } = req.params;
    const { metadata, status } = req.body ?? {};

    const { data: existing, error: existingError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return res.status(404).json({ error: 'Connection not found.' });
    }

    const nextMetadata =
      metadata && typeof metadata === 'object'
        ? { ...(existing.metadata || {}), ...metadata }
        : existing.metadata || {};

    const update = {
      metadata: nextMetadata,
    };

    if (typeof status === 'string' && status.trim()) {
      update.status = status.trim();
    }

    const { data, error } = await supabase
      .from('connected_accounts')
      .update(update)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      id: data.id,
      provider: data.provider,
      metadata: sanitizeConnectionMetadata(data.provider, data.metadata),
      created_at: data.created_at,
      status: data.status ?? 'connected',
      last_synced_at: data.last_synced_at ?? data.metadata?.lastSyncedAt ?? null,
      last_error: data.last_error ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  connectProvider,
  disconnectProvider,
  getConnections,
  gmailOAuthCallback,
  outlookOAuthCallback,
  startGmailOAuth,
  startOutlookOAuth,
  syncConnection,
  updateConnection,
};
