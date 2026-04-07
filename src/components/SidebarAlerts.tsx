"use client";

import Link from "next/link";
import { ChevronDown, Siren, TrendingUp } from "lucide-react";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { cn } from "@/lib/utils";
import { useStoredBoolean, writeStoredBoolean } from "@/lib/useStoredBoolean";
import { deriveSystemHealthTone } from "@/lib/system-health";

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
  const tone = deriveSystemHealthTone(criticalAlerts);

  const toggleOpen = () => {
    writeStoredBoolean("product-pulse-sidebar-alerts-open", !open);
  };

  const toneStyles =
    tone === "bad"
      ? {
          outer: "border-red-200 dark:border-red-500/20 bg-white dark:bg-background",
          header: "border-b border-red-100 dark:border-red-500/15 bg-red-50 dark:bg-red-500/10",
          dot: "bg-red-500",
          dotPing: "bg-red-400",
          eyebrow: "text-red-600 dark:text-red-400",
          subtext: "text-red-700/80 dark:text-red-300/80",
          badge: "border-red-200 bg-white text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
          iconWrap: "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
        }
      : tone === "warning"
        ? {
            outer: "border-amber-200 dark:border-amber-500/20 bg-white dark:bg-background",
            header: "border-b border-amber-100 dark:border-amber-500/15 bg-amber-50 dark:bg-amber-500/10",
            dot: "bg-amber-500",
            dotPing: "bg-amber-400",
            eyebrow: "text-amber-700 dark:text-amber-300",
            subtext: "text-amber-800/80 dark:text-amber-200/80",
            badge: "border-amber-200 bg-white text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
            iconWrap: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
          }
        : {
            outer: "border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-background",
            header: "border-b border-emerald-100 dark:border-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/10",
            dot: "bg-emerald-500",
            dotPing: "bg-emerald-400",
            eyebrow: "text-emerald-600 dark:text-emerald-400",
            subtext: "text-emerald-700/80 dark:text-emerald-300/80",
            badge: "border-emerald-200 bg-white text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
            iconWrap: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
          };

  return (
    <div className="mt-8 hidden lg:block">
      <div className={cn("sticky top-6 overflow-hidden rounded-2xl border shadow-sm", toneStyles.outer)}>
        <button
          type="button"
          onClick={toggleOpen}
          className={cn("flex w-full items-center justify-between px-4 py-3 text-left", toneStyles.header)}
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  toneStyles.dotPing
                )}
              />
              <span className={cn("relative inline-flex h-3 w-3 rounded-full", toneStyles.dot)} />
            </span>
            <div>
              <p className={cn("text-xs font-semibold uppercase tracking-[0.22em]", toneStyles.eyebrow)}>
                Critical Alerts
              </p>
              <p className={cn("mt-1 text-xs", toneStyles.subtext)}>
                {tone === "bad"
                  ? "High-risk issues need attention"
                  : tone === "warning"
                    ? "Watch-list issues are building up"
                    : "System is looking stable right now"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", toneStyles.badge)}>
              <Siren className="h-3 w-3" />
              Live
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-500 transition-transform dark:text-slate-300",
                open ? "rotate-180" : "rotate-0"
              )}
            />
          </div>
        </button>

        {open ? (
          <div className="space-y-2.5 p-3">
            {criticalAlerts.slice(0, 5).map((issue) => {
              const relatedHref = buildRelatedHref(issue.category, issue.trend, issue.priority);
              const isHighPressure =
                issue.priority === "HIGH" && (issue.reportCount >= 25 || issue.trendPercent >= 45);
              const issueTone = isHighPressure
                ? {
                    wrap: "border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10",
                    dot: "bg-red-500",
                    accent: "text-red-600 dark:text-red-300",
                  }
                : issue.priority === "MEDIUM" || issue.priority === "HIGH"
                  ? {
                      wrap: "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10",
                      dot: "bg-amber-500",
                      accent: "text-amber-700 dark:text-amber-300",
                    }
                  : {
                      wrap: "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10",
                      dot: "bg-emerald-500",
                      accent: "text-emerald-600 dark:text-emerald-300",
                    };

              return (
                <div key={issue.id} className={cn("rounded-xl border p-3 transition-all hover:shadow-sm", issueTone.wrap)}>
                  <Link href={`/dashboard/issues/${issue.id}`} className="group flex items-start gap-3">
                    <span className={cn("mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full", issueTone.dot)} />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                        {issue.title}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className={cn("font-medium", issueTone.accent)}>{issue.priority}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <span className={cn("flex items-center gap-1", issueTone.accent)}>
                          <TrendingUp className="h-3 w-3" />
                          spike {issue.trendPercent}%
                        </span>
                      </div>
                    </div>
                  </Link>

                  <Link
                    href={relatedHref}
                    className="mt-2 inline-flex text-[11px] font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    View similar issues
                  </Link>
                </div>
              );
            })}

            {criticalAlerts.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                No urgent alerts right now.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
