"use client";

import { useEffect, useMemo, useState } from "react";
import ReminderCard from "@/components/ReminderCard";
import ReminderFormModal from "@/components/ReminderFormModal";
import type { IssueDetail, Reminder } from "@/lib/api";
import { api } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Sparkles,
  Target,
  Users,
  TrendingUp,
  Activity,
  BarChart4,
  MessageCircle,
  Star,
  BellRing,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

function getIssueSentiment(issue: IssueDetail) {
  const counts = issue.feedbackMessages.reduce(
    (acc, feedback) => {
      acc[feedback.sentiment] = (acc[feedback.sentiment] || 0) + 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 } as Record<
      "positive" | "neutral" | "negative",
      number
    >
  );

  if (counts.positive >= counts.negative && counts.positive >= counts.neutral) {
    return {
      label: "Positive",
      variant: "success" as const,
      tone: "text-emerald-400",
    };
  }

  if (counts.neutral >= counts.negative) {
    return {
      label: "Neutral",
      variant: "secondary" as const,
      tone: "text-amber-300",
    };
  }

  return {
    label: "Negative",
    variant: "destructive" as const,
    tone: "text-rose-400",
  };
}

function getVelocity(issue: IssueDetail) {
  if (issue.trend === "stable") {
    return {
      label: "Stable",
      tone: "text-slate-300",
    };
  }

  if (issue.trend === "decreasing") {
    return {
      label: `-${Math.abs(issue.trendPercent)}% daily`,
      tone: "text-emerald-400",
    };
  }

  return {
    label: `+${Math.abs(issue.trendPercent)}% daily`,
    tone: "text-rose-400",
  };
}

