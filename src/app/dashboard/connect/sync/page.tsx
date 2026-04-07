"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronDown,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Connection } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
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

function formatProvider(p: string) {
  switch (p) {
    case "gmail": return "Gmail";
    case "outlook": return "Outlook";
    case "google_calendar": return "Google Calendar";
    case "app-reviews": return "App Store Reviews";
    case "google-play": return "Google Play Reviews";
    case "imap": return "Email Inbox";
    case "instagram": return "Instagram";
    default: return p.charAt(0).toUpperCase() + p.slice(1);
  }
}

function timeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function SyncStatusPage() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone = chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";
  const neutralButtonTone = "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/[0.04]";

  const loadConnections = useCallback(async () => {
    const token = session?.access_token;
    if (!token) { setConnections([]); setLoading(false); return; }
    if (refreshInFlight.current) return;
    refreshInFlight.current = true; setLoading(true);
    try { const next = await api.connections.list(token); setConnections(next); }
    catch { /* silent */ }
    finally { refreshInFlight.current = false; setLoading(false); }
  }, [session?.access_token]);

  useEffect(() => { void loadConnections(); }, [loadConnections]);

  const syncable = useMemo(() => connections.filter((c) =>
    ["gmail", "outlook", "google_calendar", "app-reviews", "google-play", "imap", "instagram"].includes(c.provider)
  ), [connections]);

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={RefreshCw} title="Sync Status" tone={headingTone} />
          <Button variant="outline" size="sm" onClick={() => void loadConnections()} className={neutralButtonTone}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Per-source sync health. Expand any source to see processing details.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : syncable.length > 0 ? (
          <div className="space-y-3">
            {syncable.map((conn) => {
              const isExpanded = expandedId === conn.id;
              const hasError = Boolean(conn.last_error);
              const hasSynced = Boolean(conn.last_synced_at);
              const meta = conn.metadata ?? {};

              return (
                <div
                  key={conn.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : conn.id)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status dot */}
                      <div className={cn(
                        "flex h-3 w-3 rounded-full",
                        hasError ? "bg-amber-500" : hasSynced ? "bg-emerald-500" : "bg-slate-400"
                      )} />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatProvider(conn.provider)}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {meta.email ? String(meta.email) : conn.provider}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {hasError ? (
                        <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 text-[10px]">
                          <XCircle className="h-3 w-3 mr-1" /> Failed
                        </Badge>
                      ) : hasSynced ? (
                        <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Success
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 dark:text-slate-400 text-[10px]">
                          Pending
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {conn.last_synced_at ? timeAgo(conn.last_synced_at) : "—"}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-800 px-5 pb-5 pt-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Last Sync</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : "Never"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Status</p>
                          <p className={cn("mt-1 text-sm font-medium", hasError ? "text-amber-600 dark:text-amber-400" : hasSynced ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400")}>
                            {hasError ? "Failed" : hasSynced ? "Success" : "Waiting"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Connected At</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {new Date(conn.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Auto-Sync</p>
                          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                            {meta.autoSyncEnabled ? `On (${meta.autoSyncIntervalMinutes ?? 30}m)` : "Off"}
                          </p>
                        </div>
                      </div>

                      {hasError && (
                        <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Last Error</span>
                          </div>
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{conn.last_error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
            No connected sources to show sync status for. Visit the Connections tab to add sources.
          </div>
        )}
      </section>
    </div>
  );
}
