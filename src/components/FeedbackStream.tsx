"use client";

import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { cn } from "@/lib/utils";

export default function FeedbackStream() {
  const { recentFeedback } = useDashboardLive();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.25)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Recent Feedback</h2>
          <p className="mt-1 text-sm text-slate-400">
            Live user messages from connected channels.
          </p>
        </div>
        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          Live feed
        </div>
      </div>

      <ScrollArea className="h-[360px]">
        {recentFeedback.length > 0 ? (
          <div className="space-y-3 pr-3">
            {recentFeedback.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition-all animate-in fade-in-0 slide-in-from-top-1 duration-500",
                  index === 0 && "border-indigo-500/30 shadow-[0_0_0_1px_rgba(99,102,241,0.16)]"
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      <MessageSquareText className="h-3.5 w-3.5 text-slate-500" />
                      {item.sourceLabel}
                    </span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        item.sentiment === "negative"
                          ? "bg-rose-500"
                          : item.sentiment === "positive"
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                      )}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(item.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{item.text}</p>
                <p className="mt-2 text-xs text-slate-500">{item.author}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 text-center">
            <div>
              <p className="text-sm font-medium text-slate-300">No feedback loaded yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Connect and sync a source to stream real customer messages here.
              </p>
              <Link
                href="/dashboard/connect"
                className="mt-3 inline-flex rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
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
