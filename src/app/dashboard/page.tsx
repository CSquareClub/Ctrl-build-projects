"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Filter, Navigation } from "lucide-react";
import AlertBanner from "@/components/AlertBanner";
import IssueCard from "@/components/IssueCard";
import LiveGraph from "@/components/LiveGraph";
import FeedbackStream from "@/components/FeedbackStream";
import StatsCards from "@/components/StatsCards";
import UpcomingRemindersWidget from "@/components/UpcomingRemindersWidget";
import { Button } from "@/components/ui/button";
import { useIssues } from "@/providers/IssuesProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { useAuth } from "@/providers/AuthProvider";
import { isDemoUser } from "@/lib/demo-mode";

type PriorityFilter = "all" | "HIGH" | "MEDIUM" | "LOW";
type SourceFilter = "all" | "gmail" | "app-reviews" | "instagram";
type TrendFilter = "all" | "increasing" | "stable" | "decreasing";

export default function DashboardPage() {
  const { loading, error } = useIssues();
  const { liveIssues, criticalAlerts } = useDashboardLive();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
  const demoModeActive = isDemoUser(user?.email ?? null);
  const hasLiveSignals = liveIssues.length > 0;

  const updateFilterParam = (
    key: "priority" | "source" | "trend",
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

        return matchesPriority && matchesSource && matchesTrend && matchesCategory;
      }),
    [categoryFilter, liveIssues, priorityFilter, sourceFilter, trendFilter]
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
  ].filter(Boolean).length;

  const resetFilters = () => {
    router.replace(pathname);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl pb-24">
        <div className="mb-10 flex flex-col gap-4 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-60 bg-slate-800" />
            <Skeleton className="h-5 w-80 bg-slate-900" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl bg-slate-900" />
          <Skeleton className="h-32 rounded-2xl bg-slate-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {demoModeActive && (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
              Demo Mode
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="hidden sm:flex"
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs text-indigo-300">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Listening globally
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Filter Issues
            </h2>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Category</span>
              <select
                value={categoryFilter}
                disabled
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-400 outline-none"
              >
                <option value="all">All categories</option>
                <option value="Bug">Bugs</option>
                <option value="Problem">Problems</option>
                <option value="Feature Request">Feature Requests</option>
                <option value="Praise">Praise</option>
              </select>
              {categoryFilter !== "all" && (
                <p className="text-xs text-slate-500">
                  Category came from the stat card you opened.
                </p>
              )}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Priority</span>
              <select
                value={priorityFilter}
                onChange={(event) =>
                  updateFilterParam("priority", event.target.value as PriorityFilter)
                }
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all">All priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) => updateFilterParam("source", event.target.value as SourceFilter)}
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all">All sources</option>
                <option value="gmail">Gmail</option>
                <option value="app-reviews">App Reviews</option>
                <option value="instagram">Instagram</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Trend</span>
              <select
                value={trendFilter}
                onChange={(event) => updateFilterParam("trend", event.target.value as TrendFilter)}
                className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all">All trends</option>
                <option value="increasing">Increasing</option>
                <option value="stable">Stable</option>
                <option value="decreasing">Decreasing</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-500">
          Critical Radar
        </h2>
        <div className="flex flex-col gap-4">
          {filteredCriticalAlerts.length > 0 ? (
            filteredCriticalAlerts
              .slice(0, 2)
              .map((issue) => <AlertBanner key={issue.id} issue={issue} />)
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-slate-400">
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

      <div className="mb-8">
        <UpcomingRemindersWidget />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Emerging Patterns
          </h2>
          <span className="text-sm text-slate-500">
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
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6">
            <p className="text-base font-medium text-white">Waiting for your first live signal</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Connect a source and run your first sync to start filling the Control Room with real issues, activity history, and feedback evidence.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/connect"
                className="inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Connect data sources
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-slate-400">
            No issues match the current filters.
          </div>
        )}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="group fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] transition-all hover:scale-105 hover:bg-indigo-500 hover:shadow-[0_0_25px_-5px_rgba(79,70,229,0.7)] lg:right-10 lg:bottom-10"
      >
        <Plus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="border-b border-slate-800/60 p-5">
              <h3 className="text-xl font-medium text-white">Ingest Feedback</h3>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div className="mb-2 flex gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3 text-sm text-indigo-400">
                  <Navigation className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p>
                    Paste raw feedback or telemetry data here. Our AI will
                    automatically categorize and bucket it into the right issue
                    stream.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">
                    Raw Source Material
                  </label>
                  <textarea
                    className="h-32 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
                    placeholder="e.g. 'The app keeps crashing when I try to save my profile picture since the new update!'"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">
                      Origin
                    </label>
                    <select className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-sm text-slate-100 transition-colors focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none">
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
