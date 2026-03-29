const crypto = require('crypto');
const supabase = require('../lib/supabaseClient');
const {
  detectSentiment,
  findGroup,
  rebuildIssuesFromFeedback,
} = require('../lib/issueAggregator');
const { extractLocation } = require('../services/locationService');

const VALID_STATUSES = new Set(['open', 'in_progress', 'resolved']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);

function normalizeTicket(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    linkedIssueId: row.linked_issue_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    linkedIssue: row.issues
      ? {
          id: row.issues.id,
          title: row.issues.title,
          priority: row.issues.priority,
        }
      : null,
  };
}

async function findLinkedIssueId(userId, title, description) {
  const ticketGroup = findGroup(`${title} ${description}`);
  const { data, error } = await supabase
    .from('issues')
    .select('id, title, summary, created_at')
    .eq('user_id', userId);

  if (error) throw error;

  const matchingIssue = (data ?? [])
    .filter((issue) => {
      const issueGroup = findGroup(`${issue.title || ''} ${issue.summary || ''}`);
      return issueGroup.slug === ticketGroup.slug;
    })
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

  return matchingIssue?.id ?? null;
}

async function listTickets(req, res) {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('id, title, description, status, priority, linked_issue_id, created_at, updated_at, issues(id, title, priority)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json((data ?? []).map(normalizeTicket));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createTicket(req, res) {
  try {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const priorityInput = String(req.body?.priority || 'medium').trim().toLowerCase();
    const priority = VALID_PRIORITIES.has(priorityInput) ? priorityInput : 'medium';
    const requestedLinkedIssueId = req.body?.linked_issue_id || null;
    const providedLocation = req.body?.location || null;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required.' });
    }

    let linkedIssueId = null;

    if (requestedLinkedIssueId) {
      const { data: ownedIssue, error: ownedIssueError } = await supabase
        .from('issues')
        .select('id')
        .eq('id', requestedLinkedIssueId)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (ownedIssueError) throw ownedIssueError;
      if (!ownedIssue) {
        linkedIssueId = null;
      } else {
        linkedIssueId = ownedIssue.id;
      }
    }

    const now = new Date().toISOString();
    const { data: insertedTicket, error: insertTicketError } = await supabase
      .from('tickets')
      .insert({
        user_id: req.user.id,
        title,
        description,
        priority,
        status: 'open',
        updated_at: now,
      })
      .select('*')
      .single();

    if (insertTicketError) throw insertTicketError;

    const externalId = `ticket-${insertedTicket.id}-${crypto.randomUUID()}`;
    const { error: feedbackError } = await supabase.from('feedback_events').insert({
      user_id: req.user.id,
      source: 'support_ticket',
      external_id: externalId,
      title,
      body: description,
      author: req.user.email || 'Ticket reporter',
      url: null,
      occurred_at: now,
      sentiment: detectSentiment(`${title} ${description}`),
      location: extractLocation({
        source: 'support_ticket',
        title,
        body: description,
        author: req.user.email || 'Ticket reporter',
        location: providedLocation,
      }),
      metadata: {
        isProductFeedback: true,
        ticketId: insertedTicket.id,
        priority,
      },
    });

    if (feedbackError) throw feedbackError;

    await rebuildIssuesFromFeedback(req.user.id);

    if (linkedIssueId) {
      const { data: refreshedIssue, error: refreshedIssueError } = await supabase
        .from('issues')
        .select('id')
        .eq('id', linkedIssueId)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (refreshedIssueError) throw refreshedIssueError;
      linkedIssueId = refreshedIssue?.id ?? null;
    }

    if (!linkedIssueId) {
      linkedIssueId = await findLinkedIssueId(req.user.id, title, description);
    }

    let finalTicket = insertedTicket;

    if (linkedIssueId) {
      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update({
          linked_issue_id: linkedIssueId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', insertedTicket.id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      finalTicket = updatedTicket;
    }

    const { data: ticketWithIssue, error: fetchError } = await supabase
      .from('tickets')
      .select('id, title, description, status, priority, linked_issue_id, created_at, updated_at, issues(id, title, priority)')
      .eq('id', finalTicket.id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(normalizeTicket(ticketWithIssue));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateTicket(req, res) {
  try {
    const statusInput = req.body?.status;
    const priorityInput = req.body?.priority;
    const update = {
      updated_at: new Date().toISOString(),
    };

    if (statusInput !== undefined) {
      const status = String(statusInput).trim();
      if (!VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Invalid ticket status.' });
      }
      update.status = status;
    }

    if (priorityInput !== undefined) {
      const priority = String(priorityInput).trim().toLowerCase();
      if (!VALID_PRIORITIES.has(priority)) {
        return res.status(400).json({ error: 'Invalid ticket priority.' });
      }
      update.priority = priority;
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(update)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, title, description, status, priority, linked_issue_id, created_at, updated_at, issues(id, title, priority)')
      .single();

    if (error) throw error;

    res.json(normalizeTicket(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function deleteTicket(req, res) {
  try {
    const { error } = await supabase
      .from('tickets')
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
  createTicket,
  deleteTicket,
  listTickets,
  updateTicket,
};
