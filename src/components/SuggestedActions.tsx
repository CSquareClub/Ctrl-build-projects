"use client";

import { Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuggestedActionsProps {
  actions: string[];
}

export default function SuggestedActions({ actions }: SuggestedActionsProps) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>
        <h2 className="text-sm font-semibold text-slate-900">
          AI Suggested Actions
        </h2>
      </div>

      <div className="grid gap-2">
        {actions.map((action, i) => (
          <div
            key={i}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-all duration-200 hover:border-amber-200 hover:bg-amber-50/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700">{action}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1 text-xs text-slate-500 opacity-0 transition-all group-hover:opacity-100 hover:text-amber-600"
            >
              Act
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

