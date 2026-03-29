"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, Plus } from "lucide-react";
import ReminderCard from "@/components/ReminderCard";
import ReminderFormModal from "@/components/ReminderFormModal";
import TicketCard from "@/components/TicketCard";
import TicketFormModal from "@/components/TicketFormModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type Reminder,
  type ReminderStatus,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";
import { useIssues } from "@/providers/IssuesProvider";

export default function TicketsPage() {
  const { session } = useAuth();
  const { issues, refreshIssues } = useIssues();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingReminderId, setUpdatingReminderId] = useState<string | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!session?.access_token) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextTickets = await api.tickets.list(session.access_token);
      setTickets(nextTickets);
    } catch (err) {
      setError(toUserFacingError(err, "tickets-load"));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const loadReminders = useCallback(async () => {
    if (!session?.access_token) {
      setReminders([]);
      return;
    }

    try {
      const nextReminders = await api.reminders.list(session.access_token);
      setReminders(nextReminders);
    } catch (err) {
      setError(toUserFacingError(err, "reminders-load"));
    }
  }, [session?.access_token]);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  const handleCreateTicket = useCallback(
    async (payload: {
      title: string;
      description: string;
      priority: TicketPriority;
    }) => {
      if (!session?.access_token) {
        setError("Please sign in before creating a ticket.");
        return;
      }

      setCreating(true);
      setError(null);

      try {
        const created = await api.tickets.create(session.access_token, payload);
        setTickets((current) => [created, ...current]);
        setIsModalOpen(false);
        void refreshIssues();
      } catch (err) {
        setError(toUserFacingError(err, "ticket-create"));
      } finally {
        setCreating(false);
      }
    },
    [refreshIssues, session?.access_token]
  );

  const handleCreateReminder = useCallback(
    async (payload: {
      title: string;
      description?: string;
      remind_at: string;
      linked_issue_id?: string | null;
      linked_ticket_id?: string | null;
    }) => {
      if (!session?.access_token) {
        setError("Please sign in before creating a reminder.");
        return;
      }

      setCreatingReminder(true);
      setError(null);

      try {
        const created = await api.reminders.create(session.access_token, payload);
        setReminders((current) =>
          [...current, created].sort(
            (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
          )
        );
        setIsReminderModalOpen(false);
      } catch (err) {
        setError(toUserFacingError(err, "reminder-create"));
      } finally {
        setCreatingReminder(false);
      }
    },
    [session?.access_token]
  );

  const handleUpdateStatus = useCallback(
    async (id: string, status: TicketStatus) => {
      if (!session?.access_token) {
        setError("Please sign in before updating a ticket.");
        return;
      }

      setUpdatingId(id);
      setError(null);

      try {
        const updated = await api.tickets.update(session.access_token, id, { status });
        setTickets((current) =>
          current.map((ticket) => (ticket.id === id ? updated : ticket))
        );
      } catch (err) {
        setError(toUserFacingError(err, "ticket-update"));
      } finally {
        setUpdatingId(null);
      }
    },
    [session?.access_token]
  );

  const handleUpdateReminderStatus = useCallback(
    async (id: string, status: ReminderStatus) => {
      if (!session?.access_token) {
        setError("Please sign in before updating a reminder.");
        return;
      }

      setUpdatingReminderId(id);
      setError(null);

      try {
        const updated = await api.reminders.update(session.access_token, id, { status });
        setReminders((current) =>
          current.map((reminder) => (reminder.id === id ? updated : reminder))
        );
      } catch (err) {
        setError(toUserFacingError(err, "reminder-update"));
      } finally {
        setUpdatingReminderId(null);
      }
    },
    [session?.access_token]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!session?.access_token) {
        setError("Please sign in before deleting a ticket.");
        return;
      }

      setDeletingId(id);
      setError(null);

      try {
        await api.tickets.delete(session.access_token, id);
        setTickets((current) => current.filter((ticket) => ticket.id !== id));
      } catch (err) {
        setError(toUserFacingError(err, "ticket-delete"));
      } finally {
        setDeletingId(null);
      }
    },
    [session?.access_token]
  );

  const handleDeleteReminder = useCallback(
    async (id: string) => {
      if (!session?.access_token) {
        setError("Please sign in before deleting a reminder.");
        return;
      }

      setDeletingReminderId(id);
      setError(null);

      try {
        await api.reminders.delete(session.access_token, id);
        setReminders((current) => current.filter((reminder) => reminder.id !== id));
      } catch (err) {
        setError(toUserFacingError(err, "reminder-delete"));
      } finally {
        setDeletingReminderId(null);
      }
    },
    [session?.access_token]
  );

  const upcomingReminders = reminders
    .slice()
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Tickets & Actions
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Create internal tickets, route them into the feedback pipeline, and keep product actions linked to the right issue stream.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setIsReminderModalOpen(true)}>
            <BellRing className="h-4 w-4" />
            Create Reminder
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Create Ticket
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-2xl bg-slate-900" />
          <Skeleton className="h-44 rounded-2xl bg-slate-900" />
        </div>
      ) : tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              reminders={reminders.filter((reminder) => reminder.linkedTicketId === ticket.id)}
              updating={updatingId === ticket.id}
              deleting={deletingId === ticket.id}
              onStatusChange={(status) => void handleUpdateStatus(ticket.id, status)}
              onDelete={() => void handleDelete(ticket.id)}
              onMarkReminderDone={(reminderId) =>
                void handleUpdateReminderStatus(reminderId, "done")
              }
              onDeleteReminder={(reminderId) => void handleDeleteReminder(reminderId)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-base font-medium text-white">No tickets yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Create your first internal ticket to push a structured action into Product Pulse.
          </p>
          <div className="mt-5">
            <Button onClick={() => setIsModalOpen(true)}>Create First Ticket</Button>
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Linked issues open in the existing issue detail view so your team can move from action to evidence without leaving the dashboard.
        </p>
      )}

      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Reminders
          </h2>
          <Button variant="ghost" onClick={() => setIsReminderModalOpen(true)}>
            <BellRing className="h-4 w-4" />
            New Reminder
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl bg-slate-900" />
            <Skeleton className="h-28 rounded-2xl bg-slate-900" />
          </div>
        ) : upcomingReminders.length > 0 ? (
          <div className="space-y-4">
            {upcomingReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                updating={updatingReminderId === reminder.id}
                deleting={deletingReminderId === reminder.id}
                onMarkDone={
                  reminder.status !== "done"
                    ? () => void handleUpdateReminderStatus(reminder.id, "done")
                    : undefined
                }
                onDelete={() => void handleDeleteReminder(reminder.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
            <p className="text-base font-medium text-white">No reminders yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Add follow-ups here for issues, tickets, or standalone actions.
            </p>
          </div>
        )}
      </div>

      <TicketFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateTicket}
        creating={creating}
      />
      <ReminderFormModal
        open={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onCreate={handleCreateReminder}
        creating={creatingReminder}
        issueOptions={issues.map((issue) => ({ id: issue.id, title: issue.title }))}
        ticketOptions={tickets.map((ticket) => ({ id: ticket.id, title: ticket.title }))}
      />
    </div>
  );
}
