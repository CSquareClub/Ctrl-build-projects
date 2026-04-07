"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Bot, RefreshCw, User2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type WorkspaceDashboard } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useLiveEvents } from "@/providers/LiveEventsProvider";
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

function actorIcon(type: string) {
  if (type === "agent" || type === "ai") return <Bot className="h-3.5 w-3.5" />;
  if (type === "system") return <Zap className="h-3.5 w-3.5" />;
  return <User2 className="h-3.5 w-3.5" />;
}

function actorBadgeClass(type: string) {
  if (type === "agent" || type === "ai")
    return "border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400";
  if (type === "system")
    return "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
}

function timeAgo(dateString: string) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const REFRESH_INTERVAL_MS = 8_000;

export default function WorkspaceActivityPage() {
  const { session } = useAuth();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const { subscribeToEvents } = useLiveEvents();
  const { criticalAlerts } = useDashboardLive();

  const [data, setData] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";

  const neutralButtonTone =
    "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/[0.04]";

  const refreshDashboard = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = session?.access_token;
      const workspaceId = activeWorkspace?.workspace.id;
      if (!token || !workspaceId) { setLoading(false); return; }
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      if (!options?.silent) setLoading(true);
      try {
        const next = await api.collaboration.dashboard(token, workspaceId);
        setData(next);
        if (!options?.silent) setError(null);
      } catch (err) {
        if (!options?.silent) setError(toUserFacingError(err, "issues-load"));
      } finally { refreshInFlight.current = false; setLoading(false); }
    },
    [activeWorkspace?.workspace.id, session?.access_token]
  );

  useEffect(() => {
    if (!session?.access_token || !activeWorkspace?.workspace.id) { setLoading(false); return; }
    void refreshDashboard();
  }, [activeWorkspace?.workspace.id, refreshDashboard, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !activeWorkspace?.workspace.id) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshDashboard({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [activeWorkspace?.workspace.id, refreshDashboard, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !activeWorkspace?.workspace.id) return;
    return subscribeToEvents(() => void refreshDashboard({ silent: true }), {
      types: ["agent_action", "notification_created", "patch_accepted", "job_completed"],
    });
  }, [activeWorkspace?.workspace.id, refreshDashboard, session?.access_token, subscribeToEvents]);

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Activity} title="Live Activity" tone={headingTone} />
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <span className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void Promise.all([
                refreshWorkspaces({ silent: true }),
                refreshDashboard({ silent: true }),
              ])}
              className={neutralButtonTone}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real-time feed of AI actions, user decisions, and system updates across your workspace.
        </p>

        {/* Activity timeline */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : data?.activity.length ? (
          <div className="relative space-y-3">
            {/* Timeline line */}
            <div className="absolute left-6 top-4 bottom-4 hidden w-px bg-slate-200 dark:bg-slate-800 lg:block" />

            {data.activity.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors lg:ml-12 relative"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[3.25rem] top-6 hidden h-3 w-3 items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161616] lg:flex">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{entry.summary}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                        actorBadgeClass(entry.actorType)
                      )}>
                        {actorIcon(entry.actorType)}
                        {entry.actorType}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {entry.actionType.replace(/_/g, " ")}
                      </Badge>
                      {entry.entityType && (
                        <Badge variant="outline" className="text-[10px]">
                          {entry.entityType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {timeAgo(entry.createdAt)}
                    </span>
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
            Activity will appear here as the team and AI interact.
          </div>
        )}
      </section>
    </div>
  );
}
