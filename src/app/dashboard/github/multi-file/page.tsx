"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parsePatch } from "diff";
import {
  AlertTriangle,
  ArrowRight,
  FileCode2,
  GitPullRequest,
  Layers3,
  Loader2,
  Network,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type CodeInsightPullRequestResult,
  type GitHubConnectionStatus,
  type Issue,
  type MultiFileAnalysisResult,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { writeStoredBoolean } from "@/lib/useStoredBoolean";

type DiffLine = {
  id: string;
  kind: "added" | "removed" | "context" | "meta";
  indicator: string;
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
};

function parseInlinePatch(patch: string) {
  const normalized = String(patch || "").trim();
  if (!normalized) return [] as DiffLine[];

  try {
    const parsed = parsePatch(normalized);
    const rows: DiffLine[] = [];

    parsed.forEach((file, fileIndex) => {
      rows.push({
        id: `file-${fileIndex}`,
        kind: "meta",
        indicator: "…",
        content: `${file.oldFileName || "original"} -> ${file.newFileName || "updated"}`,
        oldLineNumber: null,
        newLineNumber: null,
      });

      file.hunks.forEach((hunk, hunkIndex) => {
        rows.push({
          id: `hunk-${fileIndex}-${hunkIndex}`,
          kind: "meta",
          indicator: "@",
          content: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
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
              indicator: "·",
              content: line,
              oldLineNumber: null,
              newLineNumber: null,
            });
            return;
          }

          if (marker === "+") {
            rows.push({
              id: `add-${fileIndex}-${hunkIndex}-${lineIndex}`,
              kind: "added",
              indicator: "+",
              content,
              oldLineNumber: null,
              newLineNumber: newLine++,
            });
            return;
          }

          if (marker === "-") {
            rows.push({
              id: `remove-${fileIndex}-${hunkIndex}-${lineIndex}`,
              kind: "removed",
              indicator: "-",
              content,
              oldLineNumber: oldLine++,
              newLineNumber: null,
            });
            return;
          }

          rows.push({
            id: `context-${fileIndex}-${hunkIndex}-${lineIndex}`,
            kind: "context",
            indicator: " ",
            content,
            oldLineNumber: oldLine++,
            newLineNumber: newLine++,
          });
        });
      });
    });

    return rows;
  } catch {
    return normalized.split("\n").map((line, index) => ({
      id: `raw-${index}`,
      kind: (
        line.startsWith("+")
          ? "added"
          : line.startsWith("-")
            ? "removed"
            : line.startsWith("@@") || line.startsWith("--- ") || line.startsWith("+++ ")
              ? "meta"
              : "context"
      ) as DiffLine["kind"],
      indicator: line[0] || " ",
      content: line.replace(/^[-+ ]/, ""),
      oldLineNumber: null,
      newLineNumber: null,
    }));
  }
}

