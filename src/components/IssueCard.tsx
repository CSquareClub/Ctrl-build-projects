"use client";

import { memo, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Clock3,
  Mail,
  Star,
  Camera,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LiveIssue } from "@/providers/DashboardLiveProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useIssues } from "@/providers/IssuesProvider";
import { api } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";

interface IssueCardProps {
  issue: LiveIssue;
}

function isPositiveSignal(issue: LiveIssue) {
  return issue.category === "Praise";
}

function getPresentation(issue: LiveIssue) {
  const positiveSignal = isPositiveSignal(issue);
  const sentiment =
    positiveSignal
      ? { variant: "success", label: "Positive" }
      : issue.priority === "HIGH"
      ? { variant: "destructive", label: "Negative" }
      : issue.priority === "MEDIUM"
        ? { variant: "secondary", label: "Neutral" }
        : { variant: "success", label: "Positive" };

  const category =
    issue.category === "Bug"
      ? { label: "Bug", className: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/20" }
      : issue.category === "Problem"
        ? { label: "Problem", className: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20" }
        : issue.category === "Feature Request"
          ? { label: "Feature Request", className: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20" }
          : { label: "Praise", className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" };

  return { sentiment, category };
}

function getLifecycleTone(status: LiveIssue["lifecycleStatus"]) {
  if (status === "resolved") {
    return "bg-slate-100 dark:bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
  }

  if (status === "stale") {
    return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20";
  }

  if (status === "aging") {
    return "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20";
  }

  return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20";
}

const sourceIcons = {
  gmail: Mail,
  "app-reviews": Star,
  instagram: Camera,
};

function IssueCard({ issue }: IssueCardProps) {
  const { session } = useAuth();
  const { refreshIssues } = useIssues();
  const { sentiment, category } = getPresentation(issue);
  const positiveSignal = isPositiveSignal(issue);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleStatusUpdate = async () => {
    if (!session?.access_token || updatingStatus) {
      return;
    }

    setUpdatingStatus(true);
    setActionError(null);

    try {
      await api.issues.update(
        session.access_token,
        issue.id,
        { status: issue.lifecycleStatus === "resolved" ? "active" : "resolved" }
      );
      await refreshIssues({ silent: true });
    } catch (err) {
      setActionError(toUserFacingError(err, "issue-update"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-transparent dark:hover:border-slate-700">
      <Link href={`/dashboard/issues/${issue.id}`} className="block">
        <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-wrap items-center gap-2">
            {issue.issueType && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
                  issue.issueType === "personal"
                    ? "bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-100 dark:border-fuchsia-500/20"
                    : "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20"
                }`}
              >
                {issue.issueType === "personal" ? "Personal" : "Global"}
              </span>
            )}
            <Badge
              variant={
                sentiment.variant as "default" | "secondary" | "destructive" | "success"
              }
            >
              {sentiment.label}
            </Badge>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${category.className}`}
            >
              {category.label}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium border ${
                positiveSignal
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                  : issue.severity === "Critical"
                  ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20"
                  : issue.severity === "Warning"
                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
              }`}
            >
              {issue.severity}
            </span>
            {issue.lifecycleStatus && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getLifecycleTone(
                  issue.lifecycleStatus
                )}`}
              >
                {issue.lifecycleStatus}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Clock3 className="h-3.5 w-3.5" />
            <span>
              {new Date(issue.updatedAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <h3
          className={`mb-3 text-lg font-medium leading-snug text-slate-900 transition-colors dark:text-white ${
            positiveSignal
              ? "group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
              : "group-hover:text-red-600 dark:group-hover:text-red-400"
          }`}
        >
          {issue.title}
        </h3>

        <div className="mb-4 flex items-center gap-2">
          {issue.sources.map((source) => {
            const Icon = sourceIcons[source as keyof typeof sourceIcons];
            if (!Icon) return null;
            return (
              <span
                key={source}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-400"
              >
                <Icon className="h-4 w-4" />
              </span>
            );
          })}
        </div>

        <div className="mb-4 flex h-12 items-end gap-1">
          {issue.sparkline.map((value, index) => (
            <div
              key={`${issue.id}-spark-${index}`}
              className={`flex-1 rounded-t-sm transition-all ${
                index === issue.sparkline.length - 1
                  ? positiveSignal
                    ? "bg-emerald-500 dark:bg-emerald-400"
                    : "bg-red-500 dark:bg-red-400"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
              style={{ height: `${Math.max(20, (value / Math.max(...issue.sparkline)) * 100)}%` }}
            />
          ))}
        </div>

        <div className="mt-auto flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <MessageSquare className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">{issue.reportCount}</span>
            reports
          </div>

          <div
            className={`flex items-center gap-1.5 font-medium ${
              positiveSignal
                ? issue.trend === "decreasing"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
                : issue.trend === "increasing"
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {issue.trend === "increasing" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {issue.trend === "increasing" ? "+" : "-"}
            {Math.abs(issue.trendPercent)}% this week
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/issues/${issue.id}`}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            View issue
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleStatusUpdate()}
            disabled={updatingStatus}
            className={
              issue.lifecycleStatus === "resolved"
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.04]"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
            }
          >
            {issue.lifecycleStatus === "resolved" ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {updatingStatus
              ? issue.lifecycleStatus === "resolved"
                ? "Reopening..."
                : "Resolving..."
              : issue.lifecycleStatus === "resolved"
                ? "Reopen"
                : "Resolved"}
          </Button>
        </div>
        <Link
          href={`/dashboard/issues/${issue.id}?inspect=1`}
          className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-300"
        >
          Inspect with AI
        </Link>
      </div>
      {actionError ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {actionError}
        </div>
      ) : null}
    </div>
  );
}

export default memo(IssueCard);
