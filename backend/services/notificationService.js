const supabase = require('../lib/supabaseClient');
const { publishSystemEvent } = require('./liveEventsService');
const DEFAULT_NOTIFICATION_COOLDOWN_MINUTES = 30;

function normalizeNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.read,
    metadata: row.metadata || {},
    lastNotifiedAt: row.last_notified_at || row.created_at,
    createdAt: row.created_at,
  };
}

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function buildNotificationScope(input = {}) {
  const metadata = input.metadata || {};
  return (
    metadata.notificationScope ||
    metadata.issueId ||
    metadata.linkedIssueId ||
    metadata.feedbackUniqueKey ||
    metadata.feedbackId ||
    [input.type || 'info', input.title || '', input.message || ''].join('::')
  );
}

function getNotificationTimestamp(row) {
  return row.last_notified_at || row.created_at;
}

async function findRecentNotification(userId, payload, cooldownMinutes) {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
  const scope = buildNotificationScope(payload);
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', payload.type)
    .gte('last_notified_at', since)
    .order('last_notified_at', { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }

  return (data || []).find((row) => {
    const existingScope = buildNotificationScope({
      type: row.type,
      title: row.title,
      message: row.message,
      metadata: row.metadata || {},
    });
    return existingScope === scope && getNotificationTimestamp(row) >= since;
  }) || null;
}

async function createNotification(userId, input) {
  const cooldownMinutes = Math.max(
    1,
    Number(input.cooldownMinutes || DEFAULT_NOTIFICATION_COOLDOWN_MINUTES)
  );
  const payload = {
    user_id: userId,
    title: String(input.title || 'Agent update'),
    message: String(input.message || ''),
    type: String(input.type || 'info'),
    read: false,
    metadata: {
      ...(input.metadata || {}),
      notificationScope: buildNotificationScope(input),
    },
    last_notified_at: new Date().toISOString(),
  };

  const existingNotification = await findRecentNotification(
    userId,
    payload,
    cooldownMinutes
  );
  if (existingNotification) {
    return normalizeNotification(existingNotification);
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        id: `temp-${Date.now()}`,
        userId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
        read: false,
        metadata: payload.metadata,
        createdAt: payload.last_notified_at,
      };
    }
    throw error;
  }

  const notification = normalizeNotification(data);
  await publishSystemEvent({
    userId,
    type: 'notification_created',
    queueName: 'realtime',
    priority: 'normal',
    payload: {
      notification,
    },
  }).catch(() => null);

  return notification;
}

async function listNotifications(userId, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  const notifications = (data || []).map(normalizeNotification);
  return notifications;
}

async function markNotificationsRead(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .in('id', ids)
    .select('*');

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeNotification);
}

module.exports = {
  createNotification,
  listNotifications,
  markNotificationsRead,
};