function getDiffTone(kind: DiffLine["kind"]) {
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

export default function MultiFileAnalysisPage() {
  const { session } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MultiFileAnalysisResult | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<CodeInsightPullRequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpdated, setShowUpdated] = useState(false);

  useEffect(() => {
    writeStoredBoolean("product-pulse-sidebar-expanded", false);
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const [issueList, status] = await Promise.all([
          api.issues.list(session.access_token),
          api.github.status(session.access_token).catch(() => null),
        ]);
        if (cancelled) return;
        setIssues(issueList);
        setGithubStatus(status);
        setSelectedIssueId((current) => current || issueList[0]?.id || null);
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "github-connect"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const selectedIssue = useMemo(
    () => issues.find((issue) => issue.id === selectedIssueId) || null,
    [issues, selectedIssueId]
  );

  const selectedFile = useMemo(
    () => analysis?.files.find((file) => file.path === selectedFilePath) || analysis?.files[0] || null,
    [analysis?.files, selectedFilePath]
  );

  const selectedPatchFile = useMemo(
    () => analysis?.patchFiles.find((file) => file.path === selectedFile?.path) || null,
    [analysis?.patchFiles, selectedFile?.path]
  );

  const visibleCode = useMemo(() => {
    if (!selectedFile) return "";
    if (showUpdated && selectedPatchFile?.updatedSnippet) {
      return selectedPatchFile.updatedSnippet;
    }
    return selectedFile.snippet;
  }, [selectedFile, selectedPatchFile, showUpdated]);

  const lineNumbers = useMemo(() => {
    const total = Math.max(12, visibleCode.split("\n").length);
    const start = selectedFile?.startLine || 1;
    return Array.from({ length: total }, (_, index) => start + index);
  }, [visibleCode, selectedFile?.startLine]);

  const highlightRange = useMemo(() => {
    if (!selectedFile?.finding) return null;
    const risky = selectedFile.riskyNodes?.[0];
    if (!risky) return null;
    return { start: risky.startLine, end: risky.endLine };
  }, [selectedFile]);

  const diffLines = useMemo(
    () => parseInlinePatch(selectedPatchFile?.patch || ""),
    [selectedPatchFile?.patch]
  );

  const runAnalysis = async () => {
    if (!session?.access_token || !selectedIssueId) return;
    setAnalyzing(true);
    setError(null);
    setPrResult(null);
    try {
      const result = await api.codeAgent.analyzeMultiFile(session.access_token, selectedIssueId);
      setAnalysis(result);
      setSelectedFilePath(result.files[0]?.path || null);
      setShowUpdated(false);
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setAnalyzing(false);
    }
  };

  const createPr = async () => {
    if (!session?.access_token || !selectedIssueId || !analysis?.patch) return;
    setCreatingPr(true);
    setError(null);
    try {
      const result = await api.codeAgent.createPullRequest(session.access_token, selectedIssueId, {
        patch: analysis.patch,
        title: `Fix: ${analysis.issue.title}`,
        repoOwner: analysis.repository.owner,
        repoName: analysis.repository.name,
      });
      setPrResult(result);
    } catch (err) {
      setError(toUserFacingError(err, "github-create-pr"));
    } finally {
      setCreatingPr(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            <Layers3 className="h-4 w-4" />
            Multi-File Analysis
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Reason across connected files, not isolated snippets
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            AgenticPulse selects only a small set of relevant files, maps imports and risky nodes, then reasons about cross-file flow before suggesting a multi-file patch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/github">
            <Button variant="outline">Back to GitHub Workspace</Button>
          </Link>
          <Button onClick={runAnalysis} disabled={!selectedIssueId || analyzing || !githubStatus?.connected}>
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run Multi-File Analysis
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {prResult && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Pull request created:{" "}
          <a className="font-medium underline" href={prResult.pullRequest?.url || prResult.prUrl || "#"} target="_blank" rel="noreferrer">
            {prResult.pullRequest?.title || prResult.prTitle || "View PR"}
          </a>
        </div>
      )}

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
        <CardContent className="pt-6">
          {loading ? (
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
              <Skeleton className="h-[560px] rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-[560px] rounded-2xl bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-[560px] rounded-2xl bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.03] shadow-none">
                  <CardHeader>
                    <CardTitle>Issue Input</CardTitle>
                    <CardDescription>Choose the issue to expand into multi-file reasoning.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <select
                      value={selectedIssueId || ""}
                      onChange={(event) => setSelectedIssueId(event.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent px-3 text-sm text-slate-900 dark:text-slate-100"
                    >
                      {issues.map((issue) => (
                        <option key={issue.id} value={issue.id}>
                          {issue.title}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-4 text-sm text-slate-600 dark:text-slate-300">
                      <p className="font-medium text-slate-900 dark:text-white">{selectedIssue?.title || "No issue selected"}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {githubStatus?.repository?.owner && githubStatus?.repository?.name
                          ? `Repo: ${githubStatus.repository.owner}/${githubStatus.repository.name}`
                          : "Select a primary repository in GitHub workspace first."}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.03] shadow-none">
                  <CardHeader>
                    <CardTitle>File Navigator</CardTitle>
                    <CardDescription>Switch between the selected files in the reasoning set.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {analysis?.files?.length ? (
                      analysis.files.map((file) => (
                        <button
                          key={file.path}
                          type="button"
                          onClick={() => setSelectedFilePath(file.path)}
                          className={cn(
                            "w-full rounded-2xl border p-3 text-left transition-all",
                            selectedFilePath === file.path || (!selectedFilePath && analysis.files[0]?.path === file.path)
                              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-transparent hover:border-slate-300 dark:hover:border-slate-700"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{file.path}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{file.filePurpose}</p>
                            </div>
                            <Badge variant="outline">{Math.round(file.matchStrength * 100)}%</Badge>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Run analysis to load relevant files.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
                  <CardHeader>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle>{selectedFile?.path || "Code Viewer"}</CardTitle>
                        <CardDescription>
                          {selectedFile ? `Lines ${selectedFile.startLine}-${selectedFile.endLine}` : "Choose a file from the navigator."}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant={showUpdated ? "outline" : "default"} size="sm" onClick={() => setShowUpdated(false)} disabled={!selectedFile}>
                          Original
                        </Button>
                        <Button variant={showUpdated ? "default" : "outline"} size="sm" onClick={() => setShowUpdated(true)} disabled={!selectedPatchFile}>
                          Updated
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedFile ? (
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0d1118]">
                        <div className="grid max-h-[620px] min-h-[520px] grid-cols-[64px_minmax(0,1fr)] overflow-hidden">
                          <div className="border-r border-slate-200 dark:border-slate-800 bg-white/80 py-4 text-right text-xs text-slate-400 dark:bg-white/[0.02] dark:text-slate-500">
                            {lineNumbers.map((line) => (
                              <div
                                key={line}
                                className={cn(
                                  "pr-3 font-mono leading-6",
                                  highlightRange && line >= highlightRange.start && line <= highlightRange.end &&
                                    "border-l-2 border-amber-500 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-amber-500/10 dark:text-amber-300"
                                )}
                              >
                                {line}
                              </div>
                            ))}
                          </div>
                          <pre className="overflow-auto px-4 py-4 font-mono text-[13px] leading-6 text-slate-900 dark:text-slate-100">
                            {visibleCode}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No file selected yet.</p>
                    )}
                  </CardContent>
                </Card>

                {selectedPatchFile && (
                  <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
                    <CardHeader>
                      <CardTitle>Patch Preview</CardTitle>
                      <CardDescription>Focused diff for the selected file.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[320px] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070b16] font-mono text-sm">
                        {diffLines.map((line) => (
                          <div
                            key={line.id}
                            className={`grid grid-cols-[64px_64px_28px_minmax(0,1fr)] border-b border-slate-200/70 dark:border-slate-800/70 px-4 py-1.5 leading-6 ${getDiffTone(line.kind)}`}
                          >
                            <span className="text-right text-xs text-slate-400 dark:text-slate-500">{line.oldLineNumber ?? ""}</span>
                            <span className="text-right text-xs text-slate-400 dark:text-slate-500">{line.newLineNumber ?? ""}</span>
                            <span>{line.indicator}</span>
                            <span className="whitespace-pre-wrap break-words">{line.content || " "}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
                  <CardHeader>
                    <CardTitle>AI Panel</CardTitle>
                    <CardDescription>Cross-file reasoning and flow visualization.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.03] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Root Cause</p>
                          <p className="mt-2 text-sm leading-6 text-slate-900 dark:text-white">{analysis.rootCause}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.03] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Cross-File Flow</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{analysis.flowSummary}</p>
                          {selectedFile?.finding?.flowTo?.length ? (
                            <div className="mt-3 space-y-2">
                              {selectedFile.finding.flowTo.map((target) => (
                                <div key={target} className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
                                  <Network className="h-3.5 w-3.5" />
                                  {selectedFile.path}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  {target}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.03] p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Recommendations</p>
                          <div className="mt-3 space-y-2">
                            {analysis.recommendations.map((item) => (
                              <div key={item} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">Confidence {(analysis.confidence * 100).toFixed(0)}%</Badge>
                          <Badge variant="outline">{analysis.meta.fileCount} files</Badge>
                          {analysis.meta.llmFallback && <Badge variant="secondary">AST-assisted fallback</Badge>}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button onClick={createPr} disabled={!analysis.patch || creatingPr}>
                            {creatingPr ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitPullRequest className="h-4 w-4" />}
                            Create Multi-File PR
                          </Button>
                          <Button variant="outline" onClick={() => setShowUpdated((current) => !current)} disabled={!selectedPatchFile}>
                            <FileCode2 className="h-4 w-4" />
                            {showUpdated ? "View Original Snippet" : "Preview Updated Snippet"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.03] p-4 text-sm text-slate-500 dark:text-slate-400">
                        Run analysis to see root cause, file interactions, and patch suggestions.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {analysis?.files?.length ? (
                  <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
                    <CardHeader>
                      <CardTitle>File Signals</CardTitle>
                      <CardDescription>AST summary for the selected reasoning set.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysis.files.map((file) => (
                        <div key={file.path} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.03] p-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{file.path}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline">{file.functions.length} functions</Badge>
                            <Badge variant="outline">{file.imports.length} imports</Badge>
                            <Badge variant="outline">{file.riskyNodes.length} risky nodes</Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
