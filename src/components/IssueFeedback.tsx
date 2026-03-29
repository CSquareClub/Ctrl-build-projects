"use client";

import { Mail, Star, Camera, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FeedbackMessage } from "@/lib/api";

const sourceIcons: Record<string, React.ElementType> = {
  gmail: Mail,
  "app-reviews": Star,
  instagram: Camera,
};

const sentimentColor = {
  negative: "text-red-600",
  neutral: "text-slate-400",
  positive: "text-emerald-600",
};

interface IssueFeedbackProps {
  messages: FeedbackMessage[];
}

export default function IssueFeedback({ messages }: IssueFeedbackProps) {
  if (!messages.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <MessageSquare className="h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-500">No feedback messages yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => {
        const Icon = sourceIcons[msg.source] || MessageSquare;
        return (
          <div
            key={msg.id}
            className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Icon className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-700">
                  {msg.author}
                </span>
                <Badge
                  variant="secondary"
                  className="border-0 bg-slate-100 text-[10px] text-slate-500"
                >
                  {msg.source === "app-reviews"
                    ? "Review"
                    : msg.source === "instagram"
                    ? "Instagram"
                    : msg.source}
                </Badge>
                <span
                  className={cn(
                    "ml-auto text-[10px] font-medium uppercase",
                    sentimentColor[msg.sentiment]
                  )}
                >
                  {msg.sentiment}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                {msg.text}
              </p>
              <span className="text-[11px] text-slate-400">
                {new Date(msg.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

