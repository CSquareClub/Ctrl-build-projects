"use client";

import {
  Bot,
  ChevronDown,
  ChevronUp,
  FileCode2,
  GitPullRequest,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CodeRiskIssueDisplay {
  title: string;
  explanation: string;
  category: string;
  codeSnippet: string;
  confidence: number;
  impact: "low" | "medium" | "high" | "critical";
  severity: "low" | "medium" | "high" | string;
  source: string;
  startLine: number | null;
  endLine: number | null;
}

function getStripTone(impact: CodeRiskIssueDisplay["impact"]) {
  switch (impact) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-red-400";
    case "medium":
      return "bg-amber-400";
    default:
      return "bg-emerald-500";
  }
}

function getImpactBadgeTone(impact: CodeRiskIssueDisplay["impact"]) {
  switch (impact) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
    case "high":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
}

export default function CodeRiskIssueIntelligenceCard({
  issue,
  selected,
  expanded,
  onSelect,
  onToggleExpanded,
  onGenerateFix,
  onViewPatch,
  onAskAi,
}: {
  issue: CodeRiskIssueDisplay;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpanded: () => void;
  onGenerateFix: () => void;
  onViewPatch: () => void;
  onAskAi: () => void;
}) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[24px] border bg-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:bg-white/[0.03]",
        selected
          ? "border-emerald-200 dark:border-emerald-500/20"
          : "border-slate-200 dark:border-slate-800"
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", getStripTone(issue.impact))} />
      <button
        type="button"
        onClick={onSelect}
        className="w-full px-5 py-5 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-white/[0.03] dark:text-slate-300">
                {issue.category}
              </Badge>
              <Badge variant="outline" className={getImpactBadgeTone(issue.impact)}>
                {issue.impact} impact
              </Badge>
              <Badge variant="outline">{issue.source}</Badge>
            </div>

            <div>
              <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                {issue.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {issue.explanation}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Confidence
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              {Math.round(issue.confidence * 100)}%
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-[#0c111b]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            <span>Code Snippet</span>
            {issue.startLine ? (
              <span>
                Lines {issue.startLine}
                {issue.endLine && issue.endLine > issue.startLine ? `-${issue.endLine}` : ""}
              </span>
            ) : null}
          </div>
          <pre className="max-h-32 overflow-auto px-4 py-3 font-mono text-[12px] leading-6 text-slate-800 dark:text-slate-200">
            <code>{issue.codeSnippet || "// No snippet available yet."}</code>
          </pre>
        </div>
      </button>

      <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onGenerateFix} className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15">
            <Sparkles className="h-4 w-4" />
            Generate Fix
          </Button>
          <Button variant="outline" onClick={onViewPatch}>
            <GitPullRequest className="h-4 w-4" />
            View Patch
          </Button>
          <Button variant="outline" onClick={onAskAi}>
            <Bot className="h-4 w-4" />
            Ask AI
          </Button>
          <Button variant="ghost" onClick={onToggleExpanded} className="ml-auto text-slate-500 dark:text-slate-400">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Less" : "More"}
          </Button>
        </div>

        {expanded ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                AI Explanation
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                AgenticPulse marked this as a {issue.impact} impact {issue.category.toLowerCase()} risk because the code pattern and reasoning signals align around the highlighted snippet.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Next Move
              </p>
              <div className="mt-3 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span>
                  Generate a targeted fix for this snippet first, then review the diff before creating a PR.
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
