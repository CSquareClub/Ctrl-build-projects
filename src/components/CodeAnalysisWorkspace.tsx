"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Command,
  FileCode2,
  FileJson,
  FlaskConical,
  GitPullRequest,
  Loader2,
  MessageSquareText,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Search,
  Sparkles,
  TerminalSquare,
  WandSparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Issue = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  impact: "low" | "medium" | "high" | "critical";
  confidence: number;
  category: string;
  source: string;
  startLine: number | null;
  endLine: number | null;
};

type DiffLine = {
  id: string;
  kind: "added" | "removed" | "context" | "meta";
  indicator: string;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
};

type BottomTab = "terminal" | "tests" | "logs";

type ExplorerFile = {
  path: string;
  label: string;
  icon: typeof FileCode2 | typeof FileJson;
  badge: "critical" | "warning" | null;
};

type Attempt = {
  attempt: number;
  status: string;
  summary: string;
  passed: number;
  failed: number;
};

type WorkspaceProps = {
  explorerFiles: ExplorerFile[];
  selectedPath: string;
  currentFileLabel: string;
  selectedIssue: Issue | null;
  selectedIssueIndex: number;
  issues: Issue[];
  detectedLanguage: string;
  lineCount: number;
  sourceLabel: string;
  showDiff: boolean;
  setShowDiff: (value: boolean) => void;
  fixResult: { confidence?: number; updated?: string | null } | null;
  codeLines: string[];
  diffLines: DiffLine[];
  activeLine: number | null;
  aiMode: string;
  lineIssue?: Issue | null;
  explanation: { what: string; why: string; impact: string; fix: string };
  aiAnswer: string | null;
  loading: boolean;
  loadingStep: string;
  codeViewerRef: React.RefObject<HTMLDivElement | null>;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  commandQuery: string;
  setCommandQuery: (value: string) => void;
  commandItems: Array<{ id: string; label: string; description: string }>;
  executeCommand: (id: string) => void | Promise<void>;
  bottomPanelOpen: boolean;
  setBottomPanelOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  bottomTab: BottomTab;
  setBottomTab: (tab: BottomTab) => void;
  generatedTests: { framework?: string; source?: string; testCode?: string } | null;
  testResult: { status: string; passed: number; failed: number; logs?: string | null } | null;
  selfHealJob: {
    progress?: { message?: string; attempts?: Attempt[] } | null;
    result?: { attempts?: Attempt[] } | null;
    error?: string | null;
  } | null;
  selfHealing: boolean;
  testGenerating: boolean;
  testRunning: boolean;
  fixLoading: boolean;
  pullRequestCreating: boolean;
  pullRequestUrl: string | null;
  askLoading: boolean;
  error: string | null;
  analysisJobStatus: string | null | undefined;
  repoChecksMode: boolean;
  onOpenExplorerFile: (path: string) => void | Promise<unknown>;
  onSelectIssue: (index: number) => void;
  onSelectLine: (line: number, issueId?: string | null) => void;
  onGenerateFix: () => void | Promise<unknown>;
  onApplyPatch: () => void | Promise<unknown>;
  onCreatePullRequest: () => void | Promise<unknown>;
  onGenerateTests: () => void | Promise<unknown>;
  onRunTests: () => void | Promise<unknown>;
  onSelfHeal: () => void | Promise<unknown>;
  onAskAi: () => void | Promise<unknown>;
  highlightInlineCode: (content: string) => React.ReactNode;
};

const sevTone = (severity: string) =>
  severity === "high"
    ? "border-red-200/80 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    : severity === "medium"
      ? "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      : "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

const impactTone = (impact: Issue["impact"]) =>
  impact === "critical" || impact === "high"
    ? "border-red-200/80 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
    : impact === "medium"
      ? "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      : "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

