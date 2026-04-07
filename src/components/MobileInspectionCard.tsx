"use client";

import { Smartphone, Play, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileInspectionCardProps {
  running: boolean;
  status: string | null;
  lastRunAt?: string | null;
  deviceName?: string | null;
  onRun: () => void;
  onViewResults?: () => void;
}

export default function MobileInspectionCard({
  running,
  status,
  lastRunAt,
  deviceName,
  onRun,
  onViewResults,
}: MobileInspectionCardProps) {
  const badgeVariant =
    status === "completed"
      ? "success"
      : status === "failed"
        ? "destructive"
        : "secondary";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-transparent">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Mobile Inspection (Cloud)
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              Cloud Device Inspection
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              AI inspects your mobile app on a real cloud device, captures failures, and returns a fix-ready report.
            </p>
          </div>
        </div>
        <Badge variant={badgeVariant} className="rounded-full px-3 py-1">
          {running ? "running" : status || "ready"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Device</p>
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{deviceName || "Google Pixel 6"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Last run</p>
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
            {lastRunAt
              ? new Date(lastRunAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Waiting for first run"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={onRun}
          disabled={running}
          className={cn(
            "rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400",
            running && "opacity-70"
          )}
        >
          <Play className="h-4 w-4" />
          {running ? "Running inspection..." : "Run Inspection"}
        </Button>
        {onViewResults ? (
          <Button type="button" variant="outline" onClick={onViewResults} className="rounded-xl border-slate-200 dark:border-slate-800">
            View Results
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
