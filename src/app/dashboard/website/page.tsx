"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, ShieldCheck, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";
import DemoAnalyticsPanel from "@/components/DemoAnalyticsPanel";
import { demoAnalytics, demoSuccessMessage, demoWebsiteAnalytics } from "@/lib/demo-ui-mode";

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
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
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

export default function WebsiteOverviewPage() {
  const { criticalAlerts } = useDashboardLive();

  const tone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    tone === "good" ? "good" : tone === "warning" ? "warning" : "bad";
  const websiteConnected = true;
  const authEnabled = true;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading icon={Globe2} title="Website Overview" tone={headingTone} />
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Connect your product URL once, then let AgenticPulse inspect live website flows, watch for failures, and store fix-ready reports even when your team is offline.
        </p>
      </section>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
        {demoSuccessMessage}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard
          label="Website Status"
          value={websiteConnected ? "Connected" : "Missing"}
          hint="Your inspection target is ready for website checks."
        />
        <OverviewCard
          label="Last Inspection"
          value="Just now"
          hint="Latest website behavior snapshot processed instantly."
        />
        <OverviewCard
          label="Issues Found"
          value={String(demoWebsiteAnalytics.issues.length)}
          hint="High-confidence issues ready for review."
        />
      </div>

      <DemoAnalyticsPanel
        title="Website friction analytics"
        description="Website inspection is showing the same high-confidence signal pattern as the SDK so your teams can line up on one story instantly."
        primaryLabel="Clicks"
        primaryValue={demoWebsiteAnalytics.clicks}
        secondaryLabel="Drop-off"
        secondaryValue={demoWebsiteAnalytics.dropOff}
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">System Status</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {websiteConnected ? `${demoAnalytics.issue} needs attention` : "Set your website target first"}
              </h3>
            </div>
            {websiteConnected ? (
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
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Background website inspections</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Audit-form friction is elevated across the same weekly spike pattern visible in the dashboard.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Authenticated flow support</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{authEnabled ? "Analysis completed successfully for protected and public website flows." : "Add optional inspection credentials when your app requires login."}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3">
              <div className="flex items-start gap-3">
                <Globe2 className="mt-0.5 h-4 w-4 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Clear action path</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Observed behavior: rage clicks detected. Suspected cause: submit interaction fails to respond. Confidence: 92%.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Quick Actions</p>
          <div className="mt-5 space-y-3">
            <Link href="/dashboard/website/target" className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-700">
              Configure website target
              <ArrowUpRight className="h-4 w-4 opacity-70" />
            </Link>
            <Link href="/dashboard/website/inspections" className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-700">
              Run inspection
              <ArrowUpRight className="h-4 w-4 opacity-70" />
            </Link>
            <Link href="/dashboard/website/activity" className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-700">
              View live activity
              <ArrowUpRight className="h-4 w-4 opacity-70" />
            </Link>
          </div>
          <div className="mt-5">
            <Link href={websiteConnected ? "/dashboard/website/inspections" : "/dashboard/website/target"} className="block">
              <Button className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
                {websiteConnected ? "Open Website Agent" : "Set Target"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
