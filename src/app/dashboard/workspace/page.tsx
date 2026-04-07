"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Users,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type WorkspaceDashboard,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useLiveEvents } from "@/providers/LiveEventsProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";

const REFRESH_INTERVAL_MS = 10_000;

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
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent",
          cls
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h2>
    </div>
  );
}

export default function WorkspaceOverviewPage() {
  const { session } = useAuth();
  const { subscribeToEvents } = useLiveEvents();
  const { criticalAlerts } = useDashboardLive();
  const {
    activeWorkspace,
    loading: workspaceLoading,
    refreshWorkspaces,
    setActiveWorkspaceId,
    workspaces,
  } = useWorkspace();

  const [data, setData] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const refreshInFlight = useRef(false);

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
      } finally {
        refreshInFlight.current = false;
        setLoading(false);
      }
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

  /* ─── actions ─── */

  const handleCreateWorkspace = async () => {
    if (!session?.access_token || !workspaceName.trim()) return;
    setBusy(true);
    try {
      const response = await api.collaboration.createWorkspace(session.access_token, workspaceName.trim());
      await refreshWorkspaces({ silent: true });
      setActiveWorkspaceId(response.workspace.id);
      setWorkspaceName("");
    } catch (err) { setError(toUserFacingError(err, "issues-load")); }
    finally { setBusy(false); }
  };

  const handleJoinWorkspace = async () => {
    if (!session?.access_token || !inviteCode.trim()) return;
    setBusy(true);
    try {
      const response = await api.collaboration.joinWorkspace(session.access_token, inviteCode.trim().toUpperCase());
      await refreshWorkspaces({ silent: true });
      setActiveWorkspaceId(response.workspace.id);
      setInviteCode("");
    } catch (err) { setError(toUserFacingError(err, "issues-load")); }
    finally { setBusy(false); }
  };

  const pendingApprovals = useMemo(
    () => (data?.approvals || []).filter((e) => e.status === "pending"),
    [data?.approvals]
  );

  /* ─── render ─── */

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Section: Overview Stats ── */}
      <section className="space-y-5">
        <SectionHeading icon={Eye} title="Workspace Overview" tone={headingTone} />

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Members</p>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "—" : data?.members.length ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Active Issues</p>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "—" : data?.issues.length ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Pending Requests</p>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "—" : pendingApprovals.length}
            </p>
            {pendingApprovals.length > 0 && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" /> needs attention
              </span>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Recent Events</p>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
              {loading ? "—" : data?.activity.length ?? 0}
            </p>
          </div>
        </div>
      </section>

      {/* ── Section: Workspace Selector ── */}
      <section className="space-y-5">
        <SectionHeading icon={Users} title="Workspaces" tone={headingTone} />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Create */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Create Workspace</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Start a new shared space for your team.
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Platform team"
                className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Button
                variant="outline"
                onClick={handleCreateWorkspace}
                disabled={busy || !workspaceName.trim()}
                className={cn("border", primaryButtonTone)}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>

          {/* Join */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Join Workspace</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Enter an invite code from your team.
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="INVITE CODE"
                className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Button
                variant="outline"
                onClick={handleJoinWorkspace}
                disabled={busy || !inviteCode.trim()}
                className={neutralButtonTone}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
              </Button>
            </div>
          </div>
        </div>

        {/* Workspace chips */}
        <div className="flex flex-wrap gap-3">
          {workspaceLoading ? (
            <Skeleton className="h-10 w-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ) : (
            workspaces.map((entry) => {
              const isActive = activeWorkspace?.workspace.id === entry.workspace.id;
              return (
                <button
                  key={entry.workspace.id}
                  type="button"
                  onClick={() => setActiveWorkspaceId(entry.workspace.id)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 text-red-700 dark:text-red-300 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <div className="text-sm font-medium">{entry.workspace.name}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    {entry.role}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ── Section: Recent Activity Snapshot ── */}
      <section className="space-y-5">
        <SectionHeading icon={Activity} title="Recent Activity" tone={headingTone} />

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : data?.activity.length ? (
          <div className="space-y-3">
            {data.activity.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{entry.summary}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <Badge variant="outline" className="text-[10px]">
                        {entry.actorType}
                      </Badge>
                      <span>{entry.actionType.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </span>
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
