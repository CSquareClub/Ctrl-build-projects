"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReminderCard from "@/components/ReminderCard";
import type { Reminder, Ticket, TicketStatus } from "@/lib/api";

const statusLabel: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const statusTone: Record<TicketStatus, string> = {
  open: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  in_progress: "border-indigo-500/20 bg-indigo-500/10 text-indigo-300",
  resolved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
};

const priorityTone: Record<Ticket["priority"], string> = {
  low: "text-emerald-300",
  medium: "text-amber-300",
  high: "text-rose-300",
};

interface TicketCardProps {
  ticket: Ticket;
  reminders?: Reminder[];
  updating: boolean;
  deleting: boolean;
  onStatusChange: (status: TicketStatus) => void;
  onDelete: () => void;
  onMarkReminderDone?: (reminderId: string) => void;
  onDeleteReminder?: (reminderId: string) => void;
}

export default function TicketCard({
  ticket,
  reminders = [],
  updating,
  deleting,
  onStatusChange,
  onDelete,
  onMarkReminderDone,
  onDeleteReminder,
}: TicketCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone[ticket.status]}`}>
              {statusLabel[ticket.status]}
            </span>
            <span className={`text-xs font-medium uppercase tracking-[0.18em] ${priorityTone[ticket.priority]}`}>
              {ticket.priority}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{ticket.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">
            {ticket.description}
          </p>
        </div>

        <div className="text-xs text-slate-500">
          {new Date(ticket.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {ticket.linkedIssue ? (
          <Link
            href={`/dashboard/issues/${ticket.linkedIssue.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-indigo-300 transition hover:bg-indigo-500/15"
          >
            Linked Issue: {ticket.linkedIssue.title}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-slate-500">
            No linked issue yet
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={updating || ticket.status === "open"}
          onClick={() => onStatusChange("open")}
        >
          <Clock3 className="h-4 w-4" />
          Reopen
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={updating || ticket.status === "in_progress"}
          onClick={() => onStatusChange("in_progress")}
        >
          {updating && ticket.status !== "in_progress" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LoaderCircle className="h-4 w-4" />
          )}
          In Progress
        </Button>
        <Button
          size="sm"
          disabled={updating || ticket.status === "resolved"}
          onClick={() => onStatusChange("resolved")}
        >
          <CheckCircle2 className="h-4 w-4" />
          Mark Resolved
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          disabled={deleting}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {reminders.length > 0 && (
        <div className="mt-5 space-y-3 border-t border-slate-800/80 pt-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Linked Reminders
          </div>
          {reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              compact
              onMarkDone={
                reminder.status !== "done" && onMarkReminderDone
                  ? () => onMarkReminderDone(reminder.id)
                  : undefined
              }
              onDelete={onDeleteReminder ? () => onDeleteReminder(reminder.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
