"use client";

import { AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import type { Issue } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  issue: Issue | null;
}

export default function AlertBanner({ issue }: AlertBannerProps) {
  if (!issue) return null;

  const isGeneralFeedback =
    issue.sources.includes("gmail") &&
    issue.title.toLowerCase().includes("general");
  const isLargeIssue = issue.reportCount >= 25 || issue.trendPercent >= 45;
  const isCritical = issue.priority === "HIGH" && isLargeIssue && !isGeneralFeedback;
  const impactPercent = Math.min(99, Math.max(4, issue.trendPercent));
  const relatedHref = `/dashboard?category=${encodeURIComponent(
    issue.category ?? "Problem"
  )}&trend=${encodeURIComponent(issue.trend)}`;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-slate-900/40 p-5 backdrop-blur-md transition-all duration-300 md:p-6",
        isCritical
          ? "border-red-500/30 shadow-[0_0_15px_-3px_rgba(239,68,68,0.15)] hover:border-red-500/50 hover:shadow-[0_0_25px_-5px_rgba(239,68,68,0.25)]"
          : isGeneralFeedback
            ? "border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)] hover:border-blue-500/50 hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.25)]"
            : "border-amber-500/30 shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)] hover:border-amber-500/50 hover:shadow-[0_0_25px_-5px_rgba(245,158,11,0.25)]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40",
          isCritical ? "bg-red-500" : isGeneralFeedback ? "bg-blue-500" : "bg-amber-500"
        )}
      />

      <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "rounded-xl p-3",
              isCritical
                ? "bg-red-500/10 text-red-500"
                : isGeneralFeedback
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-amber-500/10 text-amber-500"
            )}
          >
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  isCritical
                    ? "text-red-400"
                    : isGeneralFeedback
                      ? "text-blue-400"
                      : "text-amber-400"
                )}
              >
                {isCritical ? "Critical Alert" : isGeneralFeedback ? "General Feedback" : "Warning"}
              </span>
            </div>
            <h3 className="mb-2 text-lg font-medium text-white md:text-xl">
              {issue.title}
            </h3>

            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                Affecting {impactPercent}% of users
              </span>
              <span className="block h-1 w-1 rounded-full bg-slate-700" />
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  issue.trend === "increasing"
                    ? "text-rose-400"
                    : "text-emerald-400"
                )}
              >
                {issue.trend === "increasing" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                {issue.trend === "increasing" ? "Increasing" : "Decreasing"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <Link
            href={`/dashboard/issues/${issue.id}`}
            className={cn(
              "inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-all sm:w-auto",
              isCritical
                ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white"
                : isGeneralFeedback
                  ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white"
            )}
          >
            View Issue
          </Link>
          <Link
            href={relatedHref}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white sm:w-auto"
          >
            View Similar
          </Link>
        </div>
      </div>
    </div>
  );
}
