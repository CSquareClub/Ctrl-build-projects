"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitPullRequest,
  PencilLine,
  ShieldAlert,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { parsePatch } from "diff";
import Link from "next/link";
import DecisionFeedbackBar from "@/components/DecisionFeedbackBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  AgentConfidenceResult,
  CodeInsightPullRequestResult,
  CodeInsightResult,
  GitHubConnectionStatus,
  GitHubRepository,
  IssueDetail,
  UnifiedIssueIntelligence,
} from "@/lib/api";
import { api } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import type { GitHubAssistantPrompt } from "@/components/GitHubAssistantPanel";

interface CodeInsightPanelProps {
  token: string | null | undefined;
  issue: IssueDetail;
  trustConfidence?: AgentConfidenceResult | null;
  repositoryOverride?: Pick<GitHubRepository, "owner" | "name" | "defaultBranch"> | null;
  codeInsightsEnabled?: boolean;
  onAskAssistant?: (prompt: GitHubAssistantPrompt) => void;
  onAnalysisChange?: (analysis: CodeInsightResult | null) => void;
}

type ToastTone = "success" | "neutral";
type PrStage = "branch" | "patch" | "pull-request" | null;
type DiffLineKind = "added" | "removed" | "context" | "meta";
type ParsedDiffLine = {
  id: string;
  kind: DiffLineKind;
  content: string;
  indicator: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
};

const GITHUB_STATUS_CACHE_KEY = "product-pulse:github-status";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function safeSessionStorageGet(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageSet(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Best effort only.
  }
}

function getConfidence(result: CodeInsightResult) {
  if (typeof result.patchConfidence === "number") {
    if (result.patchConfidence > 70) {
      return {
        label: "High",
        variant: "success" as const,
        tone: "text-emerald-300",
      };
    }

    if (result.patchConfidence >= 40) {
      return {
        label: "Medium",
        variant: "secondary" as const,
        tone: "text-amber-200",
      };
    }

    return {
      label: "Low",
      variant: "destructive" as const,
      tone: "text-rose-300",
    };
  }

  if (result.files.length >= 3 && result.totalLines >= 180) {
    return {
      label: "High",
      variant: "success" as const,
      tone: "text-emerald-600 dark:text-emerald-300",
    };
  }

  if (result.files.length >= 2 && result.totalLines >= 100) {
    return {
      label: "Medium",
      variant: "secondary" as const,
      tone: "text-amber-600 dark:text-amber-200",
    };
  }

  return {
    label: "Low",
    variant: "destructive" as const,
    tone: "text-red-600 dark:text-rose-300",
  };
}

function getRisk(changedLineCount: number, fileCount: number) {
  if (fileCount <= 1 && changedLineCount <= 8) {
    return {
      label: "Low Risk",
      variant: "success" as const,
      description: "Small change surface with one focused file.",
    };
  }

  if (fileCount <= 2 && changedLineCount <= 20) {
    return {
      label: "Medium Risk",
      variant: "secondary" as const,
      description: "Touches more than one area. Review before merging.",
    };
  }

  return {
    label: "High Risk",
    variant: "destructive" as const,
    description: "Broader patch footprint across multiple files or lines.",
  };
}

function getMatchStrength(result: CodeInsightResult) {
  const normalizedKeywords = result.keywords.map((keyword) =>
    keyword.toLowerCase()
  );
  const matchedKeywords = new Set<string>();

  result.files.forEach((file) => {
    const haystack = `${file.path}\n${file.snippet}`.toLowerCase();
    normalizedKeywords.forEach((keyword) => {
      if (keyword && haystack.includes(keyword)) {
        matchedKeywords.add(keyword);
      }
    });
  });

  const score = normalizedKeywords.length
    ? matchedKeywords.size / normalizedKeywords.length
    : 0;

  if (score >= 0.6) {
    return "strong";
  }

  if (score >= 0.3) {
    return "moderate";
  }

  return "light";
}

function getPrimaryFileUrl(result: CodeInsightResult) {
  const firstFile = result.files[0];
  if (!firstFile) {
    return null;
  }

  const { owner, name, defaultBranch } = result.repository;
  return `https://github.com/${owner}/${name}/blob/${defaultBranch}/${firstFile.path}`;
}

