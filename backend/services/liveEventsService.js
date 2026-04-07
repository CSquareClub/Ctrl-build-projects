const { EventEmitter } = require('events');
const supabase = require('../lib/supabaseClient');

const liveEventEmitter = new EventEmitter();
liveEventEmitter.setMaxListeners(200);

function isMissingRelationError(error) {
  return (
    error?.code === '23503' ||
    error?.code === '42P01' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function normalizeEvent(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.event_type,
    queue: row.queue_name || null,
    priority: row.priority || 'normal',
    payload: row.payload || {},
    createdAt: row.created_at,
  };
}

async function persistEvent(input) {
  const { data, error } = await supabase
    .from('system_events')
    .insert({
      user_id: input.userId,
      event_type: input.type,
      queue_name: input.queueName || null,
      priority: input.priority || 'normal',
      payload: input.payload || {},
    })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        id: `temp-${Date.now()}`,
        userId: input.userId,
        type: input.type,
        queue: input.queueName || null,
        priority: input.priority || 'normal',
        payload: input.payload || {},
        createdAt: new Date().toISOString(),
      };
    }
    throw error;
  }

  return normalizeEvent(data);
}

async function publishSystemEvent(input) {
  const event = await persistEvent(input);
  liveEventEmitter.emit(`user:${input.userId}`, event);
  liveEventEmitter.emit('broadcast', event);
  return event;
}

function subscribeToUserEvents(userId, handler) {
  const channel = `user:${userId}`;
  liveEventEmitter.on(channel, handler);
  return () => liveEventEmitter.off(channel, handler);
}

async function listRecentEvents(userId, options = {}) {
  let query = supabase
    .from('system_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(options.limit || 50);

  if (options.since) {
    query = query.gt('created_at', options.since);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  return (data || []).map(normalizeEvent);
}

module.exports = {
  listRecentEvents,
  publishSystemEvent,
  subscribeToUserEvents,
};
