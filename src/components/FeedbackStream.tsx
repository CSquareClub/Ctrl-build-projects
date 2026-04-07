"use client";

import { memo } from "react";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { cn } from "@/lib/utils";

function FeedbackStream() {
  const { recentFeedback } = useDashboardLive();

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Feedback</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live user messages from connected channels.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </div>
      </div>

      <ScrollArea className="h-[360px]">
        {recentFeedback.length > 0 ? (
          <div className="space-y-3 pr-3">
            {recentFeedback.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4 transition-all animate-in fade-in-0 slide-in-from-top-1 duration-500",
                  index === 0 && "border-red-200 dark:border-red-500/20 shadow-[0_0_0_1px_rgba(220,38,38,0.08)]"
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <MessageSquareText className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      {item.sourceLabel}
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        item.sentiment === "negative"
                          ? "bg-red-500"
                          : item.sentiment === "positive"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                      )}
                    />
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{item.text}</p>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{item.author}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-center">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No feedback loaded yet</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Connect and sync a source to stream real customer messages here.
              </p>
              <Link
                href="/dashboard/connect"
                className="mt-3 inline-flex rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Connect sources
              </Link>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default memo(FeedbackStream);
