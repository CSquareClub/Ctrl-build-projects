"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Mail,
  RefreshCw,
  Smartphone,
  Inbox,
  Calendar,
  Globe2,
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

function providerIcon(p: string) {
  if (p === "gmail" || p === "outlook") return <Mail className="h-3.5 w-3.5" />;
  if (p === "imap") return <Inbox className="h-3.5 w-3.5" />;
  if (p === "app-reviews" || p === "google-play") return <Smartphone className="h-3.5 w-3.5" />;
  if (p === "google_calendar") return <Calendar className="h-3.5 w-3.5" />;
  return <Globe2 className="h-3.5 w-3.5" />;
}

function formatProvider(p: string) {
  switch (p) {
    case "gmail": return "Gmail";
    case "outlook": return "Outlook";
    case "google_calendar": return "Google Calendar";
    case "app-reviews": return "App Store";
    case "google-play": return "Google Play";
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

const REFRESH_INTERVAL_MS = 8_000;

export default function ConnectActivityPage() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!session?.access_token) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadConnections();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadConnections, session?.access_token]);

  /* Build an activity feed from connection events */
  const activityFeed = useMemo(() => {
    type FeedEntry = {
      id: string;
      provider: string;
      event: string;
      timestamp: string;
      detail?: string;
      status: "success" | "error" | "info";
    };
    const entries: FeedEntry[] = [];

    connections.forEach((conn) => {
      // Connection created
      entries.push({
        id: `${conn.id}-created`,
        provider: conn.provider,
        event: `${formatProvider(conn.provider)} connected`,
        timestamp: conn.created_at,
        status: "info",
      });

      // Last synced
      if (conn.last_synced_at) {
        entries.push({
          id: `${conn.id}-synced`,
          provider: conn.provider,
          event: `${formatProvider(conn.provider)} synced`,
          timestamp: conn.last_synced_at,
          status: "success",
        });
      }

      // Error
      if (conn.last_error) {
        entries.push({
          id: `${conn.id}-error`,
          provider: conn.provider,
          event: `${formatProvider(conn.provider)} sync failed`,
          timestamp: conn.last_synced_at ?? conn.created_at,
          detail: conn.last_error,
          status: "error",
        });
      }
    });

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [connections]);

  return (
    <div className="space-y-10">
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <SectionHeading icon={Activity} title="Activity Log" tone={headingTone} />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
            <Button variant="outline" size="sm" onClick={() => void loadConnections()} className={neutralButtonTone}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real-time feed of data source events — connections, syncs, and errors.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : activityFeed.length > 0 ? (
          <div className="relative space-y-3">
            <div className="absolute left-6 top-4 bottom-4 hidden w-px bg-slate-200 dark:bg-slate-800 lg:block" />

            {activityFeed.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-4 transition-colors lg:ml-12 relative"
              >
                {/* Timeline dot */}
                <div className={cn(
                  "absolute -left-[3.25rem] top-5 hidden h-3 w-3 items-center justify-center rounded-full border-2 lg:flex",
                  entry.status === "success"
                    ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10"
                    : entry.status === "error"
                      ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161616]"
                )}>
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    entry.status === "success" ? "bg-emerald-500" : entry.status === "error" ? "bg-amber-500" : "bg-slate-400"
                  )} />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                        entry.status === "success"
                          ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : entry.status === "error"
                            ? "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-500 dark:text-slate-400"
                      )}>
                        {providerIcon(entry.provider)}
                        {formatProvider(entry.provider)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{entry.event}</p>
                    {entry.detail && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{entry.detail}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{timeAgo(entry.timestamp)}</span>
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
            Activity will appear here as sources connect and sync.
          </div>
        )}
      </section>
    </div>
  );
}
