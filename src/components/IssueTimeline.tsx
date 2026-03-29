"use client";

import { cn } from "@/lib/utils";

interface TimelineEntry {
  date: string;
  count: number;
}

interface IssueTimelineProps {
  data: TimelineEntry[];
}

export default function IssueTimeline({ data }: IssueTimelineProps) {
  if (!data.length) return null;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-900">Report Timeline</h3>
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" style={{ height: 160 }}>
        {data.map((entry, i) => {
          const height = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
          const isLast = i === data.length - 1;
          return (
            <div
              key={entry.date}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <span className="text-[10px] font-medium text-slate-500">
                {entry.count}
              </span>
              <div className="relative w-full flex justify-center" style={{ height: 80 }}>
                <div
                  className={cn(
                    "w-full max-w-[32px] rounded-t-lg transition-all duration-500",
                    isLast
                      ? "bg-gradient-to-t from-blue-600 to-cyan-400"
                      : "bg-slate-200"
                  )}
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {new Date(entry.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

