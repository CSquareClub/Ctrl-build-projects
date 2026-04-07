"use client";

import { useEffect, useMemo, useState } from "react";
import AgentTrustPanel from "@/components/AgentTrustPanel";
import DecisionFeedbackBar from "@/components/DecisionFeedbackBar";
import IssueCollaborationPanel from "@/components/IssueCollaborationPanel";
import ReminderCard from "@/components/ReminderCard";
import ReminderFormModal from "@/components/ReminderFormModal";
import InspectionActivityPanel from "@/components/InspectionActivityPanel";
import InspectionResultCard from "@/components/InspectionResultCard";
import type {
  AgentConfidenceResult,
  InspectionActivity,
  InspectionResult,
  IssueDetail,
  Reminder,
} from "@/lib/api";
import { api } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ShieldCheck,
  GitBranch,
  Bot,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Eye,
  FileCode2,
  Layers,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useSetup } from "@/providers/SetupProvider";
import { useLiveEvents } from "@/providers/LiveEventsProvider";
import { useIssues } from "@/providers/IssuesProvider";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────── */
/*  Helpers                                           */
/* ────────────────────────────────────────────────── */

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

  if (counts.positive >= counts.negative && counts.positive >= counts.neutral)
    return { label: "Positive", variant: "success" as const, tone: "text-emerald-600 dark:text-emerald-400" };
  if (counts.neutral >= counts.negative)
    return { label: "Neutral", variant: "secondary" as const, tone: "text-amber-600 dark:text-amber-400" };
  return { label: "Negative", variant: "destructive" as const, tone: "text-red-600 dark:text-red-400" };
}

function getVelocity(issue: IssueDetail) {
  const movement = Math.abs(issue.trendPercent);
  if (issue.category === "Praise")
    return {
      label:
        issue.trend === "decreasing"
          ? `${movement}% less praise than last week`
          : movement >= 12
            ? `+${movement}% positive momentum`
            : "Positive signal holding steady",
      tone:
        issue.trend === "decreasing"
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
    };
  if (issue.trend === "stable" || movement < 12)
    return { label: "Stable", tone: "text-slate-600 dark:text-slate-300" };
  if (issue.trend === "decreasing")
    return { label: `-${movement}% week over week`, tone: "text-emerald-600 dark:text-emerald-400" };
  return { label: `+${movement}% week over week`, tone: "text-red-600 dark:text-red-400" };
}

function issueCategoryVariant(category: IssueDetail["category"]) {
  if (category === "Bug") return "destructive" as const;
  if (category === "Problem") return "secondary" as const;
  if (category === "Feature Request") return "default" as const;
  return "success" as const;
}

function confidenceVariant(level?: string | null) {
  if (level === "high") return "success" as const;
  if (level === "medium") return "secondary" as const;
  return "destructive" as const;
}

function priorityColor(p: string) {
  if (p === "HIGH") return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  if (p === "MEDIUM") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400";
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400";
}

