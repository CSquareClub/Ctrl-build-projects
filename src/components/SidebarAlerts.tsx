"use client";

import Link from "next/link";
import { ChevronDown, Siren, TrendingUp } from "lucide-react";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { cn } from "@/lib/utils";
import { useStoredBoolean, writeStoredBoolean } from "@/lib/useStoredBoolean";

function buildRelatedHref(
  category: string | undefined,
  trend: string,
  priority: string
) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("trend", trend);
  params.set("priority", priority);
  return `/dashboard?${params.toString()}`;
}

export default function SidebarAlerts() {
  const { criticalAlerts } = useDashboardLive();
  const open = useStoredBoolean("product-pulse-sidebar-alerts-open", true);

  const hasHigh = criticalAlerts.some(
    (issue) =>
      issue.priority === "HIGH" &&
      (issue.reportCount >= 25 || issue.trendPercent >= 45) &&
      !(
        issue.sources.includes("gmail") &&
        issue.title.toLowerCase().includes("general")
      )
  );
  const hasMedium = criticalAlerts.some((issue) => issue.priority === "MEDIUM");
  const tone = hasHigh ? "red" : hasMedium ? "yellow" : "green";

  const toggleOpen = () => {
    writeStoredBoolean("product-pulse-sidebar-alerts-open", !open);
  };

  return (
    <div className="mt-8 hidden lg:block">
      <div
        className={cn(
          "sticky top-6 overflow-hidden rounded-2xl bg-slate-950/85",
          tone === "red" &&
            "border border-rose-500/20 shadow-[0_18px_60px_rgba(127,29,29,0.24)]",
          tone === "yellow" &&
            "border border-amber-500/20 shadow-[0_18px_60px_rgba(120,53,15,0.22)]",
          tone === "green" &&
            "border border-emerald-500/20 shadow-[0_18px_60px_rgba(6,78,59,0.22)]"
        )}
      >
        <button
          type="button"
          onClick={toggleOpen}
          className={cn(
            "flex w-full items-center justify-between px-4 py-3 text-left",
            tone === "red" &&
              "border-b border-rose-500/20 bg-[linear-gradient(90deg,rgba(127,29,29,0.88)_0%,rgba(239,68,68,0.14)_100%)]",
            tone === "yellow" &&
              "border-b border-amber-500/20 bg-[linear-gradient(90deg,rgba(120,53,15,0.88)_0%,rgba(245,158,11,0.14)_100%)]",
            tone === "green" &&
              "border-b border-emerald-500/20 bg-[linear-gradient(90deg,rgba(6,78,59,0.88)_0%,rgba(16,185,129,0.14)_100%)]"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  tone === "red" && "bg-rose-400",
                  tone === "yellow" && "bg-amber-400",
                  tone === "green" && "bg-emerald-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-3 w-3 rounded-full",
                  tone === "red" &&
                    "bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.85)]",
                  tone === "yellow" &&
                    "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.75)]",
                  tone === "green" &&
                    "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]"
                )}
              />
            </span>
            <div>
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-[0.22em]",
                  tone === "red" && "text-rose-200",
                  tone === "yellow" && "text-amber-100",
                  tone === "green" && "text-emerald-100"
                )}
              >
                Critical Alerts
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  tone === "red" && "text-rose-100/75",
                  tone === "yellow" && "text-amber-100/75",
                  tone === "green" && "text-emerald-100/75"
                )}
              >
                {tone === "red"
                  ? "High-risk issues need attention"
                  : tone === "yellow"
                    ? "Watch-list issues are building up"
                    : "System is looking stable right now"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
                tone === "red" &&
                  "border border-rose-400/20 bg-rose-500/10 text-rose-200",
                tone === "yellow" &&
                  "border border-amber-400/20 bg-amber-500/10 text-amber-100",
                tone === "green" &&
                  "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
              )}
            >
              <Siren className="h-3 w-3" />
              Live
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                tone === "red" && "text-rose-200",
                tone === "yellow" && "text-amber-100",
                tone === "green" && "text-emerald-100",
                open ? "rotate-180" : "rotate-0"
              )}
            />
          </div>
        </button>

        {open && (
          <div className="space-y-2 p-2.5">
            {criticalAlerts.slice(0, 5).map((issue) => {
              const isGeneralFeedback =
                issue.sources.includes("gmail") &&
                issue.title.toLowerCase().includes("general");
              const relatedHref = buildRelatedHref(
                issue.category,
                issue.trend,
                issue.priority
              );

              return (
                <div
                  key={issue.id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 transition-all",
                    isGeneralFeedback
                      ? "border-blue-500/10 bg-blue-500/5"
                      : issue.priority === "HIGH" &&
                          (issue.reportCount >= 25 || issue.trendPercent >= 45)
                        ? "border-rose-500/10 bg-rose-500/5"
                        : issue.priority === "MEDIUM" || issue.priority === "HIGH"
                          ? "border-amber-500/10 bg-amber-500/5"
                          : "border-emerald-500/10 bg-emerald-500/5"
                  )}
                >
                  <Link
                    href={`/dashboard/issues/${issue.id}`}
                    className="group flex items-start gap-3"
                  >
                    <span
                      className={cn(
                        "mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full",
                        isGeneralFeedback
                          ? "bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.7)]"
                          : issue.priority === "HIGH" &&
                              (issue.reportCount >= 25 || issue.trendPercent >= 45)
                            ? "bg-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.7)]"
                            : issue.priority === "MEDIUM" || issue.priority === "HIGH"
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-slate-100">
                        {issue.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span
                          className={cn(
                            "font-medium",
                            isGeneralFeedback
                              ? "text-blue-300"
                              : issue.priority === "HIGH" &&
                                  (issue.reportCount >= 25 || issue.trendPercent >= 45)
                                ? "text-rose-300"
                                : issue.priority === "MEDIUM" || issue.priority === "HIGH"
                                  ? "text-amber-300"
                                  : "text-emerald-300"
                          )}
                        >
                          {isGeneralFeedback ? "INFO" : issue.priority}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-slate-700" />
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            isGeneralFeedback ? "text-blue-300" : "text-rose-300"
                          )}
                        >
                          <TrendingUp className="h-3 w-3" />
                          spike {issue.trendPercent}%
                        </span>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href={relatedHref}
                    className="mt-2 inline-flex text-[11px] font-medium text-slate-500 transition hover:text-slate-300"
                  >
                    View similar issues
                  </Link>
                </div>
              );
            })}

            {criticalAlerts.length === 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm text-slate-400">
                No urgent alerts right now.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