function TerminalDock(props: WorkspaceProps & { attempts: Attempt[] }) {
  const canRunGeneratedTests = props.repoChecksMode || Boolean(props.generatedTests?.testCode);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-[#1f1f1f] dark:bg-[#111111]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => props.setBottomPanelOpen((current) => !current)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:text-slate-900 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:text-white"
          >
            {props.bottomPanelOpen ? (
              <PanelBottomClose className="h-4 w-4" />
            ) : (
              <PanelBottomOpen className="h-4 w-4" />
            )}
          </button>
          <p className="text-sm font-semibold text-slate-900 dark:text-[#e5e5e5]">
            Terminal + {props.repoChecksMode ? "Checks" : "Tests"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {([
            { key: "terminal", label: "Terminal", icon: TerminalSquare },
            { key: "tests", label: props.repoChecksMode ? "Checks" : "Tests", icon: FlaskConical },
            { key: "logs", label: "Logs", icon: MessageSquareText },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                props.setBottomPanelOpen(true);
                props.setBottomTab(tab.key);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition",
                props.bottomTab === tab.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {props.bottomPanelOpen ? (
        <div className="min-h-[220px]">
          {props.bottomTab === "terminal" ? (
            <div className="max-h-[260px] overflow-auto bg-black px-4 py-4 font-mono text-[12px] leading-6 text-slate-200">
              {props.testRunning ? (
                <p className="mb-3 text-emerald-400">
                  {props.repoChecksMode ? "Running repository checks..." : "Running tests..."}
                </p>
              ) : null}
              {props.loading ? (
                <p className="mb-3 text-blue-400">{props.loadingStep}...</p>
              ) : null}
              {props.testResult?.logs ? (
                <pre className="whitespace-pre-wrap break-words">{props.testResult.logs}</pre>
              ) : (
                <p className="text-slate-400">
                  {props.repoChecksMode
                    ? "Run repository checks to stream lint, test, and build output here."
                    : "Run tests to stream execution output here."}
                </p>
              )}
            </div>
          ) : null}

          {props.bottomTab === "tests" ? (
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-[#1f1f1f]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-[#1f1f1f]">
                  <div className="flex flex-wrap items-center gap-2">
                    {props.generatedTests?.framework ? (
                      <Badge variant="outline">{props.generatedTests.framework}</Badge>
                    ) : null}
                    {props.generatedTests?.source ? (
                      <Badge variant="outline">{props.generatedTests.source}</Badge>
                    ) : null}
                    {props.testResult ? (
                      <>
                        <Badge
                          className={
                            props.testResult.failed > 0
                              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                          }
                        >
                          {props.testResult.status}
                        </Badge>
                        <Badge variant="outline">{props.testResult.passed} passed</Badge>
                        <Badge variant="outline">{props.testResult.failed} failed</Badge>
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={props.onGenerateTests}
                      disabled={props.testGenerating || !props.codeLines.join("\n").trim()}
                    >
                      {props.testGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <WandSparkles className="h-4 w-4" />
                      )}
                      {props.repoChecksMode ? "Prepare Checks" : "Generate Tests"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={props.onRunTests}
                      disabled={props.testRunning || !canRunGeneratedTests}
                    >
                      {props.testRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {props.repoChecksMode ? "Run Checks" : "Run Tests"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={props.onGenerateTests}
                      disabled={props.testGenerating || !props.codeLines.join("\n").trim()}
                    >
                      <Sparkles className="h-4 w-4" />
                      {props.repoChecksMode ? "Refresh Plan" : "Regenerate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void navigator.clipboard.writeText(props.generatedTests?.testCode || "")}
                      disabled={!props.generatedTests?.testCode}
                    >
                      <Command className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="max-h-[280px] overflow-auto bg-slate-50/70 dark:bg-[#0b0b0b]">
                  <div className="grid grid-cols-[56px_minmax(0,1fr)]">
                    {(props.generatedTests?.testCode || "").split("\n").map((line, index) => (
                      <div key={`${index}-${line}`} className="contents">
                        <div className="border-b border-slate-200 px-4 py-1.5 text-right font-mono text-xs text-slate-400 dark:border-[#161616] dark:text-slate-500">
                          {index + 1}
                        </div>
                        <pre className="border-b border-slate-200 px-4 py-1.5 whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-slate-800 dark:border-[#161616] dark:text-[#e5e5e5]">
                          {props.highlightInlineCode(line || " ")}
                        </pre>
                      </div>
                    ))}
                    {!props.generatedTests?.testCode ? (
                      <div className="col-span-2 px-4 py-12 text-center text-sm text-slate-500 dark:text-[#9ca3af]">
                        {props.repoChecksMode
                          ? "Prepare checks to preview the repository validation plan here."
                          : "Generate tests to see a focused regression suite here."}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                  <p className="text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                    {props.repoChecksMode
                      ? "Repository checks stay grounded in the selected GitHub repo and current file content."
                      : props.selfHealJob?.progress?.message || (props.selfHealing ? "Analyzing failure..." : "Controlled self-heal")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-[#9ca3af]">
                    {props.repoChecksMode
                      ? "This flow runs repository-level lint, test, and build validation instead of synthetic generated tests."
                      : "Max 3 attempts. Each retry refines the fix from test output and stops automatically."}
                  </p>
                  {!props.repoChecksMode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={props.onSelfHeal}
                      disabled={props.selfHealing || !props.codeLines.join("\n").trim()}
                    >
                      {props.selfHealing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Retry
                    </Button>
                  ) : null}
                </div>

                {!props.repoChecksMode && props.attempts.length ? (
                  <div className="space-y-2 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                    <p className="text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                      Attempt timeline
                    </p>
                    {props.attempts.map((attempt) => (
                      <div
                        key={attempt.attempt}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-[#1f1f1f] dark:bg-[#111111]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                              Attempt {attempt.attempt}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-[#9ca3af]">
                              {attempt.summary}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              attempt.status === "passed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : attempt.status === "failed"
                                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                            }
                          >
                            {attempt.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {props.bottomTab === "logs" ? (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                <p className="text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                  Analysis pipeline
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-500 dark:text-[#9ca3af]">
                  <p>Status: {props.analysisJobStatus || "completed"}</p>
                  <p>{props.loadingStep}</p>
                  <p>{props.error || "No pipeline errors captured."}</p>
                </div>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                <p className="text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                  {props.repoChecksMode ? "Repository check logs" : "Test + self-heal logs"}
                </p>
                <div className="mt-3 max-h-[180px] overflow-auto rounded-2xl bg-black px-4 py-4 font-mono text-[12px] leading-6 text-slate-200">
                  <pre className="whitespace-pre-wrap break-words">
                    {props.testResult?.logs ||
                      props.selfHealJob?.error ||
                      "Logs will appear here once tests or self-heal runs are active."}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CodeAnalysisWorkspace(props: WorkspaceProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const attempts =
    props.selfHealJob?.progress?.attempts || props.selfHealJob?.result?.attempts || [];
  const dockVisible =
    props.bottomPanelOpen || props.testRunning || props.testGenerating || props.selfHealing;
  const canRunGeneratedTests = props.repoChecksMode || Boolean(props.generatedTests?.testCode);

  useEffect(() => {
    if (props.testRunning || props.testGenerating || props.selfHealing) {
      props.setBottomPanelOpen(true);
    }
  }, [props.selfHealing, props.setBottomPanelOpen, props.testGenerating, props.testRunning]);

  return (
    <>
      <div className="space-y-2">
        <div
          className={cn(
            "grid h-[calc(100vh-220px)] min-h-[640px] gap-2",
            leftOpen && rightOpen
              ? "grid-cols-[240px_minmax(0,1fr)_360px]"
              : leftOpen && !rightOpen
                ? "grid-cols-[240px_minmax(0,1fr)_56px]"
                : !leftOpen && rightOpen
                  ? "grid-cols-[56px_minmax(0,1fr)_360px]"
                  : "grid-cols-[56px_minmax(0,1fr)_56px]"
          )}
        >
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-[#1f1f1f] dark:bg-[#111111]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-[#1f1f1f]">
              {leftOpen ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-[#e5e5e5]">
                    File Explorer
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#9ca3af]">
                    Navigate the files carrying the current risk.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  Files
                </p>
              )}
              <button
                type="button"
                onClick={() => setLeftOpen((value) => !value)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
              >
                {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <div className="space-y-1">
                {props.explorerFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    title={file.path}
                    onClick={() => void props.onOpenExplorerFile(file.path)}
                    className={cn(
                      "relative flex w-full items-center rounded-2xl transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 dark:hover:bg-white/[0.03]",
                      leftOpen ? "gap-3 px-3 py-2 text-left" : "justify-center px-2 py-3",
                      (props.selectedPath ? props.selectedPath === file.path : props.currentFileLabel === file.label)
                        ? "bg-slate-100 text-slate-900 dark:bg-white/[0.05] dark:text-white"
                        : "text-slate-600 dark:text-[#9ca3af]"
                    )}
                  >
                    <file.icon className="h-4 w-4 shrink-0" />
                    {leftOpen ? (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{file.label}</p>
                          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {file.path}
                          </p>
                        </div>
                        {file.badge ? (
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              file.badge === "critical" ? "bg-red-500" : "bg-amber-500"
                            )}
                          />
                        ) : null}
                      </>
                    ) : file.badge ? (
                      <span
                        className={cn(
                          "absolute right-2 top-2 h-2.5 w-2.5 rounded-full",
                          file.badge === "critical" ? "bg-red-500" : "bg-amber-500"
                        )}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="grid min-h-0 h-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-[#1f1f1f] dark:bg-[#111111]">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-[#1f1f1f]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{props.currentFileLabel}</Badge>
                    <Badge variant="outline">{props.detectedLanguage}</Badge>
                    <Badge variant="outline">{props.lineCount} lines</Badge>
                    {props.selectedIssue ? (
                      <Badge variant="outline" className={sevTone(props.selectedIssue.severity)}>
                        {props.selectedIssue.title}
                      </Badge>
                    ) : null}
                    {props.repoChecksMode ? <Badge variant="outline">Repo mode</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-[#9ca3af]">
                    Fixed-height editor workspace with focused code, issues, and AI reasoning.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={!props.showDiff ? "default" : "outline"} size="sm" onClick={() => props.setShowDiff(false)}>
                    Original
                  </Button>
                  <Button variant={props.showDiff ? "default" : "outline"} size="sm" disabled={!props.fixResult} onClick={() => props.setShowDiff(true)}>
                    Diff
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 grid-cols-[280px_minmax(0,1fr)]">
              <div className="min-h-0 border-r border-slate-200 bg-slate-50/60 dark:border-[#1f1f1f] dark:bg-[#0d0d0d]">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-[#1f1f1f]">
                  <p className="text-sm font-semibold text-slate-900 dark:text-[#e5e5e5]">Issues</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#9ca3af]">
                    Select an issue to focus the code area.
                  </p>
                </div>
                <div className="h-full overflow-y-auto px-3 py-3">
                  <div className="space-y-2">
                    {props.issues.map((issue, index) => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => props.onSelectIssue(index)}
                        className={cn(
                          "w-full rounded-2xl border px-3 py-3 text-left transition-all duration-150 hover:-translate-y-0.5",
                          index === props.selectedIssueIndex
                            ? "border-emerald-300 bg-emerald-50/70 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-[#1f1f1f] dark:bg-[#111111] dark:hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 h-12 w-1 rounded-full",
                              issue.severity === "high"
                                ? "bg-red-500"
                                : issue.severity === "medium"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={sevTone(issue.severity)}>
                                {issue.severity}
                              </Badge>
                              <Badge variant="outline">{issue.category}</Badge>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                              {issue.title}
                            </p>
                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-[#9ca3af]">
                              {issue.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-[#1f1f1f]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#9ca3af]">
                      <Badge variant="outline">{props.sourceLabel}</Badge>
                      {props.fixResult ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                        >
                          Patch ready
                        </Badge>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => props.setCommandPaletteOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 transition hover:bg-white hover:text-slate-900 dark:border-[#1f1f1f] dark:bg-[#0b0b0b] dark:text-[#9ca3af] dark:hover:bg-[#151515] dark:hover:text-white"
                    >
                      <Command className="h-3.5 w-3.5" />
                      Command Palette
                    </button>
                  </div>
                </div>

                {!props.showDiff ? (
                  <div ref={props.codeViewerRef} className="min-h-0 h-full overflow-auto bg-white dark:bg-[#0b0b0b]">
                    {props.codeLines.map((line, index) => {
                      const lineNumber = index + 1;
                      const linkedIssue =
                        props.issues.find(
                          (issue) =>
                            issue.startLine != null &&
                            lineNumber >= issue.startLine &&
                            lineNumber <= (issue.endLine || issue.startLine)
                        ) || null;

                      return (
                        <Tooltip key={lineNumber}>
                          <TooltipTrigger>
                            <button
                              type="button"
                              data-line={lineNumber}
                              onClick={() => props.onSelectLine(lineNumber, linkedIssue?.id || null)}
                              className={cn(
                                "grid w-full grid-cols-[56px_minmax(0,1fr)] border-b border-slate-100 px-4 py-1.5 text-left text-sm transition-colors dark:border-[#161616]",
                                linkedIssue?.severity === "high" &&
                                  "border-l-2 border-l-red-500 bg-red-50/60 dark:border-l-red-400 dark:bg-red-500/8",
                                linkedIssue?.severity === "medium" &&
                                  "border-l-2 border-l-amber-500 bg-amber-50/60 dark:border-l-amber-400 dark:bg-amber-500/8",
                                linkedIssue?.severity === "low" &&
                                  "border-l-2 border-l-emerald-500 bg-emerald-50/60 dark:border-l-emerald-400 dark:bg-emerald-500/8",
                                props.activeLine === lineNumber &&
                                  "shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)]",
                                !linkedIssue && "hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                              )}
                            >
                              <div className="pr-4 text-right font-mono text-xs text-slate-400 dark:text-slate-500">
                                {lineNumber}
                              </div>
                              <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-slate-800 dark:text-[#e5e5e5]">
                                {props.highlightInlineCode(line || " ")}
                              </pre>
                            </button>
                          </TooltipTrigger>
                          {linkedIssue ? (
                            <TooltipContent>
                              {linkedIssue.title}: {linkedIssue.description}
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      );
                    })}
                  </div>
                ) : (
                  <div className="min-h-0 h-full overflow-auto bg-white dark:bg-[#0b0b0b]">
                    {props.diffLines.length ? (
                      props.diffLines.map((line) => (
                        <div
                          key={line.id}
                          className={cn(
                            "grid grid-cols-[56px_56px_24px_minmax(0,1fr)] border-b px-4 py-1.5 font-mono text-[13px] leading-6 transition-colors",
                            line.kind === "added"
                              ? "border-emerald-100 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/10 dark:bg-emerald-500/10 dark:text-emerald-100"
                              : line.kind === "removed"
                                ? "border-red-100 bg-red-50/80 text-red-950 dark:border-red-500/10 dark:bg-red-500/10 dark:text-red-100"
                                : line.kind === "meta"
                                  ? "border-slate-200 bg-slate-100/80 text-slate-600 dark:border-[#1f1f1f] dark:bg-[#111111] dark:text-slate-300"
                                  : "border-slate-100 text-slate-700 hover:bg-slate-50 dark:border-[#161616] dark:text-slate-300 dark:hover:bg-white/[0.03]"
                          )}
                        >
                          <div className="pr-3 text-right text-xs text-slate-400 dark:text-slate-500">
                            {line.oldLineNumber ?? ""}
                          </div>
                          <div className="pr-3 text-right text-xs text-slate-400 dark:text-slate-500">
                            {line.newLineNumber ?? ""}
                          </div>
                          <div className="text-center">{line.indicator}</div>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words">
                            {props.highlightInlineCode(line.content || " ")}
                          </pre>
                        </div>
                      ))
                    ) : (
                      <div className="px-5 py-16 text-center text-sm text-slate-500 dark:text-[#9ca3af]">
                        Generate a fix to preview the patch diff here.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 px-4 py-3 dark:border-[#1f1f1f]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={props.onGenerateFix} disabled={props.fixLoading || !props.selectedIssue}>
                    {props.fixLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                    Generate Fix
                  </Button>
                  <Button variant="outline" onClick={props.onApplyPatch} disabled={!props.fixResult}>
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Patch
                  </Button>
                  <Button
                    variant="outline"
                    onClick={props.onCreatePullRequest}
                    disabled={!props.fixResult || !props.repoChecksMode || props.pullRequestCreating}
                  >
                    {props.pullRequestCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GitPullRequest className="h-4 w-4" />
                    )}
                    Create PR
                  </Button>
                  <Button
                    variant="outline"
                    onClick={props.onGenerateTests}
                    disabled={props.testGenerating || !props.codeLines.join("\n").trim()}
                  >
                    <FlaskConical className="h-4 w-4" />
                    {props.repoChecksMode ? "Prepare Checks" : "Generate Tests"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#9ca3af]">
                  {props.pullRequestUrl
                    ? "Pull request created. You can keep iterating here while the PR is open in GitHub."
                    : "The editor stays scrollable so long files don&apos;t stretch the whole page."}
                </p>
              </div>
            </div>
          </section>
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-[#1f1f1f] dark:bg-[#111111]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-[#1f1f1f]">
              {rightOpen ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-[#e5e5e5]">
                    AI Brain
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#9ca3af]">
                    Context-aware reasoning and actions.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  AI
                </p>
              )}
              <div className="flex items-center gap-2">
                {rightOpen ? <Badge variant="outline" className="capitalize">{props.aiMode.replace("-", " ")}</Badge> : null}
                <button
                  type="button"
                  onClick={() => setRightOpen((value) => !value)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
                >
                  {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {rightOpen ? (
              <>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                  {props.selectedIssue ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={impactTone(props.selectedIssue.impact)}>
                          {props.selectedIssue.impact} impact
                        </Badge>
                        <Badge variant="outline">{props.selectedIssue.category}</Badge>
                        <Badge variant="outline">
                          {Math.round(((props.fixResult?.confidence || props.selectedIssue.confidence) || 0) * 100)}% confidence
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            What
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-900 dark:text-[#e5e5e5]">
                            {props.explanation.what}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            Why
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-[#9ca3af]">
                            {props.explanation.why}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                            Fix
                          </p>
                          <p className="mt-2 text-sm leading-6 text-emerald-900 dark:text-emerald-100">
                            {props.explanation.fix}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                      <p className="text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                        Ask your system
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-[#9ca3af]">
                        Select an issue or line to fill this panel with reasoning.
                      </p>
                    </div>
                  )}

                  {props.aiAnswer ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-[#1f1f1f] dark:bg-[#0b0b0b]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Ask AI
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-[#9ca3af]">
                        {props.aiAnswer}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-slate-200 p-4 dark:border-[#1f1f1f]">
                  <div className="grid gap-2">
                    <Button onClick={props.onGenerateFix} disabled={props.fixLoading || !props.selectedIssue}>
                      {props.fixLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                      Generate Fix
                    </Button>
                    <Button variant="outline" onClick={() => props.setShowDiff(true)} disabled={!props.fixResult}>
                      <GitPullRequest className="h-4 w-4" />
                      Show Patch
                    </Button>
                    <Button
                      variant="outline"
                      onClick={props.onCreatePullRequest}
                      disabled={!props.fixResult || !props.repoChecksMode || props.pullRequestCreating}
                    >
                      {props.pullRequestCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <GitPullRequest className="h-4 w-4" />
                      )}
                      Create PR
                    </Button>
                    <Button variant="outline" onClick={props.onRunTests} disabled={props.testRunning || !canRunGeneratedTests}>
                      {props.testRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      {props.repoChecksMode ? "Run Checks" : "Run Tests"}
                    </Button>
                    <Button variant="outline" onClick={props.onAskAi} disabled={props.askLoading || !props.selectedIssue}>
                      {props.askLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                      Ask AI
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-2 py-4">
                <button
                  type="button"
                  onClick={props.onGenerateFix}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
                  disabled={props.fixLoading || !props.selectedIssue}
                >
                  <WandSparkles className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => props.setShowDiff(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
                  disabled={!props.fixResult}
                >
                  <GitPullRequest className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={props.onCreatePullRequest}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
                  disabled={!props.fixResult || !props.repoChecksMode || props.pullRequestCreating}
                >
                  {props.pullRequestCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitPullRequest className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={props.onRunTests}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
                  disabled={props.testRunning || !canRunGeneratedTests}
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={props.onAskAi}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-[#1f1f1f] dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
                  disabled={props.askLoading || !props.selectedIssue}
                >
                  <Bot className="h-4 w-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
        {!dockVisible ? (
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-[#1f1f1f] dark:bg-[#111111]">
              <button
                type="button"
                onClick={() => {
                  props.setBottomPanelOpen(true);
                  props.setBottomTab("terminal");
                }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
              >
                <TerminalSquare className="h-3.5 w-3.5" />
                Terminal
              </button>
              <button
                type="button"
                onClick={() => {
                  props.setBottomPanelOpen(true);
                  props.setBottomTab("tests");
                }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                {props.repoChecksMode ? "Checks" : "Tests"}
              </button>
              <button
                type="button"
                onClick={() => {
                  props.setBottomPanelOpen(true);
                  props.setBottomTab("logs");
                }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:text-[#9ca3af] dark:hover:bg-white/[0.03] dark:hover:text-white"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                Logs
              </button>
            </div>
          </div>
        ) : (
          <TerminalDock {...props} attempts={attempts} />
        )}
      </div>

      {props.commandPaletteOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-4 py-20 backdrop-blur-sm">
          <div className="w-full max-w-[600px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-[#1f1f1f] dark:bg-[#111111]">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-[#1f1f1f]">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                autoFocus
                value={props.commandQuery}
                onChange={(event) => props.setCommandQuery(event.target.value)}
                placeholder="Search commands, files, issues..."
                className="h-10 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-[#e5e5e5] dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => props.setCommandPaletteOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {props.commandItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void props.executeCommand(item.id)}
                  className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-[#1f1f1f] dark:text-slate-400">
                    <Command className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-[#e5e5e5]">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-[#9ca3af]">
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
              {!props.commandItems.length ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500 dark:text-[#9ca3af]">
                  No commands match this query.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
