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

  const category = issue.category ?? "Problem";
  const isPraise = category === "Praise";
  const isGeneralFeedback =
    isPraise ||
    (issue.sources.includes("gmail") &&
      issue.title.toLowerCase().includes("general"));
  const isLargeIssue = issue.reportCount >= 25 || issue.trendPercent >= 45;
  const isCritical =
    !isPraise && issue.priority === "HIGH" && isLargeIssue && !isGeneralFeedback;
  const impactPercent = Math.min(99, Math.max(4, issue.trendPercent));
  const relatedHref = `/dashboard?category=${encodeURIComponent(
    category
  )}&trend=${encodeURIComponent(issue.trend)}`;
  const reportLabel = `${issue.reportCount} report${issue.reportCount === 1 ? "" : "s"}`;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300 dark:bg-transparent md:p-6",
        isCritical
          ? "border-red-200 dark:border-red-500/20 hover:border-red-300 dark:hover:border-red-500/30 hover:shadow-md"
          : isGeneralFeedback
            ? "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
            : "border-amber-200 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/30 hover:shadow-md"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          isCritical
            ? "bg-red-500"
            : isGeneralFeedback
              ? "bg-emerald-500"
              : "bg-amber-500"
        )}
      />
      <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "rounded-xl border p-3",
              isCritical
                ? "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400"
                : isGeneralFeedback
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400"
            )}
          >
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.15em]",
                  isCritical
                    ? "text-red-600 dark:text-red-400"
                    : isGeneralFeedback
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                )}
              >
                {isCritical ? "Critical" : isPraise ? "Praise Signal" : isGeneralFeedback ? "Watch List" : "Warning"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  isCritical
                    ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                    : isGeneralFeedback
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                )}
              >
                {isCritical ? "CRITICAL" : "Live"}
              </span>
            </div>
            <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white md:text-xl">
              {issue.title}
            </h3>
            {isCritical ? (
              <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-300">
                Spike detected
              </p>
            ) : null}

            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {isCritical ? reportLabel : `Affecting ${impactPercent}% of users`}
              </span>
              <span className="block h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  issue.trend === "increasing"
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
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
              "inline-flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium transition-all sm:w-auto border",
              isCritical
                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600"
                : isGeneralFeedback
                  ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                  : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white hover:border-amber-600"
            )}
          >
            View Issue
          </Link>
          <Link
            href={relatedHref}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-transparent px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-white/[0.04] sm:w-auto"
          >
            View Similar
          </Link>
        </div>
      </div>
    </div>
  );
}
