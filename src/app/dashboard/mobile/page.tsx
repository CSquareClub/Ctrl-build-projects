"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type MobileApp, type MobileInspection } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
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

function OverviewCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

export default function MobileOverviewPage() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const [apps, setApps] = useState<MobileApp[]>([]);
  const [inspections, setInspections] = useState<MobileInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    tone === "good" ? "good" : tone === "warning" ? "warning" : "bad";

  useEffect(() => {
    if (!session?.access_token) {
      setApps([]);
      setInspections([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.mobile.status(session.access_token);
        if (!cancelled) {
          setApps(response.apps);
          setInspections(response.inspections);
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "agent-load"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const latestInspection = inspections[0] || null;
  const issuesFound = useMemo(
    () =>
      inspections.filter(
        (inspection) =>
          inspection.status === "failed" ||
          Number(inspection.resultJson?.confidence || 0) >= 70
      ).length,
    [inspections]
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading icon={Smartphone} title="Mobile Overview" tone={headingTone} />
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400 max-w-3xl">
          Connect your app once, then let AgenticPulse inspect cloud devices in the background and turn mobile failures into clear action.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard label="Mobile Apps Connected" value={String(apps.length)} hint="Cloud-inspection-ready apps connected to your workspace." />
          <OverviewCard
            label="Last Inspection"
            value={
              latestInspection
                ? new Date(latestInspection.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "None yet"
            }
            hint="The most recent cloud-device run stored for your account."
          />
          <OverviewCard label="Issues Found" value={String(issuesFound)} hint="Runs with failures or high-confidence fix suggestions." />
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">System Status</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {apps.length > 0 ? "Agent is ready to inspect your mobile app" : "Connect your first mobile app"}
              </h3>
            </div>
            {apps.length > 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                Waiting
              </span>
            )}
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <Activity className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Cloud-device inspections</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Runs continue through the worker even if the user is offline.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Action-ready output</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every run stores observed behavior, likely cause, fix suggestion, and confidence.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Built for trust</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Users can inspect on demand and see the exact agent activity trail behind each result.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Quick Actions</p>
          <div className="mt-5 space-y-3">
            <Link href="/dashboard/mobile/apps" className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-700">
              Connect your mobile app
              <ArrowUpRight className="h-4 w-4 opacity-70" />
            </Link>
            <Link href="/dashboard/mobile/inspections" className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-700">
              Run inspection
              <ArrowUpRight className="h-4 w-4 opacity-70" />
            </Link>
            <Link href="/dashboard/mobile/activity" className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-700">
              View live activity
              <ArrowUpRight className="h-4 w-4 opacity-70" />
            </Link>
          </div>
          <div className="mt-5">
            <Link href="/dashboard/mobile/apps" className="block">
              <Button className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
                Go to Apps
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
