"use client";

import { Bot, Loader2, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IssueGraphQueryResponse } from "@/lib/api";

export default function GraphGuidePanel({
  prompts,
  queryInput,
  queryLoading,
  queryResult,
  onInputChange,
  onPromptClick,
  onSubmit,
}: {
  prompts: string[];
  queryInput: string;
  queryLoading: boolean;
  queryResult: IssueGraphQueryResponse | null;
  onInputChange: (value: string) => void;
  onPromptClick: (prompt: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-transparent">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-emerald-500" />
          <div>
            <CardTitle>AI Graph Guide</CardTitle>
            <CardDescription>
              Ask what matters, then let Pulse guide the graph focus for you.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPromptClick(prompt)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-white/[0.05]"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={queryInput}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Ask about root cause, impact, or critical path"
            className="h-11"
          />
          <Button onClick={onSubmit} disabled={!queryInput.trim() || queryLoading}>
            {queryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
            Ask
          </Button>
        </div>

        {queryResult ? (
          <>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                Explanation
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-900 dark:text-emerald-100">
                {queryResult.explanation}
              </p>
            </div>

            {queryResult.reasoning?.length ? (
              <div className="space-y-2">
                {queryResult.reasoning.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400">
            Ask the graph guide to focus the root cause, impact path, or dependency structure.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
