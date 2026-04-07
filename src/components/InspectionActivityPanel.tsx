"use client";

import type { InspectionActivity } from "@/lib/api";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

interface InspectionActivityPanelProps {
  items: InspectionActivity[];
}

function getTone(status: InspectionActivity["status"]) {
  if (status === "success") {
    return {
      border: "border-emerald-200 dark:border-emerald-500/20",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: CheckCircle2,
    };
  }

  if (status === "error") {
    return {
      border: "border-red-200 dark:border-red-500/20",
      bg: "bg-red-50 dark:bg-red-500/10",
      text: "text-red-700 dark:text-red-300",
      icon: AlertTriangle,
    };
  }

  return {
    border: "border-slate-200 dark:border-slate-800",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    text: "text-slate-700 dark:text-slate-300",
    icon: Activity,
  };
}

export default function InspectionActivityPanel({
  items,
}: InspectionActivityPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-background">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
            Live Agent Activity
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            Monitoring and inspecting your product
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Agent Active
        </div>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const tone = getTone(item.status);
            const Icon = tone.icon;
            return (
              <div
                key={item.id}
                className={`flex items-start justify-between gap-4 rounded-xl border px-4 py-3 ${tone.border} ${tone.bg}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 ${tone.text}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className={`text-sm font-medium ${tone.text}`}>
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      {new Date(item.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
            No inspection activity yet. Trigger an inspection to watch the agent work in real time.
          </div>
        )}
      </div>
    </div>
  );
}
