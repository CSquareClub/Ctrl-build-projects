"use client";

import type { MobileInspectionResult } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Smartphone, Wrench } from "lucide-react";

interface MobileInspectionResultCardProps {
  result: MobileInspectionResult;
}

export default function MobileInspectionResultCard({
  result,
}: MobileInspectionResultCardProps) {
  const sessionUrl =
    typeof result.rawData?.sessionUrl === "string" ? result.rawData.sessionUrl : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
            Mobile Inspection Result
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{result.issue}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span>
              {new Date(result.createdAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span>{[result.deviceName, result.platformVersion].filter(Boolean).join(" · ")}</span>
            {sessionUrl ? (
              <a
                href={sessionUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                Cloud device session
              </a>
            ) : null}
          </div>
        </div>
        <Badge variant="success" className="rounded-full px-3 py-1.5 text-sm">
          {result.confidence}% Confidence
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            <Smartphone className="h-4 w-4" />
            Observed
          </div>
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{result.observedBehavior}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
            <BrainCircuit className="h-4 w-4" />
            Cause
          </div>
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{result.suspectedCause}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            <Wrench className="h-4 w-4" />
            Fix
          </div>
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{result.suggestedFix}</p>
        </div>
      </div>
    </div>
  );
}
