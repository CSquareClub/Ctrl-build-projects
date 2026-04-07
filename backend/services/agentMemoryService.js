const supabase = require('../lib/supabaseClient');

const MEMORY_LIMIT_PER_USER = 120;

function isMissingRelationError(error) {
  return (
    error?.code === '42P01' ||
    String(error?.message || '')
      .toLowerCase()
      .includes('does not exist')
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function inferImportance(memoryType, content) {
  const text = JSON.stringify(content || {}).toLowerCase();
  let score = 0.35;

  if (memoryType === 'decision') score += 0.15;
  if (memoryType === 'chat') score -= 0.05;
  if (memoryType === 'action') score += 0.1;
  if (memoryType === 'issue') score += 0.12;
  if (text.includes('critical') || text.includes('high')) score += 0.18;
  if (text.includes('spike') || text.includes('escalat')) score += 0.12;
  if (text.includes('ticket') || text.includes('reminder') || text.includes('patch')) score += 0.1;

  return Number(clamp(score, 0.1, 1).toFixed(2));
}

function isImportantMemory(memoryType, content, importanceScore) {
  if (importanceScore >= 0.62) return true;

  const text = JSON.stringify(content || {}).toLowerCase();
  return (
    memoryType === 'decision' ||
    text.includes('critical') ||
    text.includes('spike') ||
    text.includes('predictive') ||
    text.includes('ticket')
  );
}

async function trimMemory(userId) {
  const { data, error } = await supabase
    .from('agent_memory')
    .select('id')
    .eq('user_id', userId)
    .order('importance_score', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return;
    }
    throw error;
  }

  const memoryRows = data || [];
  if (memoryRows.length <= MEMORY_LIMIT_PER_USER) {
    return;
  }

  const overflowIds = memoryRows.slice(MEMORY_LIMIT_PER_USER).map((row) => row.id);
  if (overflowIds.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase
    .from('agent_memory')
    .delete()
    .in('id', overflowIds);

  if (deleteError && !isMissingRelationError(deleteError)) {
    throw deleteError;
  }
}

async function storeAgentMemory(userId, memoryType, content, importanceScore = null) {
  const finalScore =
    importanceScore === null || importanceScore === undefined
      ? inferImportance(memoryType, content)
      : Number(clamp(importanceScore, 0, 1).toFixed(2));

  if (!isImportantMemory(memoryType, content, finalScore)) {
    return null;
  }

  const payload = {
    user_id: userId,
    memory_type: memoryType,
    content,
    importance_score: finalScore,
  };

  const { data, error } = await supabase
    .from('agent_memory')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        id: `memory-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
    }
    throw error;
  }

  await trimMemory(userId);
  return data || payload;
}

async function hasFeedbackActionMemory(userId, feedbackId, actionType) {
  if (!feedbackId || !actionType) {
    return false;
  }

  const { data, error } = await supabase
    .from('agent_memory')
    .select('id')
    .eq('user_id', userId)
    .eq('feedback_id', feedbackId)
    .eq('action_type', actionType)
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return false;
    }
    throw error;
  }

  return Boolean(data?.id);
}

async function recordFeedbackActionMemory(userId, feedbackId, actionType, content = {}) {
  if (!feedbackId || !actionType) {
    return null;
  }

  const payload = {
    user_id: userId,
    memory_type: 'action',
    action_type: actionType,
    feedback_id: feedbackId,
    content,
    importance_score: 0.7,
  };

  const { data, error } = await supabase
    .from('agent_memory')
    .upsert(payload, {
      onConflict: 'user_id,feedback_id,action_type',
    })
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return null;
    }
    throw error;
  }

  return data || payload;
}

async function hasRecentReplyMemory(userId, senderEmail, issueType, windowHours = 72) {
  const normalizedSender = String(senderEmail || '').trim().toLowerCase();
  const normalizedIssueType = String(issueType || '').trim().toLowerCase();

  if (!normalizedSender || !normalizedIssueType) {
    return false;
  }

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('agent_memory')
    .select('content, created_at')
    .eq('user_id', userId)
    .eq('action_type', 'email_reply_sent')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingRelationError(error)) {
      return false;
    }
    throw error;
  }

  return (data || []).some((row) => {
    const content = row.content || {};
    return (
      String(content.senderEmail || '').trim().toLowerCase() === normalizedSender &&
      String(content.issueType || '').trim().toLowerCase() === normalizedIssueType
    );
  });
}

async function hasRecentUserIssueActionMemory(
  userId,
  senderEmail,
  issueType,
  actionType,
  windowHours = 120
) {
  const normalizedSender = String(senderEmail || '').trim().toLowerCase();
  const normalizedIssueType = String(issueType || '').trim().toLowerCase();
  const normalizedActionType = String(actionType || '').trim().toLowerCase();

  if (!normalizedSender || !normalizedIssueType || !normalizedActionType) {
    return false;
  }

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('agent_memory')
    .select('content, created_at')
    .eq('user_id', userId)
    .eq('action_type', normalizedActionType)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingRelationError(error)) {
      return false;
    }
    throw error;
  }

  return (data || []).some((row) => {
    const content = row.content || {};
    return (
      String(content.senderEmail || '').trim().toLowerCase() === normalizedSender &&
      String(content.issueType || '').trim().toLowerCase() === normalizedIssueType
    );
  });
}

async function recordUserIssueActionMemory(
  userId,
  senderEmail,
  issueType,
  actionType,
  content = {}
) {
  const normalizedSender = String(senderEmail || '').trim().toLowerCase();
  const normalizedIssueType = String(issueType || '').trim().toLowerCase();
  const normalizedActionType = String(actionType || '').trim().toLowerCase();

  if (!normalizedSender || !normalizedIssueType || !normalizedActionType) {
    return null;
  }

  const payload = {
    user_id: userId,
    memory_type: 'action',
    action_type: normalizedActionType,
    content: {
      ...content,
      senderEmail: normalizedSender,
      issueType: normalizedIssueType,
    },
    importance_score: 0.68,
  };

  const { data, error } = await supabase
    .from('agent_memory')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return payload;
    }
    throw error;
  }

  return data || payload;
}

async function listMemoryHighlights(userId, options = {}) {
  const limit = Math.min(Number(options.limit || 8), 20);
  const queryText = String(options.query || '').trim().toLowerCase();
  const since = options.since || null;

  let query = supabase
    .from('agent_memory')
    .select('*')
    .eq('user_id', userId)
    .order('importance_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (since) {
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }
    throw error;
  }

  let rows = data || [];

  if (queryText) {
    rows = rows.filter((row) =>
      JSON.stringify(row.content || {}).toLowerCase().includes(queryText)
    );
  }

  return rows.slice(0, limit);
}

module.exports = {
  hasFeedbackActionMemory,
  hasRecentReplyMemory,
  hasRecentUserIssueActionMemory,
  inferImportance,
  listMemoryHighlights,
  recordFeedbackActionMemory,
  recordUserIssueActionMemory,
  storeAgentMemory,
};
