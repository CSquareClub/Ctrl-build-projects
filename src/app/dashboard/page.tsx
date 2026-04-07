"use client";

import { useEffect, useMemo, useState, type ChangeEventHandler, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Filter, Navigation, ChevronDown } from "lucide-react";
import { BellRing, Bot, CheckCircle2, Ticket } from "lucide-react";
import AlertBanner from "@/components/AlertBanner";
import SystemNotice from "@/components/SystemNotice";
import IssueCard from "@/components/IssueCard";
import LiveGraph from "@/components/LiveGraph";
import FeedbackStream from "@/components/FeedbackStream";
import StatsCards from "@/components/StatsCards";
import UpcomingRemindersWidget from "@/components/UpcomingRemindersWidget";
import { Button } from "@/components/ui/button";
import { useIssues } from "@/providers/IssuesProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { useAgent } from "@/providers/AgentProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { isDemoUser } from "@/lib/demo-mode";
import { useAgentCommandPanel } from "@/providers/AgentCommandPanelProvider";
import { DEMO_UI_MODE } from "@/lib/demo-ui-mode";

type PriorityFilter = "all" | "HIGH" | "MEDIUM" | "LOW";
type SourceFilter = "all" | "gmail" | "app-reviews" | "instagram";
type TrendFilter = "all" | "increasing" | "stable" | "decreasing";
type LifecycleFilter = "all" | "active" | "aging" | "stale" | "resolved";
type IssueTypeFilter = "all" | "personal" | "global";

