const supabase = require('../lib/supabaseClient');
const { fetchAppleReviews } = require('../lib/appReviews');
const { fetchPlayReviews } = require('../services/reviewService');
const {
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
const { insertFeedbackEventsDeduped } = require('../lib/feedbackDedup');
const { isDemoUser } = require('../lib/demoMode');
const { buildDemoGmailFeedbackRows, wait } = require('../lib/demoFixtures');
const { extractLocation } = require('../services/locationService');
const { ensureUserRecords } = require('../lib/ensureUserRecords');
const { ensureCalendarAccessToken } = require('../services/calendarService');
const { runAgent } = require('../services/agentService');
const { QUEUE_NAMES } = require('../services/jobQueueService');
const { publishSystemEvent } = require('../services/liveEventsService');

const APP_URL = String(process.env.APP_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');
const GMAIL_PREVIEW_LIMIT = 40;
const GMAIL_DETAIL_LIMIT = 20;
const OUTLOOK_DETAIL_LIMIT = 8;

function getSettledValues(results) {
  return results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
}

function sanitizeConnectionMetadata(provider, metadata = {}) {
  if (provider !== 'imap') {
    return metadata;
  }

  const nextMetadata = { ...metadata };
  delete nextMetadata.encrypted_password;
  delete nextMetadata.encryptedPassword;
  return nextMetadata;
}

async function ensureGoogleWorkspaceMirror(userId) {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .in('provider', ['gmail', 'google_calendar']);

  if (error) throw error;

  const rows = data || [];
  const gmailConnection = rows.find((entry) => entry.provider === 'gmail');
  const calendarConnection = rows.find(
    (entry) => entry.provider === 'google_calendar'
  );

  if (gmailConnection && !calendarConnection) {
    await upsertConnection(userId, 'google_calendar', {
      access_token: gmailConnection.access_token,
      refresh_token: gmailConnection.refresh_token,
      status: gmailConnection.status || 'connected',
      metadata: {
        ...(gmailConnection.metadata || {}),
        expiry: gmailConnection.expiry || gmailConnection.metadata?.expiry || null,
        lastSyncedAt: gmailConnection.metadata?.lastSyncedAt || null,
      },
      last_error: gmailConnection.last_error || null,
      last_synced_at: gmailConnection.last_synced_at || null,
      expiry: gmailConnection.expiry || gmailConnection.metadata?.expiry || null,
    });
  } else if (!gmailConnection && calendarConnection) {
    await upsertConnection(userId, 'gmail', {
      access_token: calendarConnection.access_token,
      refresh_token: calendarConnection.refresh_token,
      status: calendarConnection.status || 'connected',
      metadata: {
        ...(calendarConnection.metadata || {}),
        lastSyncedAt: calendarConnection.metadata?.lastSyncedAt || null,
      },
      last_error: calendarConnection.last_error || null,
      last_synced_at: calendarConnection.last_synced_at || null,
      expiry: calendarConnection.expiry || null,
    });
  }
}

async function getConnections(req, res) {
  try {
    await ensureGoogleWorkspaceMirror(req.user.id);

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
        expiry: connection.expiry ?? connection.metadata?.expiry ?? null,
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

async function startGoogleCalendarOAuth(req, res) {
  try {
    const authUrl = createGoogleCalendarAuthUrl({ userId: req.user.id });
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getGoogleCalendarStatus(req, res) {
  try {
    const { data, error } = await supabase
      .from('connected_accounts')
      .select('metadata, status, last_synced_at, expiry, last_error')
      .eq('user_id', req.user.id)
      .in('provider', ['google_calendar', 'gmail']);

    if (error) throw error;

    const calendarConnection = (data ?? []).find(
      (entry) => entry.provider === 'google_calendar'
    );
    const gmailConnection = (data ?? []).find((entry) => entry.provider === 'gmail');
    const effectiveConnection = calendarConnection || gmailConnection;

    if (!effectiveConnection) {
      return res.json({
        connected: false,
        email: null,
        lastSyncedAt: null,
      });
    }

    return res.json({
      connected: true,
      email: effectiveConnection.metadata?.email || null,
      lastSyncedAt:
        calendarConnection?.last_synced_at ??
        calendarConnection?.metadata?.lastSyncedAt ??
        gmailConnection?.last_synced_at ??
        gmailConnection?.metadata?.lastSyncedAt ??
        null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
        expiry: payload.expiry || null,
      },
      { onConflict: 'user_id, provider' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function upsertGoogleWorkspaceConnections(userId, profile, tokens, options = {}) {
  const connectedAt = new Date().toISOString();
  const expiry = tokens.expires_in
    ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
    : null;
  const sharedMetadata = {
    accountName: profile.email,
    email: profile.email,
    name: profile.name || '',
    picture: profile.picture || '',
    connectedAt,
  };

  await upsertConnection(userId, 'gmail', {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    status: 'connected',
    metadata: {
      ...sharedMetadata,
      lastSyncedAt: options.gmailLastSyncedAt || null,
    },
    last_error: null,
    last_synced_at: options.gmailLastSyncedAt || null,
  });

  await upsertConnection(userId, 'google_calendar', {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    status: 'connected',
    metadata: {
      ...sharedMetadata,
      expiry,
      lastSyncedAt: options.calendarLastSyncedAt || null,
    },
    last_error: null,
    last_synced_at: options.calendarLastSyncedAt || null,
    expiry,
  });
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

    await upsertGoogleWorkspaceConnections(oauthState.userId, profile, tokens);
    await publishSystemEvent({
      userId: oauthState.userId,
      type: 'repo_connected',
      queueName: QUEUE_NAMES.REALTIME,
      priority: 'normal',
      payload: {
        provider: 'gmail',
        email: profile.email,
      },
    }).catch(() => null);

    return res.redirect(
      `${oauthState.redirectTo}?gmail=connected&message=${encodeURIComponent(
        `Connected Gmail and Google Calendar for ${profile.email}`
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
    await publishSystemEvent({
      userId: oauthState.userId,
      type: 'repo_connected',
      queueName: QUEUE_NAMES.REALTIME,
      priority: 'normal',
      payload: {
        provider: 'outlook',
        email,
      },
    }).catch(() => null);

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

async function googleCalendarOAuthCallback(req, res) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `${APP_URL}/dashboard/connect?error=calendar&message=${encodeURIComponent(
          String(error)
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${APP_URL}/dashboard/connect?error=calendar&message=${encodeURIComponent(
          'Missing Google Calendar OAuth code or state.'
        )}`
      );
    }

    const oauthState = verifyState(state);
    const tokens = await exchangeCalendarCodeForTokens(String(code));
    const profile = await fetchGoogleProfile(tokens.access_token);

    await upsertGoogleWorkspaceConnections(oauthState.userId, profile, tokens);
    await publishSystemEvent({
      userId: oauthState.userId,
      type: 'repo_connected',
      queueName: QUEUE_NAMES.REALTIME,
      priority: 'normal',
      payload: {
        provider: 'google_calendar',
        email: profile.email,
      },
    }).catch(() => null);

    return res.redirect(
      `${oauthState.redirectTo}?success=calendar`
    );
  } catch (err) {
    return res.redirect(
      `${APP_URL}/dashboard/connect?error=calendar&message=${encodeURIComponent(
        err.message || 'Failed to connect Google Calendar.'
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
    console.log('Sync started', {
      provider: req.params?.provider || null,
      userId: req.user?.id || null,
      demoMode: isDemoUser(req.user),
    });
    const requestedProvider = req.params.provider;
    const provider =
      requestedProvider === 'google-calendar'
        ? 'google_calendar'
        : requestedProvider;
    const requestedAppId = String(req.body?.appId || '').trim();

    await ensureUserRecords(req.user);

    const { data: initialConnection, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('provider', provider)
      .maybeSingle();

    if (error) throw error;

    let connection = initialConnection;

    if (!connection && (provider === 'google_calendar' || provider === 'gmail')) {
      const counterpartProvider =
        provider === 'google_calendar' ? 'gmail' : 'google_calendar';
      const { data: counterpartConnection, error: counterpartError } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('provider', counterpartProvider)
        .maybeSingle();

      if (counterpartError) throw counterpartError;

      if (counterpartConnection) {
        connection = await upsertConnection(req.user.id, provider, {
          access_token: counterpartConnection.access_token,
          refresh_token: counterpartConnection.refresh_token,
          status: counterpartConnection.status || 'connected',
          metadata: {
            ...(counterpartConnection.metadata || {}),
            lastSyncedAt: counterpartConnection.metadata?.lastSyncedAt || null,
          },
          last_error: null,
          last_synced_at: counterpartConnection.last_synced_at || null,
          expiry: counterpartConnection.expiry || null,
        });
      }
    }

    if (!connection) {
      return res.status(404).json({ error: `Connect ${provider} before syncing.` });
    }

    let rows = [];
    let filteredOut = 0;
    let duplicatesSkipped = 0;
    let updatePayload = {
      status: 'connected',
      last_error: null,
    };

    if (provider === 'gmail') {
      if (isDemoUser(req.user)) {
        console.log('Using hybrid demo Gmail payload');
        await wait(1100);
        rows = buildDemoGmailFeedbackRows({
          userId: req.user.id,
          accountEmail: connection.metadata?.email || req.user.email || null,
        });
      } else {
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
      const previewTargets = messages.slice(0, GMAIL_PREVIEW_LIMIT);
      const previews = getSettledValues(
        await Promise.allSettled(
          previewTargets.map((message) => getMessagePreview(accessToken, message.id))
        )
      );

      if (previews.length === 0) {
        const lastSyncedAt = new Date().toISOString();
        const nextMetadata = {
          ...(connection.metadata || {}),
          lastSyncedAt,
          syncedCount: 0,
          skippedCount: messages.length,
          duplicatesSkipped: 0,
        };

        await supabase
          .from('connected_accounts')
          .update({
            metadata: nextMetadata,
            last_synced_at: lastSyncedAt,
            status: 'connected',
            last_error: null,
            ...updatePayload,
          })
          .eq('id', connection.id);

        return res.json({
          success: true,
          provider,
          fetched: messages.length,
          imported: 0,
          skipped: messages.length,
          duplicatesSkipped: 0,
          lastSyncedAt,
        });
      }

      filteredOut = Math.max(0, messages.length - previews.length);
      rows = previews.slice(0, GMAIL_DETAIL_LIMIT).map((preview) => ({
        user_id: req.user.id,
        source: 'gmail',
        external_id: preview.externalId,
        title: preview.title,
        body: preview.snippet || preview.title || 'Gmail feedback',
        author: preview.author,
        occurred_at: preview.occurredAt,
        sentiment: detectSentiment(`${preview.title} ${preview.snippet || ''}`),
        replied: false,
        location: extractLocation({
          source: 'gmail',
          title: preview.title,
          body: preview.snippet || '',
          author: preview.author,
          metadata: {
            accountEmail: connection.metadata?.email || null,
          },
        }),
        metadata: {
          threadId: preview.threadId || null,
          senderEmail: preview.senderEmail || null,
          senderName: preview.senderName || null,
          originalSubject: preview.title,
          messageIdHeader: null,
          classificationReason: 'preview-ingest',
          groqSentiment: 'neutral',
          isProductFeedback: true,
          fallbackIngest: true,
        },
      }));

      updatePayload.access_token = accessToken;
      }
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
      const details = getSettledValues(
        await Promise.allSettled(
          shortlistedPreviews
            .slice(0, OUTLOOK_DETAIL_LIMIT)
            .map((preview) => getOutlookMessageDetail(accessToken, preview.externalId))
        )
      );

      filteredOut = previews.length - details.length;

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

      updatePayload.access_token = accessToken;
    } else if (provider === 'app-reviews') {
      const appId = requestedAppId || connection.metadata?.appId;
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

    } else if (provider === 'google-play') {
      const appId = requestedAppId || connection.metadata?.appId;
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

    } else if (provider === 'google_calendar') {
      const refreshedConnection = await ensureCalendarAccessToken(req.user.id);

      if (!refreshedConnection) {
        return res
          .status(404)
          .json({ error: 'Connect Google Calendar before syncing.' });
      }

      rows = [];
      updatePayload = {
        ...updatePayload,
        access_token: refreshedConnection.access_token,
        refresh_token: refreshedConnection.refresh_token || connection.refresh_token,
        expiry: refreshedConnection.expiry || null,
      };

    } else {
      return res.status(400).json({ error: `Sync is not implemented for ${provider} yet.` });
    }

    const insertResult =
      rows.length > 0
        ? await insertFeedbackEventsDeduped(req.user.id, rows, {
            logLabel: provider,
          })
        : { fetched: 0, inserted: 0, duplicatesSkipped: 0 };
    duplicatesSkipped = insertResult.duplicatesSkipped;
    let workflowResult = { issues: [] };

    if (rows.length > 0 && insertResult.inserted > 0) {
      console.log('Feedback inserted:', insertResult.inserted);
      console.log('Triggering workflow');
      workflowResult = await rebuildIssuesFromFeedback(req.user.id);
      await runAgent(req.user, {
        newFeedbackRows: insertResult.rows,
      });
      console.log('Workflow completed');
      console.log('Issues created:', workflowResult?.issues?.length || 0);
    }

    const lastSyncedAt = new Date().toISOString();
    const nextMetadata = {
      ...(connection.metadata || {}),
      ...(requestedAppId ? { appId: requestedAppId } : {}),
      lastSyncedAt,
      syncedCount: insertResult.inserted,
      skippedCount: filteredOut + duplicatesSkipped,
      duplicatesSkipped,
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
      demoMode: provider === 'gmail' && isDemoUser(req.user),
      fetched: rows.length,
      imported: insertResult.inserted,
      feedbackCount: insertResult.inserted,
      result: workflowResult,
      issues: Array.isArray(workflowResult?.issues) ? workflowResult.issues : [],
      skipped: filteredOut + duplicatesSkipped,
      duplicatesSkipped,
      lastSyncedAt,
    });
  } catch (err) {
    if (req.params?.provider && req.user?.id) {
      try {
        const provider =
          req.params.provider === 'google-calendar'
            ? 'google_calendar'
            : req.params.provider;
        await supabase
          .from('connected_accounts')
          .update({
            status: 'error',
            last_error: err instanceof Error ? err.message : 'Sync failed.',
          })
          .eq('user_id', req.user.id)
          .eq('provider', provider);
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
    const { data: connection, error: lookupError } = await supabase
      .from('connected_accounts')
      .select('id, provider')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found.' });
    }

    let deleteQuery = supabase
      .from('connected_accounts')
      .delete()
      .eq('user_id', req.user.id);

    if (connection.provider === 'gmail' || connection.provider === 'google_calendar') {
      deleteQuery = deleteQuery.in('provider', ['gmail', 'google_calendar']);
    } else {
      deleteQuery = deleteQuery.eq('id', id);
    }

    const { error } = await deleteQuery;

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
      expiry: data.expiry ?? data.metadata?.expiry ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  connectProvider,
  disconnectProvider,
  getConnections,
  getGoogleCalendarStatus,
  gmailOAuthCallback,
  googleCalendarOAuthCallback,
  outlookOAuthCallback,
  startGoogleCalendarOAuth,
  startGmailOAuth,
  startOutlookOAuth,
  syncConnection,
  updateConnection,
};