function issueCategoryVariant(category: IssueDetail["category"]) {
  if (category === "Bug") return "destructive" as const;
  if (category === "Problem") return "secondary" as const;
  if (category === "Feature Request") return "default" as const;
  return "success" as const;
}

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [updatingReminderId, setUpdatingReminderId] = useState<string | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketMessage, setTicketMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = session?.access_token;
    const issueId = typeof params.id === "string" ? params.id : undefined;

    if (!token || !issueId) {
      setLoading(false);
      return;
    }

    const safeToken = token;
    const safeIssueId = issueId;

    let cancelled = false;

    async function loadIssue() {
      setLoading(true);
      setError(null);

      try {
        const data = await api.issues.getById(safeToken, safeIssueId);
        if (!cancelled) {
          setIssue(data);
        }
      } catch (err) {
        if (!cancelled) {
          setIssue(null);
          setError(toUserFacingError(err, "issue-detail-load"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadIssue();

    return () => {
      cancelled = true;
    };
  }, [params.id, session?.access_token]);

  useEffect(() => {
    const token = session?.access_token;
    const issueId = typeof params.id === "string" ? params.id : undefined;

    if (!token || !issueId) {
      setReminders([]);
      return;
    }

    const safeToken = token;
    const safeIssueId = issueId;

    let cancelled = false;

    async function loadReminders() {
      try {
        const data = await api.reminders.list(safeToken);
        if (!cancelled) {
          setReminders(
            data.filter((reminder) => reminder.linkedIssueId === safeIssueId)
          );
          setReminderError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setReminderError(toUserFacingError(err, "reminders-load"));
        }
      }
    }

    void loadReminders();

    return () => {
      cancelled = true;
    };
  }, [params.id, session?.access_token]);

  const metrics = useMemo(() => {
    if (!issue) return null;

    const velocity = getVelocity(issue);
    const sentiment = getIssueSentiment(issue);

    return {
      totalReports: issue.reportCount,
      sourceCount: issue.sources.length,
      velocity,
      sentiment,
    };
  }, [issue]);
  const topSources = useMemo(
    () =>
      issue
        ? Object.entries(issue.sourceBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
        : [],
    [issue]
  );
  const topLocations = useMemo(
    () =>
      issue && issue.locationBreakdown
        ? Object.entries(issue.locationBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
        : [],
    [issue]
  );

  const handleCreateReminder = async (payload: {
    title: string;
    description?: string;
    remind_at: string;
    linked_issue_id?: string | null;
    linked_ticket_id?: string | null;
  }) => {
    if (!session?.access_token) {
      setReminderError("Please sign in before creating a reminder.");
      return;
    }

    setCreatingReminder(true);
    setReminderError(null);

    try {
      const created = await api.reminders.create(session.access_token, payload);
      setReminders((current) =>
        [...current, created].sort(
          (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
        )
      );
      setIsReminderModalOpen(false);
    } catch (err) {
      setReminderError(toUserFacingError(err, "reminder-create"));
    } finally {
      setCreatingReminder(false);
    }
  };

  const handleUpdateReminderStatus = async (id: string) => {
    if (!session?.access_token) {
      setReminderError("Please sign in before updating a reminder.");
      return;
    }

    setUpdatingReminderId(id);

    try {
      const updated = await api.reminders.update(session.access_token, id, {
        status: "done",
      });
      setReminders((current) =>
        current.map((reminder) => (reminder.id === id ? updated : reminder))
      );
    } catch (err) {
      setReminderError(toUserFacingError(err, "reminder-update"));
    } finally {
      setUpdatingReminderId(null);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!session?.access_token) {
      setReminderError("Please sign in before deleting a reminder.");
      return;
    }

    setDeletingReminderId(id);

    try {
      await api.reminders.delete(session.access_token, id);
      setReminders((current) => current.filter((reminder) => reminder.id !== id));
    } catch (err) {
      setReminderError(toUserFacingError(err, "reminder-delete"));
    } finally {
      setDeletingReminderId(null);
    }
  };

  const handleCreateTicket = async () => {
    if (!session?.access_token || !issue) {
      setError("Please sign in before creating a ticket.");
      return;
    }

    setCreatingTicket(true);
    setTicketMessage(null);

    try {
      const createdTicket = await api.tickets.create(session.access_token, {
        title: issue.title,
        description: issue.summary,
        priority:
          issue.priority === "HIGH"
            ? "high"
            : issue.priority === "MEDIUM"
              ? "medium"
              : "low",
        linked_issue_id: issue.id,
      });

      setTicketMessage(
        `Ticket created successfully. Open it in Tickets & Actions: ${createdTicket.title}`
      );
    } catch (err) {
      setTicketMessage(toUserFacingError(err, "ticket-create"));
    } finally {
      setCreatingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl pb-24">
        <div className="space-y-4 pt-4">
          <Skeleton className="h-6 w-40 bg-slate-800" />
          <Skeleton className="h-10 w-3/4 bg-slate-900" />
          <Skeleton className="h-72 w-full rounded-2xl bg-slate-900" />
        </div>
      </div>
    );
  }

  if (!issue || !metrics) {
    return (
      <div className="mx-auto max-w-4xl pb-24 pt-8">
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-400">
          {error ?? "Issue details are not available yet."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <div className="mb-8 pt-4">
        <Link
          href="/dashboard"
          className="group mb-6 inline-flex items-center text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Control Room
        </Link>

        <div className="mb-4 flex items-center gap-3">
          <Badge variant="destructive">CRITICAL ALERT</Badge>
          <Badge
            variant={
              issueCategoryVariant(issue.category) as
                | "default"
                | "secondary"
                | "destructive"
                | "success"
            }
          >
            {issue.category}
          </Badge>
        </div>

        <h1 className="mb-2 text-3xl font-bold leading-tight text-white">
          {issue.title}
        </h1>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="col-span-1 space-y-6 md:col-span-2">
          <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-indigo-500/50">
            <div className="pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-bl-full bg-indigo-500/10" />
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400">
              <Sparkles className="h-4 w-4" />
              Intelligence Summary
            </div>
            <p className="relative z-10 text-lg leading-relaxed text-slate-300">
              {issue.summary}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-6 ring-1 ring-inset ring-emerald-500/20 shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0" />
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">
              <Target className="h-4 w-4" />
              Recommended Action
            </div>
            <p className="text-lg leading-relaxed font-medium text-emerald-50 lg:text-xl">
              {issue.suggestedActions[0]}
            </p>
            {ticketMessage && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {ticketMessage}
              </div>
            )}
            <div className="mt-5 flex items-center gap-3">
              <Button
                className="bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-500"
                onClick={() => void handleCreateTicket()}
                disabled={creatingTicket}
              >
                {creatingTicket ? "Creating Ticket..." : "Create Ticket"}
              </Button>
              <Button
                variant="secondary"
                className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                onClick={() => setIsReminderModalOpen(true)}
              >
                <BellRing className="h-4 w-4" />
                Set Reminder
              </Button>
              <Button variant="ghost" className="hover:bg-emerald-500/10 hover:text-emerald-400">
                Ignore
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Top Sources
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {topSources.length > 0 ? (
                  topSources.map(([source, count]) => (
                    <span
                      key={source}
                      className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200"
                    >
                      {source} · {count}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No source breakdown yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Top Locations
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {topLocations.length > 0 ? (
                  topLocations.map(([location, count]) => (
                    <span
                      key={location}
                      className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200"
                    >
                      {location} · {count}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No clear location concentration yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              Live Metrics
            </h3>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Activity className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Reports</span>
                </div>
                <span className="font-mono text-lg font-medium text-white">
                  {metrics.totalReports}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Sources</span>
                </div>
                <span className="font-mono font-medium text-white">
                  {metrics.sourceCount}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Velocity</span>
                </div>
                <span className={`font-mono font-medium ${metrics.velocity.tone}`}>
                  {metrics.velocity.label}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <BarChart4 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm">Sentiment</span>
                </div>
                <Badge
                  variant={
                    metrics.sentiment.variant as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "success"
                  }
                >
                  {metrics.sentiment.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Linked Reminders
          </h2>
          <Button variant="ghost" onClick={() => setIsReminderModalOpen(true)}>
            <BellRing className="h-4 w-4" />
            New Reminder
          </Button>
        </div>

        {reminderError && (
          <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {reminderError}
          </div>
        )}

        {reminders.length > 0 ? (
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                updating={updatingReminderId === reminder.id}
                deleting={deletingReminderId === reminder.id}
                onMarkDone={
                  reminder.status !== "done"
                    ? () => void handleUpdateReminderStatus(reminder.id)
                    : undefined
                }
                onDelete={() => void handleDeleteReminder(reminder.id)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-slate-400">
            No reminders linked to this issue yet.
          </div>
        )}
      </div>

      <div className="mt-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Raw Evidence Log
          </h2>
          <Button variant="ghost" className="px-3 py-1.5 text-xs text-indigo-400">
            Load More Threads
          </Button>
        </div>

        <div className="space-y-4">
          {issue.feedbackMessages.map((feedback) => (
            <div
              key={feedback.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-md bg-slate-800 px-2 py-1 text-sm font-medium text-slate-300">
                    <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                    {feedback.source}
                  </span>
                  <Badge
                    variant={
                      feedback.sentiment === "positive"
                        ? "success"
                        : feedback.sentiment === "neutral"
                          ? "secondary"
                          : "destructive"
                    }
                    className="capitalize"
                  >
                    {feedback.sentiment}
                  </Badge>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(feedback.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-slate-300">
                &ldquo;{feedback.text}&rdquo;
              </p>

              {feedback.source === "app-reviews" && (
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < 3 ? "fill-amber-400" : "fill-slate-800 text-slate-700"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ReminderFormModal
        open={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onCreate={handleCreateReminder}
        creating={creatingReminder}
        issueOptions={issue ? [{ id: issue.id, title: issue.title }] : []}
        defaultIssueId={issue?.id ?? null}
      />
    </div>
  );
}
