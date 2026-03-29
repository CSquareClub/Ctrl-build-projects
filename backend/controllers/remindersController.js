const supabase = require('../lib/supabaseClient');

const VALID_STATUSES = new Set(['pending', 'done']);

function normalizeReminder(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    remindAt: row.remind_at,
    status: row.status,
    linkedIssueId: row.linked_issue_id,
    linkedTicketId: row.linked_ticket_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedIssue: row.issues
      ? {
          id: row.issues.id,
          title: row.issues.title,
          priority: row.issues.priority,
        }
      : null,
    linkedTicket: row.tickets
      ? {
          id: row.tickets.id,
          title: row.tickets.title,
          status: row.tickets.status,
        }
      : null,
  };
}

async function ensureOwnedRecord(table, userId, recordId, label) {
  if (!recordId) {
    return null;
  }

  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', recordId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`${label} not found for this account.`);
  }

  return data.id;
}

async function fetchReminderById(userId, reminderId) {
  const { data, error } = await supabase
    .from('reminders')
    .select(
      'id, title, description, remind_at, status, linked_issue_id, linked_ticket_id, created_at, updated_at, issues(id, title, priority), tickets(id, title, status)'
    )
    .eq('id', reminderId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return normalizeReminder(data);
}

async function listReminders(req, res) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select(
        'id, title, description, remind_at, status, linked_issue_id, linked_ticket_id, created_at, updated_at, issues(id, title, priority), tickets(id, title, status)'
      )
      .eq('user_id', req.user.id)
      .order('remind_at', { ascending: true });

    if (error) throw error;

    res.json((data ?? []).map(normalizeReminder));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createReminder(req, res) {
  try {
    const title = String(req.body?.title || '').trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const remindAt = String(req.body?.remind_at || '').trim();
    const linkedIssueId = req.body?.linked_issue_id || null;
    const linkedTicketId = req.body?.linked_ticket_id || null;

    if (!title || !remindAt) {
      return res.status(400).json({ error: 'title and remind_at are required.' });
    }

    const parsed = new Date(remindAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'Invalid reminder date.' });
    }

    const ownedIssueId = await ensureOwnedRecord(
      'issues',
      req.user.id,
      linkedIssueId,
      'Linked issue'
    );
    const ownedTicketId = await ensureOwnedRecord(
      'tickets',
      req.user.id,
      linkedTicketId,
      'Linked ticket'
    );

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: req.user.id,
        title,
        description,
        remind_at: parsed.toISOString(),
        status: 'pending',
        linked_issue_id: ownedIssueId,
        linked_ticket_id: ownedTicketId,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    const reminder = await fetchReminderById(req.user.id, data.id);
    res.status(201).json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateReminder(req, res) {
  try {
    const statusInput = req.body?.status;
    if (statusInput === undefined) {
      return res.status(400).json({ error: 'status is required.' });
    }

    const status = String(statusInput).trim();
    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid reminder status.' });
    }

    const { error } = await supabase
      .from('reminders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    const reminder = await fetchReminderById(req.user.id, req.params.id);
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteReminder(req, res) {
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createReminder,
  deleteReminder,
  listReminders,
  updateReminder,
};