function statusColor(s?: string) {
  if (s === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (s === "new") return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400";
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400";
}

/* ────────────────────────────────────────────────── */
/*  Section wrapper                                   */
/* ────────────────────────────────────────────────── */

function Section({
  icon: Icon,
  title,
  children,
  className,
  accentColor = "text-slate-500 dark:text-slate-400",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]",
        className
      )}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className={cn("h-4 w-4", accentColor)} strokeWidth={1.9} />
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────── */
/*  Page                                              */
/* ────────────────────────────────────────────────── */

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { refreshIssues } = useIssues();
  const { status: setupStatus } = useSetup();
  const { subscribeToEvents } = useLiveEvents();
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [confidence, setConfidence] = useState<AgentConfidenceResult | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [updatingReminderId, setUpdatingReminderId] = useState<string | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [ticketMessage, setTicketMessage] = useState<string | null>(null);
  const [inspectionActivity, setInspectionActivity] = useState<InspectionActivity[]>([]);
  const [inspectionResults, setInspectionResults] = useState<InspectionResult[]>([]);
  const [startingInspection, setStartingInspection] = useState(false);
  const [inspectionStatus, setInspectionStatus] = useState<string | null>(null);
  const [inspectionMessage, setInspectionMessage] = useState<string | null>(null);
  const [updatingIssueStatus, setUpdatingIssueStatus] = useState(false);

  /* ── Data loading ── */

  useEffect(() => {
    const token = session?.access_token;
    const issueId = typeof params.id === "string" ? params.id : undefined;
    if (!token || !issueId) { setLoading(false); return; }
    const safeToken = token;
    const safeIssueId = issueId;
    let cancelled = false;
    async function loadIssue() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.issues.getById(safeToken, safeIssueId);
        if (!cancelled) setIssue(data);
      } catch (err) {
        if (!cancelled) { setIssue(null); setError(toUserFacingError(err, "issue-detail-load")); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadIssue();
    return () => { cancelled = true; };
  }, [params.id, session?.access_token]);

  useEffect(() => {
    const token = session?.access_token;
    const issueId = typeof params.id === "string" ? params.id : undefined;
    if (!token || !issueId) { setInspectionActivity([]); setInspectionResults([]); return; }
    const safeToken = token;
    const safeIssueId = issueId;
    let cancelled = false;
    async function loadInspectionData() {
      try {
        const [activityResponse, resultResponse] = await Promise.all([
          api.inspect.activity(safeToken, { issueId: safeIssueId, limit: 12 }),
          api.inspect.results(safeToken, { issueId: safeIssueId, limit: 3 }),
        ]);
        if (!cancelled) { setInspectionActivity(activityResponse.activity); setInspectionResults(resultResponse.results); }
      } catch {
        if (!cancelled) { setInspectionActivity([]); setInspectionResults([]); }
      }
    }
    void loadInspectionData();
    return () => { cancelled = true; };
  }, [params.id, session?.access_token]);

  useEffect(() => {
    const issueId = typeof params.id === "string" ? params.id : undefined;
    if (!issueId) return;
    return subscribeToEvents(
      (event) => {
        const payloadIssueId = typeof event.payload?.issueId === "string" ? event.payload.issueId : null;
        if (payloadIssueId && payloadIssueId !== issueId) return;
        if (event.type === "inspection.activity") {
          setInspectionActivity((current) => {
            const next = [event.payload as unknown as InspectionActivity, ...current.filter((item) => item.id !== String(event.payload?.id || ""))];
            return next.slice(0, 12);
          });
          return;
        }
        if (event.type === "inspection.result") {
          setInspectionResults((current) => {
            const next = [event.payload as unknown as InspectionResult, ...current.filter((item) => item.id !== String(event.payload?.id || ""))];
            return next.slice(0, 3);
          });
          setInspectionStatus("completed");
          setInspectionMessage("Inspection completed");
          setStartingInspection(false);
          return;
        }
        if (event.type === "inspection.status") {
          const state = typeof event.payload?.state === "string" ? event.payload.state : "queued";
          const message = typeof event.payload?.message === "string" ? event.payload.message : "Inspection update received";
          setInspectionStatus(state);
          setInspectionMessage(message);
          if (state === "completed" || state === "failed") setStartingInspection(false);
        }
      },
      { types: ["inspection.activity", "inspection.result", "inspection.status"] }
    );
  }, [params.id, subscribeToEvents]);

  useEffect(() => {
    const token = session?.access_token;
    const issueId = typeof params.id === "string" ? params.id : undefined;
    if (!token || !issueId) { setConfidence(null); return; }
    const safeToken = token;
    const safeIssueId = issueId;
    let cancelled = false;
    async function loadConfidence() {
      try { const data = await api.agent.confidence(safeToken, safeIssueId); if (!cancelled) setConfidence(data); }
      catch { if (!cancelled) setConfidence(null); }
    }
    void loadConfidence();
    return () => { cancelled = true; };
  }, [params.id, session?.access_token]);

  useEffect(() => {
    const token = session?.access_token;
    const issueId = typeof params.id === "string" ? params.id : undefined;
    if (!token || !issueId) { setReminders([]); return; }
    const safeToken = token;
    const safeIssueId = issueId;
    let cancelled = false;
    async function loadReminders() {
      try {
        const data = await api.reminders.list(safeToken);
        if (!cancelled) { setReminders(data.filter((r) => r.linkedIssueId === safeIssueId)); setReminderError(null); }
      } catch (err) { if (!cancelled) setReminderError(toUserFacingError(err, "reminders-load")); }
    }
    void loadReminders();
    return () => { cancelled = true; };
  }, [params.id, session?.access_token]);

  /* ── Derived ── */

  const metrics = useMemo(() => {
    if (!issue) return null;
    return { totalReports: issue.reportCount, sourceCount: issue.sources.length, velocity: getVelocity(issue), sentiment: getIssueSentiment(issue) };
  }, [issue]);

  const topSources = useMemo(
    () => (issue ? Object.entries(issue.sourceBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4) : []),
    [issue]
  );

  const topLocations = useMemo(
    () => (issue?.locationBreakdown ? Object.entries(issue.locationBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4) : []),
    [issue]
  );

  /* ── Actions ── */

  const handleStartInspection = async () => {
    if (!session?.access_token || !issue) { setInspectionMessage("Please sign in before starting an inspection."); setInspectionStatus("failed"); return; }
    const fallbackUrl = setupStatus?.websiteUrl || (typeof window !== "undefined" ? `${window.location.origin}/login` : "");
    setStartingInspection(true);
    setInspectionStatus("queued");
    setInspectionMessage("Inspecting issue...");
    try {
      const response = await api.inspect.start(session.access_token, { issueId: issue.id, issue: issue.title, url: fallbackUrl, context: { page: issue.title, steps: [] } });
      setInspectionMessage(response.message);
      setInspectionStatus("queued");
    } catch (err) { setInspectionMessage(toUserFacingError(err, "inspection-start")); setInspectionStatus("failed"); setStartingInspection(false); }
  };

  useEffect(() => {
    if (!issue || !session?.access_token) return;
    if (searchParams.get("inspect") !== "1") return;
    if (startingInspection || inspectionStatus === "queued" || inspectionStatus === "running") return;
    void handleStartInspection();
  }, [issue, session?.access_token, searchParams, setupStatus?.websiteUrl, startingInspection, inspectionStatus]);

  const handleCreateReminder = async (payload: { title: string; description?: string; remind_at: string; linked_issue_id?: string | null; linked_ticket_id?: string | null }) => {
    if (!session?.access_token) { setReminderError("Please sign in before creating a reminder."); return; }
    setCreatingReminder(true);
    setReminderError(null);
    try {
      const created = await api.reminders.create(session.access_token, payload);
      setReminders((current) => [...current, created].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()));
      setIsReminderModalOpen(false);
    } catch (err) { setReminderError(toUserFacingError(err, "reminder-create")); }
    finally { setCreatingReminder(false); }
  };

  const handleUpdateReminderStatus = async (id: string) => {
    if (!session?.access_token) { setReminderError("Please sign in before updating a reminder."); return; }
    setUpdatingReminderId(id);
    try {
      const updated = await api.reminders.update(session.access_token, id, { status: "done" });
      setReminders((current) => current.map((r) => (r.id === id ? updated : r)));
    } catch (err) { setReminderError(toUserFacingError(err, "reminder-update")); }
    finally { setUpdatingReminderId(null); }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!session?.access_token) { setReminderError("Please sign in before deleting a reminder."); return; }
    setDeletingReminderId(id);
    try { await api.reminders.delete(session.access_token, id); setReminders((current) => current.filter((r) => r.id !== id)); }
    catch (err) { setReminderError(toUserFacingError(err, "reminder-delete")); }
    finally { setDeletingReminderId(null); }
  };

  const handleCreateTicket = async () => {
    if (!session?.access_token || !issue) { setError("Please sign in before creating a ticket."); return; }
    setCreatingTicket(true);
    setTicketMessage(null);
    try {
      const createdTicket = await api.tickets.create(session.access_token, {
        title: issue.title,
        description: issue.summary,
        priority: issue.priority === "HIGH" ? "high" : issue.priority === "MEDIUM" ? "medium" : "low",
        linked_issue_id: issue.id,
      });
      setTicketMessage(`Ticket created successfully: ${createdTicket.title}`);
    } catch (err) { setTicketMessage(toUserFacingError(err, "ticket-create")); }
    finally { setCreatingTicket(false); }
  };

  const handleIssueStatusUpdate = async () => {
    if (!session?.access_token || !issue || updatingIssueStatus) return;
    setUpdatingIssueStatus(true);
    setError(null);
    try {
      const updated = await api.issues.update(session.access_token, issue.id, { status: issue.lifecycleStatus === "resolved" ? "active" : "resolved" });
      setIssue((current) => current ? { ...current, lifecycleStatus: updated.lifecycleStatus, resolvedAt: updated.resolvedAt, updatedAt: updated.updatedAt } : current);
      await refreshIssues({ silent: true });
    } catch (err) { setError(toUserFacingError(err, "issue-update")); }
    finally { setUpdatingIssueStatus(false); }
  };

  /* ── Loading / Error ── */

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl pb-24">
        <div className="space-y-4 pt-4">
          <Skeleton className="h-6 w-40 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50" />
          <Skeleton className="h-10 w-3/4 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50" />
          <Skeleton className="h-72 w-full rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50" />
        </div>
      </div>
    );
  }

  if (!issue || !metrics) {
    return (
      <div className="mx-auto max-w-5xl pb-24 pt-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error ?? "Issue details are not available yet."}
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────── */
  /*  Render                                            */
  /* ────────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-5xl pb-24">
      {/* ══════════ 1. TOP HEADER ══════════ */}
      <div className="mb-8 pt-4">
        <Link
          href="/dashboard"
          className="group mb-6 inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Control Room
        </Link>

        {/* ── Badges row ── */}
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <Badge variant={issueCategoryVariant(issue.category) as "default" | "secondary" | "destructive" | "success"}>
            {issue.category}
          </Badge>
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", priorityColor(issue.priority))}>
            <AlertTriangle className="h-3 w-3" />
            {issue.priority}
          </span>
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", statusColor(issue.lifecycleStatus))}>
            {issue.lifecycleStatus === "resolved" ? <CheckCircle2 className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
            {issue.lifecycleStatus ?? "active"}
          </span>
          {confidence && (
            <Tooltip>
              <TooltipTrigger className="inline-flex">
                <Badge
                  variant={confidenceVariant(confidence.confidence_level)}
                  className="rounded-full px-3 py-1 text-xs"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {confidence.confidence_score}% Confidence
                </Badge>
              </TooltipTrigger>
              <TooltipContent>How confident the system is in this classification</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* ── Title ── */}
        <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white lg:text-3xl">
          {issue.title}
        </h1>

        {/* ── Action bar ── */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void handleIssueStatusUpdate()}
            disabled={updatingIssueStatus}
            className={cn(
              "h-10 rounded-xl text-sm",
              issue.lifecycleStatus === "resolved"
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.04]"
                : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950"
            )}
          >
            {issue.lifecycleStatus === "resolved" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {updatingIssueStatus
                ? (issue.lifecycleStatus === "resolved" ? "Reopening..." : "Resolving...")
                : (issue.lifecycleStatus === "resolved" ? "Reopen" : "Resolved")}
            </Button>
          <Button
            variant="secondary"
            className="h-10 rounded-xl text-sm"
            onClick={() => void handleStartInspection()}
            disabled={startingInspection}
          >
            <Bot className="h-4 w-4" />
            {startingInspection
              ? inspectionStatus === "running" ? "AI analyzing..." : "Inspecting..."
              : "Inspect with AI"}
          </Button>
          <Link href={`/dashboard/github?issueId=${issue.id}`} className="inline-flex">
            <Button variant="secondary" className="h-10 rounded-xl text-sm">
              <GitBranch className="h-4 w-4" />
              View Patch
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="h-10 rounded-xl text-sm"
            onClick={() => void handleCreateTicket()}
            disabled={creatingTicket}
          >
            {creatingTicket ? "Creating..." : "Create Ticket"}
          </Button>
        </div>

        {ticketMessage && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {ticketMessage}
          </div>
        )}
        {inspectionMessage && (
          <div className={cn("mt-3 rounded-xl border px-4 py-2.5 text-sm",
            inspectionStatus === "failed"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
              : inspectionStatus === "completed"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
          )}>
            {inspectionMessage}
          </div>
        )}
      </div>

      {/* ══════════ 2. MAIN CONTENT GRID ══════════ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* ── LEFT COLUMN — scrollable content ── */}
        <div className="min-w-0 space-y-6">

          {/* ── S1: Issue Overview ── */}
          <Section icon={Sparkles} title="Issue Overview" accentColor="text-emerald-600 dark:text-emerald-400">
            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
              {issue.summary}
            </p>
          </Section>

          {/* ── S2: What Happened ── */}
          {inspectionResults[0] && (
            <Section icon={Eye} title="What Happened" accentColor="text-blue-600 dark:text-blue-400">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Observed Behavior</p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{inspectionResults[0].observedBehavior}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-500/80 dark:text-red-400/70">Suspected Cause</p>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{inspectionResults[0].suspectedCause}</p>
                </div>
              </div>
            </Section>
          )}

          {/* ── S3: Why This Decision (AI Reasoning) ── */}
          {confidence && <AgentTrustPanel confidence={confidence} />}

          {/* ── S4: Suggested Action ── */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-6 ring-1 ring-inset ring-emerald-200/80 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:ring-emerald-500/20">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0" />
            <div className="mb-3 flex items-center gap-2.5">
              <Target className="h-4 w-4 text-emerald-700 dark:text-emerald-400" strokeWidth={1.9} />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                Recommended Action
              </h3>
            </div>
            <p className="text-lg font-medium leading-relaxed text-emerald-900 dark:text-emerald-50 lg:text-xl">
              {issue.suggestedActions[0]}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Button
                className="h-10 rounded-xl bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-500"
                onClick={() => void handleCreateTicket()}
                disabled={creatingTicket}
              >
                {creatingTicket ? "Creating Ticket..." : "Create Ticket"}
              </Button>
              <Button
                variant="secondary"
                className="h-10 rounded-xl border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
                onClick={() => setIsReminderModalOpen(true)}
              >
                <BellRing className="h-4 w-4" />
                Set Reminder
              </Button>
              <Button variant="ghost" className="h-10 rounded-xl text-slate-500 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400">
                Ignore
              </Button>
            </div>
            {confidence?.issue_type && (
              <div className="mt-5">
                <DecisionFeedbackBar token={session?.access_token} issueType={confidence.issue_type} />
              </div>
            )}
          </div>

          {/* ── S5: Code Patch (GitHub) ── */}
          <Section icon={FileCode2} title="Code Patch" accentColor="text-violet-600 dark:text-violet-400">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Trace this issue into code, review a patch, and create a pull request safely from the GitHub workspace.
                </p>
              </div>
              <Link href={`/dashboard/github?issueId=${issue.id}`} className="inline-flex shrink-0">
                <Button variant="secondary" className="h-10 rounded-xl text-sm">
                  <GitBranch className="h-4 w-4" />
                  Open GitHub Workspace
                </Button>
              </Link>
            </div>
          </Section>

          {/* ── S6: Signals & Data ── */}
          <Section icon={Layers} title="Signals & Data" accentColor="text-amber-600 dark:text-amber-400">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Top Sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {topSources.length > 0 ? (
                    topSources.map(([source, count]) => (
                      <span key={source} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-200">
                        {source} · {count}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">No source breakdown yet.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Top Locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {topLocations.length > 0 ? (
                    topLocations.map(([location, count]) => (
                      <span key={location} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-200">
                        <MapPin className="mr-1 inline-block h-3 w-3" />{location} · {count}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">No clear location concentration yet.</p>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* ── Live agent activity ── */}
          <InspectionActivityPanel items={inspectionActivity} />

          {/* ── Full inspection result ── */}
          {inspectionResults[0] && <InspectionResultCard result={inspectionResults[0]} />}

          {/* ── Collaboration ── */}
          <IssueCollaborationPanel issueId={issue.id} />

          {/* ── S7: Timeline / Evidence ── */}
          <Section icon={Clock} title="Evidence Log" accentColor="text-slate-500 dark:text-slate-400">
            <div className="space-y-3">
              {issue.feedbackMessages.map((feedback) => (
                <div
                  key={feedback.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.1]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
                        <MessageCircle className="h-3 w-3 text-slate-400" />
                        {feedback.source}
                      </span>
                      <Badge variant={feedback.sentiment === "positive" ? "success" : feedback.sentiment === "neutral" ? "secondary" : "destructive"} className="capitalize text-[10px]">
                        {feedback.sentiment}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {new Date(feedback.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    &ldquo;{feedback.text}&rdquo;
                  </p>
                  {feedback.source === "app-reviews" && (
                    <div className="mt-2 flex items-center gap-0.5 text-amber-500 dark:text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < 3 ? "fill-amber-500 dark:fill-amber-400" : "fill-slate-200 text-slate-300 dark:fill-slate-800 dark:text-slate-700"}`} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* ── Linked reminders ── */}
          <Section icon={BellRing} title="Linked Reminders" accentColor="text-orange-600 dark:text-orange-400">
            {reminderError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {reminderError}
              </div>
            )}
            {reminders.length > 0 ? (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    updating={updatingReminderId === reminder.id}
                    deleting={deletingReminderId === reminder.id}
                    onMarkDone={reminder.status !== "done" ? () => void handleUpdateReminderStatus(reminder.id) : undefined}
                    onDelete={() => void handleDeleteReminder(reminder.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400">
                No reminders linked to this issue yet.
              </div>
            )}
            <Button variant="ghost" className="mt-3 text-sm" onClick={() => setIsReminderModalOpen(true)}>
              <BellRing className="h-4 w-4" />
              New Reminder
            </Button>
          </Section>
        </div>

        {/* ── RIGHT COLUMN — Live Metrics (sticky) ── */}
        <div className="hidden lg:block">
          <div className="sticky top-28 space-y-4">

            {/* Live Metrics */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Live Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Activity className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Reports
                  </div>
                  <span className="font-mono text-lg font-semibold text-slate-900 dark:text-white">
                    {metrics.totalReports}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Sources
                  </div>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {metrics.sourceCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <TrendingUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Velocity
                  </div>
                  <span className={cn("text-xs font-medium", metrics.velocity.tone)}>
                    {metrics.velocity.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <BarChart4 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    Sentiment
                  </div>
                  <Badge variant={metrics.sentiment.variant as "default" | "secondary" | "destructive" | "success"}>
                    {metrics.sentiment.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Created</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                {issue.lastSeenAt && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Last seen</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(issue.lastSeenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                )}
                {issue.resolvedAt && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Resolved</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(issue.resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Reminder modal ── */}
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