function getDiffLineClasses(kind: DiffLineKind) {
  switch (kind) {
    case "added":
      return "border-l-2 border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-100";
    case "removed":
      return "border-l-2 border-red-500 bg-red-50 text-red-900 dark:border-red-400 dark:bg-red-500/10 dark:text-red-100";
    case "meta":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200";
    default:
      return "bg-transparent text-slate-700 dark:text-slate-300";
  }
}

function parseUnifiedDiff(patch: string) {
  const normalizedPatch = String(patch || "").trim();
  if (!normalizedPatch) {
    return [] as ParsedDiffLine[];
  }

  try {
    const parsed = parsePatch(normalizedPatch);
    const rows: ParsedDiffLine[] = [];

    parsed.forEach((file, fileIndex) => {
      rows.push({
        id: `file-${fileIndex}`,
        kind: "meta",
        content: `diff -- ${file.oldFileName || "original"} -> ${file.newFileName || "updated"}`,
        indicator: "…",
        oldLineNumber: null,
        newLineNumber: null,
      });

      file.hunks.forEach((hunk, hunkIndex) => {
        rows.push({
          id: `hunk-${fileIndex}-${hunkIndex}`,
          kind: "meta",
          content: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
          indicator: "@",
          oldLineNumber: null,
          newLineNumber: null,
        });

        let oldLine = hunk.oldStart;
        let newLine = hunk.newStart;

        hunk.lines.forEach((line, lineIndex) => {
          const marker = line[0] || " ";
          const content = line.slice(1);

          if (marker === "\\") {
            rows.push({
              id: `note-${fileIndex}-${hunkIndex}-${lineIndex}`,
              kind: "meta",
              content: line,
              indicator: "·",
              oldLineNumber: null,
              newLineNumber: null,
            });
            return;
          }

          if (marker === "+") {
            rows.push({
              id: `add-${fileIndex}-${hunkIndex}-${lineIndex}`,
              kind: "added",
              content,
              indicator: "+",
              oldLineNumber: null,
              newLineNumber: newLine,
            });
            newLine += 1;
            return;
          }

          if (marker === "-") {
            rows.push({
              id: `remove-${fileIndex}-${hunkIndex}-${lineIndex}`,
              kind: "removed",
              content,
              indicator: "-",
              oldLineNumber: oldLine,
              newLineNumber: null,
            });
            oldLine += 1;
            return;
          }

          rows.push({
            id: `context-${fileIndex}-${hunkIndex}-${lineIndex}`,
            kind: "context",
            content,
            indicator: " ",
            oldLineNumber: oldLine,
            newLineNumber: newLine,
          });
          oldLine += 1;
          newLine += 1;
        });
      });
    });

    return rows;
  } catch {
    return normalizedPatch.split("\n").map((line, index) => ({
      id: `raw-${index}`,
      kind: (
        line.startsWith("+")
          ? "added"
          : line.startsWith("-")
            ? "removed"
            : line.startsWith("@@") || line.startsWith("diff --git") || line.startsWith("--- ") || line.startsWith("+++ ")
              ? "meta"
              : "context"
      ) as DiffLineKind,
      content: line.replace(/^[-+ ]/, ""),
      indicator: line[0] || " ",
      oldLineNumber: null,
      newLineNumber: null,
    })) satisfies ParsedDiffLine[];
  }
}

function getSeverityTone(severity?: string | null) {
  const normalized = String(severity || "").toUpperCase();
  if (normalized === "HIGH" || normalized === "CRITICAL") {
    return {
      badge: "destructive" as const,
      text: "text-red-700 dark:text-red-300",
    };
  }

  if (normalized === "MEDIUM") {
    return {
      badge: "secondary" as const,
      text: "text-amber-700 dark:text-amber-200",
    };
  }

  return {
    badge: "outline" as const,
    text: "text-emerald-700 dark:text-emerald-300",
  };
}

function getInspectionSignalCount(issueIntelligence?: UnifiedIssueIntelligence | null) {
  if (!issueIntelligence) {
    return 0;
  }

  return (
    issueIntelligence.inspection_data.logs.length +
    issueIntelligence.inspection_data.failed_actions.length +
    (issueIntelligence.inspection_data.observed_behavior ? 1 : 0)
  );
}

