"use client";

import { useState } from "react";
import Link from "next/link";
import type { WeeklyReport } from "@/lib/api";

function formatHours(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  if (value < 24) {
    return `${value.toFixed(1)}h`;
  }

  return `${(value / 24).toFixed(1)}d`;
}

function buildReportMarkdown(report: WeeklyReport) {
  return [
    "# Weekly Product Insight Report",
    "",
    `Period: ${report.weekStart} to ${report.weekEnd}`,
    "",
    "## Summary",
    report.summary,
    "",
    "## Key Insights",
    ...(report.insights.length > 0
      ? report.insights.map((item) => `- ${item}`)
      : ["- No notable insights surfaced this week."]),
    "",
    "## Recommendations",
    ...(report.recommendations.length > 0
      ? report.recommendations.map((item) => `- ${item}`)
      : ["- No recommendations yet."]),
    "",
    "## Metrics",
    `- Feedback: ${report.metrics.total_feedback_count}`,
    `- Issue events: ${report.metrics.total_issue_count}`,
    `- Resolution speed: ${formatHours(report.metrics.avg_resolution_time)}`,
    `- Resolution efficiency: ${
      report.resolution.resolution_efficiency === null
        ? "n/a"
        : `${report.resolution.resolution_efficiency}%`
    }`,
    "",
    "## Top Locations",
    ...(report.locations.length > 0
      ? report.locations.map((location) => `- ${location.name}: ${location.count}`)
      : ["- No location signal was strong enough this week."]),
  ].join("\n");
}

interface WeeklyReportPanelProps {
  report: WeeklyReport | null;
  loading?: boolean;
  error?: string | null;
}

export default function WeeklyReportPanel({
  report,
  loading = false,
  error = null,
}: WeeklyReportPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const handleCopy = async () => {
    if (!report) return;

    await navigator.clipboard.writeText(buildReportMarkdown(report));
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  const handleDownload = () => {
    if (!report) return;

    const blob = new Blob([buildReportMarkdown(report)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `product-pulse-weekly-report-${report.weekEnd}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400">
        Preparing your weekly product insight report...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400">
        Weekly insights will appear here once Product Pulse has enough data for the selected range.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.3)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">
            Weekly Product Insight Report
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {report.weekStart} to {report.weekEnd}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${
            report.generation_mode === "ai"
              ? "bg-cyan-500/15 text-cyan-200"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {report.generation_mode === "ai" ? "Groq Summary" : "Rule Summary"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-900"
        >
          {copyState === "copied" ? "Copied summary" : "Copy summary"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:bg-slate-900"
        >
          Download markdown
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-cyan-500/10 bg-gradient-to-br from-cyan-500/8 via-slate-950/60 to-slate-950/90 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/80">
          AI Summary
        </p>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-100">
          {report.summary}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-slate-950/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Feedback
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {report.metrics.total_feedback_count}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Issue events
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {report.metrics.total_issue_count}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Resolution speed
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {formatHours(report.metrics.avg_resolution_time)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Resolution efficiency
          </p>
          <p className="mt-3 text-2xl font-semibold text-white">
            {report.resolution.resolution_efficiency === null
              ? "n/a"
              : `${report.resolution.resolution_efficiency}%`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl bg-slate-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
            Key Insights
          </p>
          <div className="mt-4 space-y-3">
            {report.insights.length > 0 ? (
              report.insights.map((insight) => (
                <div
                  key={insight}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
                >
                  {insight}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No notable insights surfaced for this week.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
            Recommendations
          </p>
          <div className="mt-4 space-y-3">
            {report.recommendations.length > 0 ? (
              report.recommendations.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No recommendations yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-slate-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
            Top Issues
          </p>
          <div className="mt-4 space-y-3">
            {report.top_issues.length > 0 ? (
              report.top_issues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/dashboard/issues/${issue.id}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{issue.title}</p>
                    <span className="text-xs text-slate-400">{issue.report_count} reports</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {issue.priority} priority • {issue.trend_percent}% trend
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-400">No issue clusters yet for this week.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
            Top Locations
          </p>
          <div className="mt-4 space-y-3">
            {report.locations.length > 0 ? (
              report.locations.map((location) => (
                <div
                  key={location.name}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3"
                >
                  <p className="text-sm text-white">{location.name}</p>
                  <span className="text-sm text-slate-300">{location.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No location signal was strong enough this week.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950/70 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
            Spike Days
          </p>
          <div className="mt-4 space-y-3">
            {report.spikes.length > 0 ? (
              report.spikes.map((spike) => (
                <div
                  key={spike.date}
                  className="rounded-2xl border border-rose-500/10 bg-rose-500/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">{spike.date}</p>
                    <span className="text-xs uppercase tracking-[0.2em] text-rose-200">
                      {spike.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {spike.issue_count} issues • {spike.feedback_count} feedback events
                  </p>
                  <Link
                    href={`/dashboard?trend=increasing&priority=${encodeURIComponent(
                      spike.severity === "red" ? "HIGH" : "MEDIUM"
                    )}`}
                    className="mt-3 inline-flex text-xs font-medium text-rose-200 transition hover:text-white"
                  >
                    View filtered issues
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No major spike crossed the alert threshold this week.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
