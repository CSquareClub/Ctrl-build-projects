"use client";

import Link from "next/link";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Clock3,
  Mail,
  Star,
  Camera,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LiveIssue } from "@/providers/DashboardLiveProvider";

interface IssueCardProps {
  issue: LiveIssue;
}

function getPresentation(issue: LiveIssue) {
  const sentiment =
    issue.priority === "HIGH"
      ? { variant: "destructive", label: "Negative" }
      : issue.priority === "MEDIUM"
        ? { variant: "secondary", label: "Neutral" }
        : { variant: "success", label: "Positive" };

  const category =
    issue.category === "Bug"
      ? { label: "Bug", className: "bg-rose-500/10 text-rose-400" }
      : issue.category === "Problem"
        ? { label: "Problem", className: "bg-blue-500/10 text-blue-400" }
        : issue.category === "Feature Request"
          ? { label: "Feature Request", className: "bg-amber-500/10 text-amber-400" }
          : { label: "Praise", className: "bg-emerald-500/10 text-emerald-400" };

  return { sentiment, category };
}

const sourceIcons = {
  gmail: Mail,
  "app-reviews": Star,
  instagram: Camera,
};

export default function IssueCard({ issue }: IssueCardProps) {
  const { sentiment, category } = getPresentation(issue);

  return (
    <Link
      href={`/dashboard/issues/${issue.id}`}
      className="group block rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all duration-300 hover:border-slate-700 hover:bg-slate-800/50"
    >
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-wrap items-center gap-3">
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
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              issue.severity === "Critical"
                ? "bg-rose-500/10 text-rose-400"
                : issue.severity === "Warning"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {issue.severity}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          <span>
            {new Date(issue.updatedAt).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <h3 className="mb-3 text-lg font-medium leading-snug text-white transition-colors group-hover:text-indigo-300">
        {issue.title}
      </h3>

      <div className="mb-4 flex items-center gap-2">
        {issue.sources.map((source) => {
          const Icon = sourceIcons[source as keyof typeof sourceIcons];
          if (!Icon) return null;
          return (
            <span
              key={source}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400"
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
                ? "bg-indigo-400"
                : "bg-slate-700"
            }`}
            style={{ height: `${Math.max(20, (value / Math.max(...issue.sparkline)) * 100)}%` }}
          />
        ))}
      </div>

      <div className="mt-auto flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-slate-300">{issue.reportCount}</span>
          reports
        </div>

        <div
          className={`flex items-center gap-1.5 font-medium ${
            issue.trend === "increasing" ? "text-rose-400" : "text-emerald-400"
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
  );
}
