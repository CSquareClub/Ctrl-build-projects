"use client";

import { AlertTriangle, AreaChart, CheckCircle2, MousePointerClick, Sparkles } from "lucide-react";
import { demoAnalytics } from "@/lib/demo-ui-mode";

interface DemoAnalyticsPanelProps {
  title: string;
  description: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

export default function DemoAnalyticsPanel({
  title,
  description,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
}: DemoAnalyticsPanelProps) {
  const maxValue = Math.max(...demoAnalytics.timeline);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-transparent">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                Critical
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500 dark:text-red-300">
                Reports
              </p>
              <p className="mt-2 text-4xl font-bold tracking-tight text-red-600 dark:text-red-300">
                {demoAnalytics.reports}
              </p>
              <p className="mt-1 text-xs font-medium text-red-500 dark:text-red-300">
                {demoAnalytics.subtitle}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Top issue
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                {demoAnalytics.issue}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {demoAnalytics.source}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                {primaryLabel}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                {primaryValue}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Analysis completed
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                {secondaryLabel}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                {secondaryValue}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {demoAnalytics.trend} this week
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {demoAnalytics.graphLabel}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Shared pattern across website, SDK, and dashboard analytics.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 dark:border-red-500/20 dark:bg-slate-950 dark:text-red-300">
                <AreaChart className="h-3.5 w-3.5" />
                {demoAnalytics.trend}
              </div>
            </div>
            <div className="mt-5">
              <div className="flex h-44 items-end gap-3">
                {demoAnalytics.timeline.map((value, index) => (
                  <div key={demoAnalytics.timelineLabels[index]} className="flex flex-1 flex-col items-center gap-3">
                    <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {value}
                    </div>
                    <div className="relative flex h-32 w-full items-end justify-center">
                      <div
                        className="w-full rounded-t-2xl bg-gradient-to-t from-red-500 to-red-300 shadow-[0_10px_30px_rgba(239,68,68,0.18)]"
                        style={{ height: `${Math.max(12, (value / maxValue) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {demoAnalytics.timelineLabels[index]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Signal status
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 dark:border-emerald-500/20 dark:bg-slate-950">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Data loaded successfully</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Clean deterministic analytics are ready for review.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <MousePointerClick className="mt-0.5 h-4 w-4 text-red-500 dark:text-red-300" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{primaryValue}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{primaryLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                <Sparkles className="mt-0.5 h-4 w-4 text-slate-700 dark:text-slate-300" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{secondaryValue}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{secondaryLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
