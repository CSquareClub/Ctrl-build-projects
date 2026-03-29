"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Reminder } from "@/lib/api";

function formatRelativeTime(remindAt: string) {
  const date = new Date(remindAt);
  const diff = date.getTime() - Date.now();
  const minutes = Math.round(diff / 60000);

  if (minutes < 0) {
    const overdueMinutes = Math.abs(minutes);
    if (overdueMinutes < 60) return `${overdueMinutes} min overdue`;
    const hours = Math.round(overdueMinutes / 60);
    if (hours < 24) return `${hours}h overdue`;
    const days = Math.round(hours / 24);
    return `${days}d overdue`;
  }

  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

interface ReminderCardProps {
  reminder: Reminder;
  compact?: boolean;
  updating?: boolean;
  deleting?: boolean;
  onMarkDone?: () => void;
  onDelete?: () => void;
}

export default function ReminderCard({
  reminder,
  compact = false,
  updating = false,
  deleting = false,
  onMarkDone,
  onDelete,
}: ReminderCardProps) {
  const [renderedAt] = useState(() => Date.now());
  const overdue =
    reminder.status === "pending" &&
    new Date(reminder.remindAt).getTime() < renderedAt;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        overdue
          ? "border-rose-500/30 bg-rose-500/8"
          : reminder.status === "done"
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                reminder.status === "done"
                  ? "bg-emerald-500/10 text-emerald-300"
                  : overdue
                    ? "bg-rose-500/10 text-rose-300"
                    : "bg-amber-500/10 text-amber-300"
              }`}
            >
              {reminder.status === "done"
                ? "Done"
                : overdue
                  ? "Overdue"
                  : "Pending"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Clock3 className="h-3.5 w-3.5" />
              {formatRelativeTime(reminder.remindAt)}
            </span>
          </div>

          <h4 className="mt-3 text-sm font-semibold text-white">{reminder.title}</h4>
          {!compact && reminder.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              {reminder.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {reminder.linkedIssue && (
              <Link
                href={`/dashboard/issues/${reminder.linkedIssue.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-indigo-300"
              >
                <Link2 className="h-3 w-3" />
                Issue: {reminder.linkedIssue.title}
              </Link>
            )}
            {reminder.linkedTicket && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-slate-300">
                <Link2 className="h-3 w-3" />
                Ticket: {reminder.linkedTicket.title}
              </span>
            )}
          </div>
        </div>

        {!compact && (
          <div className="flex items-center gap-2">
            {reminder.status !== "done" && onMarkDone && (
              <Button variant="secondary" size="sm" disabled={updating} onClick={onMarkDone}>
                <CheckCircle2 className="h-4 w-4" />
                Mark Done
              </Button>
            )}
            {onDelete && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
