"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type WorkspaceDashboard,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/lib/api";
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

function roleColor(role: WorkspaceRole) {
  if (role === "owner") return "text-red-600 dark:text-red-400";
  if (role === "admin") return "text-amber-600 dark:text-amber-400";
  if (role === "developer") return "text-emerald-600 dark:text-emerald-400";
  return "text-slate-500 dark:text-slate-400";
}

export default function WorkspaceMembersPage() {
  const { session } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { criticalAlerts } = useDashboardLive();

  const [data, setData] = useState<WorkspaceDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  const handleRoleChange = async (member: WorkspaceMember, role: WorkspaceRole) => {
    if (!session?.access_token || !activeWorkspace?.workspace.id) return;
    try {
      const response = await api.collaboration.updateMemberRole(
        session.access_token, activeWorkspace.workspace.id, member.userId, role
      );
      setData((c) => c ? { ...c, members: c.members.map((e) => e.userId === member.userId ? response.member : e) } : c);
    } catch (err) { setError(toUserFacingError(err, "ticket-update")); }
  };

  const handleCopy = () => {
    if (!activeWorkspace?.workspace.inviteCode) return;
    void navigator.clipboard.writeText(activeWorkspace.workspace.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Users} title="Members" tone={headingTone} />
          <span className="text-sm text-slate-400 dark:text-slate-500">
            {data?.members.length ?? 0} total
          </span>
        </div>

        {/* Invite code */}
        {activeWorkspace && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-4 transition-colors">
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Invite Code
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white tracking-widest">
                {activeWorkspace.workspace.inviteCode}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-700"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Member list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : data?.members.length ? (
          <div className="space-y-3">
            {data.members.map((member) => (
              <div
                key={member.userId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar placeholder */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-transparent">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {(member.name || member.email || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {member.name || member.email || "Teammate"}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{member.email}</p>
                      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </span>

                    {data.role === "owner" || data.role === "admin" ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as WorkspaceRole)}
                        className="h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-3 text-xs text-slate-700 dark:text-slate-200 outline-none"
                      >
                        <option value="owner">owner</option>
                        <option value="admin">admin</option>
                        <option value="developer">developer</option>
                        <option value="viewer">viewer</option>
                      </select>
                    ) : (
                      <Badge variant="outline" className={roleColor(member.role)}>
                        {member.role}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
            No members yet. Share the invite code to add teammates.
          </div>
        )}
      </section>
    </div>
  );
}
