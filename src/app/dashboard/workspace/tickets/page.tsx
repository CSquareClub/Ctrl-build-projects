"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, ChevronDown, Plus, Ticket } from "lucide-react";
import ReminderCard from "@/components/ReminderCard";
import ReminderFormModal from "@/components/ReminderFormModal";
import TicketCard from "@/components/TicketCard";
import TicketFormModal from "@/components/TicketFormModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type Reminder,
  type ReminderStatus,
  type Ticket as TicketType,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useIssues } from "@/providers/IssuesProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";

type TicketFilter = "active" | "open" | "in_progress" | "resolved" | "all";

const ticketFilterLabels: Record<TicketFilter, string> = {
  active: "Active",
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  all: "All",
};

function SectionHeading({
  icon: Icon,
  title,
  tone = "bad",
}: {
  icon: React.ElementType;
  title: string;
  tone?: SystemHealthTone;
}) {
  const cls =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent", cls)}>
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    </div>
  );
}

export default function WorkspaceTicketsPage() {
  const { session } = useAuth();
  const { issues, refreshIssues } = useIssues();
  const { criticalAlerts } = useDashboardLive();

  const [tickets, setTickets] = useState<TicketType[]>([]);
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
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>("active");

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";

  const primaryButtonTone =
    chromeTone === "good"
      ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/15"
      : chromeTone === "warning"
        ? "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/15"
        : "border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/15";

  const neutralButtonTone =
    "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/[0.04]";

  /* ─── data loading ─── */

  const loadTickets = useCallback(async () => {
    if (!session?.access_token) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const nextTickets = await api.tickets.list(session.access_token);
      setTickets(nextTickets);
    } catch (err) { setError(toUserFacingError(err, "tickets-load")); }
    finally { setLoading(false); }
  }, [session?.access_token]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const loadReminders = useCallback(async () => {
    if (!session?.access_token) { setReminders([]); return; }
    try {
      const nextReminders = await api.reminders.list(session.access_token);
      setReminders(nextReminders);
    } catch (err) { setError(toUserFacingError(err, "reminders-load")); }
  }, [session?.access_token]);

  useEffect(() => { void loadReminders(); }, [loadReminders]);

  /* ─── actions ─── */

  const handleCreateTicket = useCallback(
    async (payload: { title: string; description: string; priority: TicketPriority }) => {
      if (!session?.access_token) { setError("Please sign in before creating a ticket."); return; }
      setCreating(true); setError(null);
      try {
        const created = await api.tickets.create(session.access_token, payload);
        setTickets((c) => [created, ...c]);
        setIsModalOpen(false);
        void refreshIssues();
      } catch (err) { setError(toUserFacingError(err, "ticket-create")); }
      finally { setCreating(false); }
    },
    [refreshIssues, session?.access_token]
  );

  const handleCreateReminder = useCallback(
    async (payload: { title: string; description?: string; remind_at: string; linked_issue_id?: string | null; linked_ticket_id?: string | null }) => {
      if (!session?.access_token) { setError("Please sign in before creating a reminder."); return; }
      setCreatingReminder(true); setError(null);
      try {
        const created = await api.reminders.create(session.access_token, payload);
        setReminders((c) => [...c, created].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()));
        setIsReminderModalOpen(false);
      } catch (err) { setError(toUserFacingError(err, "reminder-create")); }
      finally { setCreatingReminder(false); }
    },
    [session?.access_token]
  );

  const handleUpdateStatus = useCallback(
    async (id: string, status: TicketStatus) => {
      if (!session?.access_token) { setError("Please sign in."); return; }
      setUpdatingId(id); setError(null);
      try {
        const updated = await api.tickets.update(session.access_token, id, { status });
        setTickets((c) => c.map((t) => (t.id === id ? updated : t)));
        void refreshIssues({ silent: true });
      } catch (err) { setError(toUserFacingError(err, "ticket-update")); }
      finally { setUpdatingId(null); }
    },
    [session?.access_token]
  );

  const handleUpdateReminderStatus = useCallback(
    async (id: string, status: ReminderStatus) => {
      if (!session?.access_token) { setError("Please sign in."); return; }
      setUpdatingReminderId(id); setError(null);
      try {
        const updated = await api.reminders.update(session.access_token, id, { status });
        setReminders((c) => c.map((r) => (r.id === id ? updated : r)));
      } catch (err) { setError(toUserFacingError(err, "reminder-update")); }
      finally { setUpdatingReminderId(null); }
    },
    [session?.access_token]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!session?.access_token) { setError("Please sign in."); return; }
      setDeletingId(id); setError(null);
      try { await api.tickets.delete(session.access_token, id); setTickets((c) => c.filter((t) => t.id !== id)); }
      catch (err) { setError(toUserFacingError(err, "ticket-delete")); }
      finally { setDeletingId(null); }
    },
    [session?.access_token]
  );

  const handleDeleteReminder = useCallback(
    async (id: string) => {
      if (!session?.access_token) { setError("Please sign in."); return; }
      setDeletingReminderId(id); setError(null);
      try { await api.reminders.delete(session.access_token, id); setReminders((c) => c.filter((r) => r.id !== id)); }
      catch (err) { setError(toUserFacingError(err, "reminder-delete")); }
      finally { setDeletingReminderId(null); }
    },
    [session?.access_token]
  );

  const upcomingReminders = reminders
    .slice()
    .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  const filteredTickets = tickets.filter((ticket) => {
    if (ticketFilter === "all") return true;
    if (ticketFilter === "active") return ticket.status === "open" || ticket.status === "in_progress";
    return ticket.status === ticketFilter;
  });

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Tickets ── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Ticket} title="Tickets" tone={headingTone} />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsReminderModalOpen(true)} className={neutralButtonTone}>
              <BellRing className="h-4 w-4" />
              Reminder
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)} className={cn("border", primaryButtonTone)}>
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create internal tickets, route them into the feedback pipeline, and keep product actions linked to the right issue stream.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-900 dark:text-white">{ticketFilterLabels[ticketFilter]}</span> tickets
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className={cn("justify-between gap-3", neutralButtonTone)}>
                  <span>Status: {ticketFilterLabels[ticketFilter]}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent
              align="end"
              sideOffset={10}
              className="w-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a1a] p-2 text-slate-900 dark:text-slate-100 shadow-2xl"
            >
              {(["active", "open", "in_progress", "resolved", "all"] as TicketFilter[]).map((option) => (
                <DropdownMenuItem
                  key={option}
                  className={cn(
                    "rounded-xl px-3 py-2 focus:bg-slate-100 dark:focus:bg-white/[0.04]",
                    ticketFilter === option
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-300"
                  )}
                  onClick={() => setTicketFilter(option)}
                >
                  {ticketFilterLabels[option]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                reminders={reminders.filter((r) => r.linkedTicketId === ticket.id)}
                updating={updatingId === ticket.id}
                deleting={deletingId === ticket.id}
                onStatusChange={(status) => void handleUpdateStatus(ticket.id, status)}
                onDelete={() => void handleDelete(ticket.id)}
                onMarkReminderDone={(rid) => void handleUpdateReminderStatus(rid, "done")}
                onDeleteReminder={(rid) => void handleDeleteReminder(rid)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-8 text-center">
            <p className="text-base font-medium text-slate-900 dark:text-white">
              {tickets.length > 0 ? `No ${ticketFilterLabels[ticketFilter].toLowerCase()} tickets` : "No tickets yet"}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {tickets.length > 0
                ? "Try another status filter or create a new ticket."
                : "Create your first internal ticket to push a structured action into AgenticPulse."}
            </p>
            {tickets.length === 0 && (
              <div className="mt-5">
                <Button variant="outline" onClick={() => setIsModalOpen(true)} className={cn("border", primaryButtonTone)}>
                  Create First Ticket
                </Button>
              </div>
            )}
          </div>
        )}

        {tickets.length > 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Linked issues open in the issue detail view so your team can move from action to evidence.
          </p>
        )}
      </section>

      {/* ── Reminders ── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={BellRing} title="Reminders" tone={headingTone} />
          <Button variant="outline" size="sm" onClick={() => setIsReminderModalOpen(true)} className={neutralButtonTone}>
            <BellRing className="h-4 w-4" />
            New Reminder
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
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
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-8 text-center">
            <p className="text-base font-medium text-slate-900 dark:text-white">No reminders yet</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Add follow-ups for issues, tickets, or standalone actions.
            </p>
          </div>
        )}
      </section>

      {/* ── Modals ── */}
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