function SelectShell({
  value,
  onChange,
  children,
  disabled = false,
  className = "",
}: {
  value: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm outline-none transition-all duration-150 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-800 dark:bg-[#121212] dark:text-slate-100 dark:focus:border-emerald-500/40 dark:disabled:bg-[#141414] dark:disabled:text-slate-500"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
    </div>
  );
}

export default function DashboardPage() {
  const { loading, error } = useIssues();
  const { liveIssues, criticalAlerts, agentActivity, tickets, reminders } = useDashboardLive();
  const { status: agentStatus } = useAgent();
  const { user } = useAuth();
  const { permission, requestPermission } = useNotifications();
  const { open: agentPanelOpen } = useAgentCommandPanel();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [notificationPromptDismissed, setNotificationPromptDismissed] = useState(false);
  const [showAgentBanner, setShowAgentBanner] = useState(false);
  const categoryFilter = useMemo(() => {
    const value = searchParams.get("category");
    return value === "Bug" ||
      value === "Problem" ||
      value === "Feature Request" ||
      value === "Praise"
      ? value
      : "all";
  }, [searchParams]);
  const priorityFilter = useMemo(() => {
    const value = searchParams.get("priority");
    return value === "HIGH" || value === "MEDIUM" || value === "LOW" ? value : "all";
  }, [searchParams]);
  const sourceFilter = useMemo(() => {
    const value = searchParams.get("source");
    return value === "gmail" ||
      value === "app-reviews" ||
      value === "instagram"
      ? value
      : "all";
  }, [searchParams]);
  const trendFilter = useMemo(() => {
    const value = searchParams.get("trend");
    return value === "increasing" || value === "stable" || value === "decreasing"
      ? value
      : "all";
  }, [searchParams]);
  const lifecycleFilter = useMemo(() => {
    const value = searchParams.get("status");
    return value === "all" || value === "active" || value === "aging" || value === "stale" || value === "resolved"
      ? value
      : "all";
  }, [searchParams]);
  const issueTypeFilter = useMemo(() => {
    const value = searchParams.get("issueType");
    return value === "personal" || value === "global" ? value : "all";
  }, [searchParams]);
  const demoModeActive = isDemoUser(user?.email ?? null);
  const hasLiveSignals = liveIssues.length > 0;
  const showNotificationBanner =
    permission === "default" && !notificationPromptDismissed;

  useEffect(() => {
    if (!agentStatus.latestBanner) {
      setShowAgentBanner(false);
      return;
    }

    const storageKey = `agent-banner-seen:${agentStatus.latestBanner}`;
    const alreadySeen = window.localStorage.getItem(storageKey);

    if (alreadySeen) {
      setShowAgentBanner(false);
      return;
    }

    setShowAgentBanner(true);
    window.localStorage.setItem(storageKey, "true");

    const timer = window.setTimeout(() => {
      setShowAgentBanner(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [agentStatus.latestBanner]);

  const updateFilterParam = (
    key: "priority" | "source" | "trend" | "status" | "issueType",
    value: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const filteredIssues = useMemo(
    () =>
      liveIssues.filter((issue) => {
        const matchesPriority =
          priorityFilter === "all" || issue.priority === priorityFilter;
        const matchesSource =
          sourceFilter === "all" || issue.sources.includes(sourceFilter);
        const matchesTrend = trendFilter === "all" || issue.trend === trendFilter;
        const matchesCategory =
          categoryFilter === "all" || issue.category === categoryFilter;
        const matchesIssueType =
          issueTypeFilter === "all" ||
          (issue.issueType || "global") === issueTypeFilter;
        const lifecycleStatus = issue.lifecycleStatus || "active";
        const matchesLifecycle =
          lifecycleFilter === "all"
            ? true
            : lifecycleFilter === "active"
            ? lifecycleStatus !== "resolved"
            : lifecycleStatus === lifecycleFilter;

        return (
          matchesPriority &&
          matchesSource &&
          matchesTrend &&
          matchesCategory &&
          matchesIssueType &&
          matchesLifecycle
        );
      }),
    [
      categoryFilter,
      issueTypeFilter,
      lifecycleFilter,
      liveIssues,
      priorityFilter,
      sourceFilter,
      trendFilter,
    ]
  );

  const filteredCriticalAlerts = useMemo(
    () =>
      criticalAlerts.filter((issue) =>
        filteredIssues.some((filteredIssue) => filteredIssue.id === issue.id)
      ),
    [criticalAlerts, filteredIssues]
  );

  const activeFilterCount = [
    categoryFilter !== "all",
    priorityFilter !== "all",
    sourceFilter !== "all",
    trendFilter !== "all",
    issueTypeFilter !== "all",
  ].filter(Boolean).length;

  const resetFilters = () => {
    router.replace(pathname);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl pb-24">
        <div className="mb-10 flex flex-col gap-4 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-60 bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-5 w-80 bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <Skeleton className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900" />
      </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {demoModeActive && !DEMO_UI_MODE ? null : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="hidden min-w-[180px] sm:block">
            <span className="sr-only">Issue lifecycle</span>
            <SelectShell
              value={lifecycleFilter}
              onChange={(event) =>
                updateFilterParam("status", event.target.value as LifecycleFilter)
              }
            >
              <option value="all">Lifecycle: All</option>
              <option value="active">Lifecycle: Active</option>
              <option value="aging">Lifecycle: Aging</option>
              <option value="stale">Lifecycle: Stale</option>
              <option value="resolved">Lifecycle: Resolved</option>
            </SelectShell>
          </label>
          <label className="hidden min-w-[190px] sm:block">
            <span className="sr-only">Issue classification</span>
            <SelectShell
              value={issueTypeFilter}
              onChange={(event) =>
                updateFilterParam("issueType", event.target.value as IssueTypeFilter)
              }
            >
              <option value="all">Classification: All Issues</option>
              <option value="personal">Classification: Personal</option>
              <option value="global">Classification: Global</option>
            </SelectShell>
          </label>
          <Button
            variant="secondary"
            className="hidden sm:flex"
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-xs text-red-600 dark:text-red-300">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            {agentStatus.enabled ? "Listening to feedback..." : "Autonomous actions paused"}
          </div>
        </div>
      </div>

      {showNotificationBanner && (
        <SystemNotice
          tone="warning"
          title="Enable notifications"
          message="AgenticPulse can notify you when the agent detects spikes, creates tickets, or schedules follow-ups."
          className="mb-6"
        >
          <div className="flex gap-3">
            <Button
              type="button"
              variant="default"
              onClick={() => void requestPermission()}
            >
              Enable Notifications
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotificationPromptDismissed(true)}
            >
              Dismiss
            </Button>
          </div>
        </SystemNotice>
      )}

      {agentStatus.latestBanner && showAgentBanner && (
        <SystemNotice
          tone="success"
          title="Created by Agent"
          message={agentStatus.latestBanner}
          className="mb-8 transition-opacity duration-200"
        />
      )}

      {showFilters && (
        <div className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Filter Issues
            </h2>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Category</span>
              <SelectShell
                value={categoryFilter}
                disabled
                className="opacity-70"
              >
                <option value="all">All categories</option>
                <option value="Bug">Bugs</option>
                <option value="Problem">Problems</option>
                <option value="Feature Request">Feature Requests</option>
                <option value="Praise">Praise</option>
              </SelectShell>
              {categoryFilter !== "all" && (
                <p className="text-xs text-slate-500">
                  Category came from the stat card you opened.
                </p>
              )}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Priority</span>
              <SelectShell
                value={priorityFilter}
                onChange={(event) =>
                  updateFilterParam("priority", event.target.value as PriorityFilter)
                }
              >
                <option value="all">All priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </SelectShell>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Source</span>
              <SelectShell
                value={sourceFilter}
                onChange={(event) => updateFilterParam("source", event.target.value as SourceFilter)}
              >
                <option value="all">All sources</option>
                <option value="gmail">Gmail</option>
                <option value="app-reviews">App Reviews</option>
                <option value="instagram">Instagram</option>
              </SelectShell>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Trend</span>
              <SelectShell
                value={trendFilter}
                onChange={(event) => updateFilterParam("trend", event.target.value as TrendFilter)}
              >
                <option value="all">All trends</option>
                <option value="increasing">Increasing</option>
                <option value="stable">Stable</option>
                <option value="decreasing">Decreasing</option>
              </SelectShell>
            </label>
          </div>
        </div>
      )}

      {error && (
        <SystemNotice tone="error" message={error} className="mb-6" />
      )}

      <div className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Critical Radar
        </h2>
        <div className="flex flex-col gap-4">
          {filteredCriticalAlerts.length > 0 ? (
            filteredCriticalAlerts
              .slice(0, 2)
              .map((issue) => <AlertBanner key={issue.id} issue={issue} />)
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-slate-500 dark:text-slate-400">
              No critical alerts right now.
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <StatsCards />
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <LiveGraph />
        <FeedbackStream />
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-transparent">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Agent Activity</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Latest automated reasoning and resolution flow.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </span>
          </div>
          <div className="space-y-3">
            {agentActivity.map((entry, index) => (
              <div key={entry} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{entry}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Step {index + 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-transparent">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Open Tickets</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Priority workstreams created from the current issue spike.
              </p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              <Ticket className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{ticket.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ticket.status}</p>
                  </div>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    {ticket.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <UpcomingRemindersWidget />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Emerging Patterns
          </h2>
          <span className="text-sm text-slate-400 dark:text-slate-500">
            {filteredIssues.length} issue{filteredIssues.length === 1 ? "" : "s"}
          </span>
        </div>
        {filteredIssues.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : !hasLiveSignals && !demoModeActive ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6">
            <p className="text-base font-medium text-slate-900 dark:text-white">Waiting for your first live signal</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Connect a source and run your first sync to start filling the Control Room with real issues, activity history, and feedback evidence.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/connect"
                className="inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Connect data sources
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-slate-500 dark:text-slate-400">
            No issues match the current filters.
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className={`group fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/25 transition-all hover:scale-105 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30 lg:right-10 lg:bottom-10 ${
          agentPanelOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={agentPanelOpen}
      >
        <Plus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-white/80 dark:bg-[#161616]/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a1a] shadow-2xl">
            <div className="border-b border-slate-200 dark:border-slate-800/60 p-5">
              <h3 className="text-xl font-medium text-slate-900 dark:text-white">Ingest Feedback</h3>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div className="mb-2 flex gap-3 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                  <Navigation className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p>
                    Paste raw feedback or telemetry data here. Our AI will
                    automatically categorize and bucket it into the right issue
                    stream.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Raw Source Material
                  </label>
                  <textarea
                    className="h-32 w-full resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors focus:border-red-300 dark:focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                    placeholder="e.g. 'The app keeps crashing when I try to save my profile picture since the new update!'"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                      Origin
                    </label>
                    <select className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-2.5 text-sm text-slate-900 dark:text-slate-100 transition-colors focus:border-red-300 dark:focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 focus:outline-none">
                      <option>Manual Entry</option>
                      <option>Intercom</option>
                      <option>Instagram</option>
                      <option>App Store</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                      User Sentiment
                    </label>
                    <select className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none">
                      <option>Auto-detect (AI)</option>
                      <option>Positive</option>
                      <option>Neutral</option>
                      <option>Negative</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full">Process &amp; Digest</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
