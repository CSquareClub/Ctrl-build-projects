"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BellRing } from "lucide-react";
import { api, type Reminder } from "@/lib/api";
import { DASHBOARD_DEMO_MODE, dashboardDemoReminders } from "@/lib/dashboard-demo";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";
import ReminderCard from "@/components/ReminderCard";

export default function UpcomingRemindersWidget() {
  const { session } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;

    if (!token) {
      return;
    }

    const safeToken = token;

    let cancelled = false;

    async function loadReminders() {
      if (DASHBOARD_DEMO_MODE) {
        if (!cancelled) {
          setReminders(dashboardDemoReminders);
          setError(null);
        }
        return;
      }

      try {
        const data = await api.reminders.list(safeToken);
        if (!cancelled) {
          setReminders(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "reminders-load"));
        }
      }
    }

    void loadReminders();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const upcoming = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.status === "pending")
        .sort(
          (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
        )
        .slice(0, 4),
    [reminders]
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Upcoming Reminders</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Follow-ups that need attention soon.
          </p>
        </div>
        <Link
          href="/dashboard/tickets"
          className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400 transition hover:text-red-700 dark:hover:text-red-300"
        >
          View all
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : upcoming.length > 0 ? (
        <div className="space-y-3">
          {upcoming.map((reminder) => (
            <ReminderCard key={reminder.id} reminder={reminder} compact />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-center">
          <BellRing className="mx-auto h-5 w-5 text-slate-400 dark:text-slate-500" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">No upcoming reminders</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Add reminders from Tickets & Actions to keep follow-ups visible.
          </p>
        </div>
      )}
    </div>
  );
}
