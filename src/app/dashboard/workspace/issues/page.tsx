"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GitPullRequestArrow, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type WorkspaceDashboard } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";

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

export default function WorkspaceIssuesPage() {
  const { session } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { criticalAlerts } = useDashboardLive();

  const [data, setData] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const refreshInFlight = useRef(false);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";

  const refreshDashboard = useCallback(async () => {
    const token = session?.access_token;
    const workspaceId = activeWorkspace?.workspace.id;
    if (!token || !workspaceId) { setLoading(false); return; }
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setLoading(true);
    try {
      const next = await api.collaboration.dashboard(token, workspaceId);
      setData(next);
      setError(null);
    } catch (err) { setError(toUserFacingError(err, "issues-load")); }
    finally { refreshInFlight.current = false; setLoading(false); }
  }, [activeWorkspace?.workspace.id, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !activeWorkspace?.workspace.id) { setLoading(false); return; }
    void refreshDashboard();
  }, [activeWorkspace?.workspace.id, refreshDashboard, session?.access_token]);

  const filteredIssues = useMemo(() => {
    const all = data?.issues || [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((i) =>
      [i.title, i.summary, i.priority].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [data?.issues, search]);

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={GitPullRequestArrow} title="Shared Issues" tone={headingTone} />
          <span className="text-sm text-slate-400 dark:text-slate-500">
            {filteredIssues.length} issue{filteredIssues.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues by title, summary, or priority..."
            className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent pl-11 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Issue list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : filteredIssues.length ? (
          <div className="space-y-3">
            {filteredIssues.map((issue) => (
              <Link
                key={issue.id}
                href={`/dashboard/issues/${issue.id}`}
                className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{issue.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{issue.summary}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      <span>{issue.reportCount} reports</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span>{issue.trendPercent}% trend</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant={issue.priority === "HIGH" ? "destructive" : issue.priority === "MEDIUM" ? "secondary" : "outline"}>
                    {issue.priority}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
            {search ? "No issues matched your search." : "No issues shared in this workspace yet."}
          </div>
        )}
      </section>
    </div>
  );
}
