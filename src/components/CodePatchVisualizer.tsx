"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Clipboard,
  FileCode2,
  GitPullRequest,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type VisualizerDiffLine = {
  id: string;
  kind: "added" | "removed" | "context" | "meta";
  indicator: string;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
};

function getDiffLineTone(kind: VisualizerDiffLine["kind"]) {
  switch (kind) {
    case "added":
      return "border-l-2 border-emerald-500 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-100";
    case "removed":
      return "border-l-2 border-red-500 bg-red-50 text-red-950 dark:border-red-400 dark:bg-red-500/10 dark:text-red-100";
    case "meta":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800/90 dark:text-slate-200";
    default:
      return "bg-transparent text-slate-700 dark:text-slate-300";
  }
}

function getLineTooltip(kind: VisualizerDiffLine["kind"], explanation: string) {
  switch (kind) {
    case "added":
      return `Added by the fix. ${explanation}`;
    case "removed":
      return `Removed because it contributed to the issue. ${explanation}`;
    case "meta":
      return "Diff metadata for this patch hunk.";
    default:
      return "Context kept unchanged to make the patch readable.";
  }
}

function highlightInlineCode(content: string, kind: VisualizerDiffLine["kind"]) {
  const tokens = String(content || "").split(/(\s+|[()[\]{}.,:;=+\-*/<>!&|]+)/g);
  const keywordSet = new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "await",
    "async",
    "try",
    "catch",
    "throw",
    "new",
  ]);

  return tokens.map((token, index) => {
    if (!token) return null;
    if (/^\s+$/.test(token)) {
      return <span key={`${token}-${index}`}>{token}</span>;
    }

    const isKeyword = keywordSet.has(token);
    const isString = /^['"`].*['"`]$/.test(token);
    const isComment = token.startsWith("//");

    return (
      <span
        key={`${token}-${index}`}
        className={cn(
          isKeyword && (kind === "removed" ? "text-red-700 dark:text-red-300" : "text-blue-700 dark:text-blue-300"),
          isString && (kind === "removed" ? "text-red-600/90 dark:text-red-200" : "text-emerald-700 dark:text-emerald-300"),
          isComment && "text-slate-400 dark:text-slate-500"
        )}
      >
        {token}
      </span>
    );
  });
}

export default function CodePatchVisualizer({
  title,
  explanation,
  confidence,
  impact,
  diffLines,
  rawPatch,
  onApplyFix,
  onCopyPatch,
  onAskAi,
}: {
  title: string;
  explanation: {
    what: string;
    why: string;
    fix: string;
    impact: string;
  };
  confidence: number;
  impact: string;
  diffLines: VisualizerDiffLine[];
  rawPatch: string;
  onApplyFix: () => void;
  onCopyPatch: () => void;
  onAskAi: () => void;
}) {
  const [expandedExplanation, setExpandedExplanation] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const impactTone =
    impact === "critical" || impact === "high"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
      : impact === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

  const stats = useMemo(() => {
    const added = diffLines.filter((line) => line.kind === "added").length;
    const removed = diffLines.filter((line) => line.kind === "removed").length;
    return { added, removed };
  }, [diffLines]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-transparent">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={impactTone}>
                {impact} impact
              </Badge>
              <Badge variant="outline">Confidence {Math.round(confidence * 100)}%</Badge>
              <Badge variant="outline">
                +{stats.added} / -{stats.removed}
              </Badge>
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                GitHub-style patch review with a plain-language AI summary before you apply the change.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onCopyPatch}>
              <Clipboard className="h-4 w-4" />
              Copy Patch
            </Button>
            <Button variant="outline" onClick={onAskAi}>
              <Bot className="h-4 w-4" />
              Ask AI
            </Button>
            <Button onClick={onApplyFix}>
              <FileCode2 className="h-4 w-4" />
              Apply Fix
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Human-like explanation
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedExplanation((current) => !current)}
            className="text-slate-500 dark:text-slate-400"
          >
            {expandedExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expandedExplanation ? "Collapse" : "Expand"}
          </Button>
        </div>

        {expandedExplanation ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                What is happening
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-900 dark:text-white">{explanation.what}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Why it is a problem
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{explanation.why}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                What the fix does
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-900 dark:text-emerald-100">{explanation.fix}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Expected improvement
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{explanation.impact}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-6 py-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              Added
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              Removed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              Context
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant={!showRaw ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRaw(false)}
            >
              Formatted Diff
            </Button>
            <Button
              variant={showRaw ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRaw(true)}
            >
              Raw Patch
            </Button>
          </div>
        </div>

        {showRaw ? (
          <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[13px] leading-6 text-slate-800 dark:border-slate-800 dark:bg-[#070b16] dark:text-slate-200">
            <pre className="whitespace-pre-wrap break-words">{rawPatch}</pre>
          </div>
        ) : (
          <TooltipProvider>
            <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 font-mono text-sm dark:border-slate-800 dark:bg-[#070b16]">
              <div className="sticky top-0 z-10 grid grid-cols-[72px_72px_32px_minmax(0,1fr)] border-b border-slate-200 bg-white/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/95 dark:text-slate-500">
                <span>Old</span>
                <span>New</span>
                <span />
                <span>Code</span>
              </div>
              {diffLines.map((line) => (
                <Tooltip key={line.id}>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        "grid grid-cols-[72px_72px_32px_minmax(0,1fr)] items-start border-b border-slate-200/70 px-4 py-1.5 leading-6 transition-colors hover:bg-slate-100/80 dark:border-slate-800/70 dark:hover:bg-white/[0.04]",
                        getDiffLineTone(line.kind)
                      )}
                    >
                      <span className="select-none text-right text-xs text-slate-400 dark:text-slate-500">
                        {line.oldLineNumber ?? ""}
                      </span>
                      <span className="select-none text-right text-xs text-slate-400 dark:text-slate-500">
                        {line.newLineNumber ?? ""}
                      </span>
                      <span
                        className={cn(
                          line.kind === "added"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : line.kind === "removed"
                              ? "text-red-700 dark:text-red-300"
                              : "text-slate-400 dark:text-slate-500"
                        )}
                      >
                        {line.indicator}
                      </span>
                      <span className="overflow-x-auto whitespace-pre-wrap break-words text-left">
                        {highlightInlineCode(line.content || " ", line.kind)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs text-xs leading-5">
                    {getLineTooltip(line.kind, explanation.fix)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onApplyFix}>
            <FileCode2 className="h-4 w-4" />
            Apply Fix
          </Button>
          <Button variant="outline" onClick={onCopyPatch}>
            <Clipboard className="h-4 w-4" />
            Copy Patch
          </Button>
          <Button variant="outline" onClick={onAskAi}>
            <Bot className="h-4 w-4" />
            Ask AI
          </Button>
          <Button variant="outline">
            <GitPullRequest className="h-4 w-4" />
            Review Ready
          </Button>
        </div>
      </div>
    </section>
  );
}