export default function CodeInsightPanel({
  token,
  issue,
  trustConfidence,
  repositoryOverride,
  codeInsightsEnabled = true,
  onAskAssistant,
  onAnalysisChange,
}: CodeInsightPanelProps) {
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(
    null
  );
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [analysis, setAnalysis] = useState<CodeInsightResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingPatch, setEditingPatch] = useState(false);
  const [patchDraft, setPatchDraft] = useState("");
  const [prResult, setPrResult] = useState<CodeInsightPullRequestResult | null>(null);
  const [prStage, setPrStage] = useState<PrStage>(null);
  const [prError, setPrError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showChangesOnly, setShowChangesOnly] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
  } | null>(null);
  const lastActionAt = useRef(0);

  useEffect(() => {
    setStatusLoaded(false);
    setGithubStatus(null);
    setAnalysis(null);
    onAnalysisChange?.(null);
    setPatchDraft("");
    setEditingPatch(false);
    setPrResult(null);
    setPrStage(null);
    setPrError(null);
    setAnalysisError(null);
    setDismissed(false);
    setShowChangesOnly(true);
    setToast(null);
  }, [issue.id, onAnalysisChange, token]);

  useEffect(() => {
    if (!token || statusLoaded) {
      return;
    }

    const cachedStatus = safeSessionStorageGet(GITHUB_STATUS_CACHE_KEY);
    if (cachedStatus) {
      try {
        const parsed = JSON.parse(cachedStatus) as GitHubConnectionStatus;
        setGithubStatus(parsed);
        setStatusLoaded(true);
        return;
      } catch {
        // Ignore bad cache.
      }
    }

    let cancelled = false;
    void (async () => {
      try {
        const status = await api.github.status(token);
        if (!cancelled) {
          setGithubStatus(status);
          safeSessionStorageSet(GITHUB_STATUS_CACHE_KEY, JSON.stringify(status));
        }
      } catch {
        if (!cancelled) {
          setGithubStatus(null);
        }
      } finally {
        if (!cancelled) {
          setStatusLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [statusLoaded, token]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const confidence = analysis ? getConfidence(analysis) : null;
  const allPatchLines = useMemo(
    () => (patchDraft || analysis?.patch || "").split("\n"),
    [analysis?.patch, patchDraft]
  );
  const parsedPatchLines = useMemo<ParsedDiffLine[]>(
    () => parseUnifiedDiff(patchDraft || analysis?.patch || ""),
    [analysis?.patch, patchDraft]
  );
  const visibleDiffLines = useMemo<ParsedDiffLine[]>(
    () =>
      showChangesOnly
        ? parsedPatchLines.filter((line) => line.kind !== "context")
        : parsedPatchLines,
    [parsedPatchLines, showChangesOnly]
  );
  const changedLineCount = useMemo(
    () =>
      allPatchLines.filter(
        (line) =>
          (line.startsWith("+") || line.startsWith("-")) &&
          !line.startsWith("+++ ") &&
          !line.startsWith("--- ")
      ).length,
    [allPatchLines]
  );
  const risk = analysis ? getRisk(changedLineCount, analysis.files.length) : null;
  const matchStrength = analysis ? getMatchStrength(analysis) : null;
  const primaryFile = analysis?.files[0] ?? null;
  const primaryFileUrl = analysis ? getPrimaryFileUrl(analysis) : null;
  const confidenceExplanation =
    analysis && matchStrength
      ? `Based on ${issue.reportCount} related report${
          issue.reportCount === 1 ? "" : "s"
        } across ${issue.sources.length} source${
          issue.sources.length === 1 ? "" : "s"
        } and ${matchStrength} match in ${
          primaryFile?.path?.split("/").slice(-2).join("/") ?? "relevant files"
        }${
          typeof analysis.rootCauseConfidence === "number"
            ? ` with ${analysis.rootCauseConfidence.toFixed(1)}% root-cause confidence`
            : ""
        }.`
      : null;
  const issueIntelligence = analysis?.issueIntelligence ?? null;
  const severityTone = getSeverityTone(issueIntelligence?.severity || issue.priority);
  const affectedUsers =
    issueIntelligence?.analytics.affected_users ?? issue.reportCount;
  const inspectionSignalCount = getInspectionSignalCount(issueIntelligence);
  const hasPatch = Boolean((patchDraft || analysis?.patch || "").trim());
  const actionLabel =
    prStage === "branch"
      ? "Creating branch..."
      : prStage === "patch"
        ? "Applying patch..."
        : prStage === "pull-request"
          ? "Opening Pull Request..."
          : "Approve & Create PR";

  if (dismissed) {
    return null;
  }

  const runAnalysis = async () => {
    if (!token) {
      setAnalysisError("Sign in again to generate a code suggestion.");
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setPrResult(null);
    setPrError(null);

    try {
      const result = await api.codeAgent.analyzeIssue(token, issue.id, {
        repoOwner: repositoryOverride?.owner,
        repoName: repositoryOverride?.name,
      });
      setAnalysis(result);
      onAnalysisChange?.(result);
      setPatchDraft(result.patch);
      setEditingPatch(false);
      setShowChangesOnly(true);

    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message.toLowerCase() : "";
      setAnalysis(null);
      onAnalysisChange?.(null);
      setPatchDraft("");
      setAnalysisError(
        rawMessage.includes("no relevant code files")
          ? "No relevant code match found for this issue."
          : toUserFacingError(error, "github-code-insight")
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const applyFix = async () => {
    if (!token || !analysis || !hasPatch) {
      return;
    }

    const now = Date.now();
    if (now - lastActionAt.current < 900 || prStage) {
      return;
    }
    lastActionAt.current = now;

    setPrError(null);

    try {
      await api.codeAgent.recordOutcome(token, issue.id, {
        outcome: patchDraft !== analysis.patch ? "edit" : "accept",
        confidence: analysis.patchConfidence,
        edited: patchDraft !== analysis.patch,
        repoOwner: repositoryOverride?.owner || analysis.repository.owner,
        repoName: repositoryOverride?.name || analysis.repository.name,
      });
      setPrStage("branch");
      await sleep(400);
      setPrStage("patch");
      await sleep(400);
      const result = await api.codeAgent.createPullRequest(token, issue.id, {
        patch: patchDraft,
        title: analysis.prDescription?.title,
        prDescription: analysis.prDescription,
        repoOwner: repositoryOverride?.owner || analysis.repository.owner,
        repoName: repositoryOverride?.name || analysis.repository.name,
      });
      setPrStage("pull-request");
      await sleep(400);
      setPrResult(result);
      setToast({
        message: "Suggestion applied successfully",
        tone: "success",
      });
    } catch (error) {
      setPrError(toUserFacingError(error, "github-create-pr"));
    } finally {
      setPrStage(null);
    }
  };

  const rejectSuggestion = async () => {
    if (token && analysis) {
      try {
        await api.codeAgent.recordOutcome(token, issue.id, {
          outcome: "reject",
          confidence: analysis.patchConfidence,
          repoOwner: repositoryOverride?.owner || analysis.repository.owner,
          repoName: repositoryOverride?.name || analysis.repository.name,
        });
      } catch {
        // Best effort only. Rejection should still clear the panel.
      }
    }

    setAnalysis(null);
    onAnalysisChange?.(null);
    setPatchDraft("");
    setPrError(null);
    setPrResult(null);
    setToast({
      message: "Feedback recorded. Improving future suggestions.",
      tone: "neutral",
    });
  };

  const copyPatch = async () => {
    const value = patchDraft || analysis?.patch || "";
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setToast({
        message: "Patch copied to clipboard",
        tone: "neutral",
      });
    } catch {
      setToast({
        message: "Could not copy patch",
        tone: "neutral",
      });
    }
  };

  const applyPatchToPreview = () => {
    if (!hasPatch) {
      setToast({
        message: "No patch is available to apply yet",
        tone: "neutral",
      });
      return;
    }

    setEditingPatch(false);
    setToast({
      message: "Patch applied to preview",
      tone: "success",
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            <GitBranch className="h-4 w-4" />
            AI Code Insight
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Trace this issue into code and prepare a pull request
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            AgenticPulse searches only a few relevant files, drafts a minimal
            patch, and waits for your approval before opening a pull request.
          </p>
        </div>

        {githubStatus?.connected ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 transition-all duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Connected as @{githubStatus.username}
            </div>
            {githubStatus.repository?.owner && githubStatus.repository?.name ? (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300/80">
                Repo: {githubStatus.repository.owner}/{githubStatus.repository.name}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-300/80">
                Repository not selected yet
              </p>
            )}
          </div>
        ) : (
          <Link href="/dashboard/github">
            <Button
              variant="secondary"
              className="transition-all duration-200 hover:border-slate-500 hover:shadow-lg hover:shadow-slate-950/30"
            >
              Connect GitHub
            </Button>
          </Link>
        )}
      </div>

      {!statusLoaded ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-6 w-44 bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-28 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-64 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : null}

      {statusLoaded && !codeInsightsEnabled ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Code insights are currently disabled
          </p>
          <p className="mt-2 max-w-2xl">
            Turn on the Code Insights toggle to analyze code,
            generate patch suggestions, and open pull requests.
          </p>
        </div>
      ) : null}

      {statusLoaded &&
      (!githubStatus?.connected || !githubStatus.repository?.owner || !githubStatus.repository?.name) ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Connect GitHub to enable code insights
          </p>
          <p className="mt-2 max-w-2xl">
            Choose a repository so AgenticPulse can match issue
            patterns against real code and open a pull request for your approval.
          </p>
          <Link href="/dashboard/github" className="mt-4 inline-flex">
            <Button variant="secondary">Open GitHub Integration</Button>
          </Link>
        </div>
      ) : null}

      {codeInsightsEnabled &&
      githubStatus?.connected &&
      githubStatus.repository?.owner &&
      githubStatus.repository?.name ? (
        <div className="mt-6">
          {!analysis && !analyzing ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-5 py-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No relevant code suggestion found yet. Run analysis to inspect the
                connected repository for a minimal fix.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={runAnalysis}
                  className="w-full sm:w-auto"
                >
                  <WandSparkles className="h-4 w-4" />
                  Generate Suggestion
                </Button>
                <Link href="/dashboard/github" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Change Repository
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}

          {analyzing ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-5">
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Searching relevant files and preparing a patch...
                </p>
                <Skeleton className="h-5 w-48 bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="mt-3 h-20 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
              </div>
              <Skeleton className="h-72 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : null}

          {analysisError ? (
            <div className="mt-4 rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {analysisError}
            </div>
          ) : null}

          {analysis ? (
            <div className="space-y-5 transition-all duration-200">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_0.9fr]">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    <Activity className="h-4 w-4" />
                    Unified Issue Intelligence
                  </div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    {issueIntelligence?.title || analysis.issue.title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {issueIntelligence?.summary || analysis.issue.summary || analysis.issue.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={severityTone.badge}>
                      Severity: {issueIntelligence?.severity || issue.priority}
                    </Badge>
                    <Badge variant="outline">Affected users: {affectedUsers}</Badge>
                    <Badge variant="outline">
                      Frequency: {issueIntelligence?.frequency ?? issue.reportCount}
                    </Badge>
                    <Badge variant="outline">
                      Inspection signals: {inspectionSignalCount}
                    </Badge>
                  </div>
                  {issueIntelligence?.feedback_signals?.length ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Feedback Signals
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {issueIntelligence.feedback_signals.slice(0, 5).map((signal) => (
                          <Badge key={signal} variant="outline">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    <Eye className="h-4 w-4" />
                    Probable Context
                  </div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Area
                      </p>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">
                        {issueIntelligence?.affected_area || "General product surface"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Page
                      </p>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">
                        {issueIntelligence?.probable_context.page || "Not identified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        API
                      </p>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">
                        {issueIntelligence?.probable_context.api || "Not identified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Component Hint
                      </p>
                      <p className="mt-1 text-slate-700 dark:text-slate-300">
                        {issueIntelligence?.probable_context.component_hint || "Not identified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_240px]">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                    <Sparkles className="h-4 w-4" />
                    Root Cause
                  </div>
                  <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {analysis.selectedRootCause || analysis.rootCause}
                  </p>
                  {analysis.patchExplanation ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Patch Explanation
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {analysis.patchExplanation}
                      </p>
                    </div>
                  ) : null}
                  {analysis.impact ? (
                    <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                        Expected Impact
                      </p>
                      <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                        {analysis.impact}
                      </p>
                    </div>
                  ) : null}
                  {analysis.reasoningSummary ? (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {analysis.reasoningSummary}
                    </p>
                  ) : null}
                  {analysis.possibleCauses?.length ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Considered Causes
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {analysis.possibleCauses.map((cause) => (
                          <Badge key={cause} variant="outline">
                            {cause}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-5">
                  <div className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Confidence
                  </div>
                  {confidence ? (
                    <div>
                      <Badge variant={confidence.variant}>
                        {typeof analysis.patchConfidence === "number"
                          ? `${analysis.patchConfidence.toFixed(1)}% ${confidence.label}`
                          : confidence.label}
                      </Badge>
                      {typeof analysis.rootCauseConfidence === "number" ? (
                        <p className="mt-3 text-xs text-slate-400">
                          Root cause confidence:{" "}
                          {analysis.rootCauseConfidence.toFixed(1)}%
                        </p>
                      ) : null}
                      {confidence.label === "Low" ? (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Low confidence suggestion. Review carefully.
                        </div>
                      ) : null}
                      {confidenceExplanation ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                            Based on
                          </p>
                          <p className={`text-sm leading-6 ${confidence.tone}`}>
                            {confidenceExplanation}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    <ShieldAlert className="h-4 w-4" />
                    Risk
                  </div>
                  {risk ? (
                    <>
                      <Badge variant={risk.variant}>{risk.label}</Badge>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {risk.description}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Affected File
                  </p>
                  {primaryFile ? (
                    <a
                      href={primaryFileUrl ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 transition-all duration-200 hover:border-red-300 dark:hover:border-red-500/40"
                    >
                      <FileCode2 className="h-4 w-4 text-slate-400 dark:text-slate-400" />
                      {primaryFile.path}
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      No primary file identified.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Patch Footprint
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {analysis.changedFileCount ?? analysis.files.length} file
                      {(analysis.changedFileCount ?? analysis.files.length) === 1
                        ? ""
                        : "s"}
                    </Badge>
                    <Badge variant="outline">
                      {analysis.changedLineCount ?? changedLineCount} changed line
                      {(analysis.changedLineCount ?? changedLineCount) === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline">
                      {analysis.totalLines} lines reviewed
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Suggested patch</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Generated against {analysis.repository.owner}/
                      {analysis.repository.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowChangesOnly((current) => !current)}
                      disabled={!hasPatch}
                    >
                      {showChangesOnly ? "View Full File" : "View Changes Only"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingPatch((current) => !current)}
                      disabled={!hasPatch}
                    >
                      <PencilLine className="h-4 w-4" />
                      {editingPatch ? "Preview Diff" : "Edit Suggestion"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={copyPatch}
                      disabled={!hasPatch}
                    >
                      Copy Code
                    </Button>
                    {onAskAssistant ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          onAskAssistant({
                            message: "Explain this change in technical terms and tell me what to verify.",
                            action: "explain_patch",
                          })
                        }
                      >
                        <Sparkles className="h-4 w-4" />
                        Explain this change
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-rose-500/10 hover:text-rose-300"
                      onClick={() => void rejectSuggestion()}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                {!hasPatch ? (
                  <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                      AgenticPulse found likely root-cause reasoning for this issue, but it could not draft a safe minimal patch from the current repository context yet. You can still inspect the reasoning, ask AI for a narrower explanation, or retry after connecting a more relevant repo or branch.
                    </div>
                  </div>
                ) : null}

                {editingPatch ? (
                  <div className="p-5">
                    <textarea
                      value={patchDraft}
                      onChange={(event) => setPatchDraft(event.target.value)}
                      rows={18}
                      className="min-h-[360px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a0a0a] px-4 py-3 font-mono text-sm leading-6 text-slate-800 dark:text-slate-200 outline-none transition-all duration-200 focus:border-red-300 dark:focus:border-red-500/40 focus:ring-2 focus:ring-red-500/20"
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={applyPatchToPreview}>
                        Apply Patch
                      </Button>
                      <Button size="sm" variant="secondary" onClick={copyPatch}>
                        Copy Code
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={applyFix}
                        disabled={Boolean(prStage) || !hasPatch}
                      >
                        <GitPullRequest className="h-4 w-4" />
                        Create PR
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5">
                    {hasPatch ? (
                      <>
                        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
                        <div className="max-h-[460px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070b16] font-mono text-sm transition-all duration-200">
                          <div className="sticky top-0 z-10 grid grid-cols-[72px_72px_32px_minmax(0,1fr)] border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1220]/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 backdrop-blur">
                            <span>Old</span>
                            <span>New</span>
                            <span />
                            <span>Code</span>
                          </div>
                          {visibleDiffLines.map((line) => (
                            <div
                              key={line.id}
                              className={`grid grid-cols-[72px_72px_32px_minmax(0,1fr)] items-start gap-0 border-b border-slate-200/70 dark:border-slate-800/70 px-4 py-1.5 leading-6 transition-colors hover:bg-slate-100/70 dark:hover:bg-white/[0.04] ${getDiffLineClasses(
                                line.kind
                              )}`}
                            >
                              <span className="select-none text-right text-xs text-slate-400 dark:text-slate-500">
                                {line.oldLineNumber ?? ""}
                              </span>
                              <span className="select-none text-right text-xs text-slate-400 dark:text-slate-500">
                                {line.newLineNumber ?? ""}
                              </span>
                              <span
                                className={line.kind === "added"
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : line.kind === "removed"
                                    ? "text-red-700 dark:text-red-300"
                                    : "text-slate-400 dark:text-slate-500"}
                              >
                                {line.indicator}
                              </span>
                              <span className="overflow-x-auto whitespace-pre-wrap break-words">
                                {line.content || " "}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070b16] px-4 py-5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        No unified diff is available yet. Review the reasoning summary and relevant files, or regenerate after narrowing the repository context.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-4 z-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#161616]/95 p-3 shadow-2xl backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button
                    onClick={applyFix}
                    disabled={Boolean(prStage) || !hasPatch}
                    className="w-full sm:w-auto"
                  >
                    <GitPullRequest className="h-4 w-4" />
                    {actionLabel}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="w-full sm:w-auto"
                  >
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full hover:bg-slate-800 sm:w-auto"
                    onClick={() => setDismissed(true)}
                  >
                    Hide Panel
                  </Button>
                </div>
              </div>

              {trustConfidence?.issue_type ? (
                <DecisionFeedbackBar
                  token={token}
                  issueType={trustConfidence.issue_type}
                  compact
                />
              ) : null}

              {prError ? (
                <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                  {prError}
                </div>
              ) : null}

              {prResult ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        Pull Request Created
                      </p>
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
                        {prResult.pullRequest?.title || prResult.prTitle}
                      </p>
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        Branch: {prResult.branchName}
                      </p>
                      <a
                        href={prResult.pullRequest?.url || prResult.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 transition-all duration-200 hover:text-emerald-900 dark:hover:text-white"
                      >
                        View on GitHub
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Relevant files
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.files.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      onClick={() =>
                        onAskAssistant?.({
                          message: `Explain why ${file.path} matters for this issue and what I should inspect first.`,
                          action: "explain_file",
                          filePath: file.path,
                        })
                      }
                      className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:border-red-300 dark:hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400"
                    >
                      {file.path}
                    </button>
                  ))}
                </div>
              </div>

              {analysis.alternativeFixes?.length ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Alternative Fixes
                    </p>
                    <p className="text-xs text-slate-500">
                      Ranked safest-first
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {analysis.alternativeFixes.map((option) => (
                      <div
                        key={`${option.rank}-${option.title}`}
                        className={`rounded-2xl border p-4 ${
                          option.recommended
                            ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {option.title}
                          </p>
                          <Badge variant={option.recommended ? "success" : "outline"}>
                            #{option.rank}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {option.summary}
                        </p>
                        {option.pros.length ? (
                          <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-300">
                            Pros: {option.pros.join(" • ")}
                          </p>
                        ) : null}
                        {option.cons.length ? (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-300/80">
                            Cons: {option.cons.join(" • ")}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {analysis.prDescription ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Pull Request Draft
                  </p>
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {analysis.prDescription.title}
                    </p>
                    <p className="text-sm leading-6 text-slate-400">
                      {analysis.prDescription.summary}
                    </p>
                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                      Root cause: {analysis.prDescription.rootCause}
                    </p>
                    {analysis.prDescription.changes.length ? (
                      <ul className="space-y-2 text-sm text-slate-400">
                        {analysis.prDescription.changes.map((change) => (
                          <li key={change}>- {change}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-sm text-slate-400">
                      Impact: {analysis.prDescription.impact}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl border px-4 py-3 text-sm shadow-2xl transition-all duration-200 ${
            toast.tone === "success"
              ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1a] text-slate-700 dark:text-slate-200"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}
