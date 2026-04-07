"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type ApprovalRequest,
  type WorkspaceDashboard,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

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

function approvalVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "destructive" as const;
  return "secondary" as const;
}

export default function WorkspaceRequestsPage() {
  const { session } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { criticalAlerts } = useDashboardLive();

  const [data, setData] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [approvalLoadingId, setApprovalLoadingId] = useState<string | null>(null);
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

  const handleApproval = async (approval: ApprovalRequest, status: "approved" | "rejected") => {
    if (!session?.access_token) return;
    setApprovalLoadingId(approval.id);
    try {
      const response = await api.collaboration.updateApproval(session.access_token, approval.id, status);
      setData((c) => c ? { ...c, approvals: c.approvals.map((e) => e.id === approval.id ? response.approval : e) } : c);
    } catch (err) { setError(toUserFacingError(err, "ticket-update")); }
    finally { setApprovalLoadingId(null); }
  };

  const filteredApprovals = useMemo(() => {
    const all = data?.approvals || [];
    if (filter === "all") return all;
    return all.filter((e) => e.status === filter);
  }, [data?.approvals, filter]);

  const pendingCount = useMemo(
    () => (data?.approvals || []).filter((e) => e.status === "pending").length,
    [data?.approvals]
  );

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: `Pending (${pendingCount})` },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={ShieldCheck} title="Agent Requests" tone={headingTone} />
          <span className="text-sm text-slate-400 dark:text-slate-500">
            AI governance layer
          </span>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          AI suggests actions. Your team approves. AgenticPulse executes under supervision.
        </p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                filter === f.key
                  ? primaryButtonTone
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Approvals list */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : filteredApprovals.length ? (
          <div className="space-y-3">
            {filteredApprovals.map((approval) => (
              <div
                key={approval.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {approval.actionType.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {approval.reasoning || "AI suggested this action based on recent issue pressure."}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span>{new Date(approval.createdAt).toLocaleString()}</span>
                      {approval.resolvedAt && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Resolved {new Date(approval.resolvedAt).toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={approvalVariant(approval.status)}>
                    {approval.status}
                  </Badge>
                </div>

                {approval.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproval(approval, "approved")}
                      disabled={approvalLoadingId === approval.id || data?.role === "viewer"}
                      className={cn("border", primaryButtonTone)}
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApproval(approval, "rejected")}
                      disabled={approvalLoadingId === approval.id || data?.role === "viewer"}
                      className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
            {filter === "all"
              ? "No approval requests yet."
              : `No ${filter} requests.`}
          </div>
        )}
      </section>
    </div>
  );
}
