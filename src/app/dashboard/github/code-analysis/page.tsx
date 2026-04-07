"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { parsePatch } from "diff";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clipboard,
  Command,
  FileCode2,
  FileJson,
  FileUp,
  FlaskConical,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Layers3,
  Loader2,
  MessageSquareText,
  PanelBottomClose,
  PanelBottomOpen,
  Play,
  RefreshCcw,
  Search,
  Sparkles,
  TerminalSquare,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CodeAnalysisWorkspace } from "@/components/CodeAnalysisWorkspace";
import {
  api,
  type CodeAutoFixResponse,
  type CodeAnalysisJobStatusResponse,
  type CodeGeneratedTestsResponse,
  type CodeRiskAnalysisResponse,
  type CodeTestRunResponse,
  type GitHubConnectionStatus,
  type GitHubRepository,
  type RepoStructure,
  type SelfHealJobStatusResponse,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { writeStoredBoolean } from "@/lib/useStoredBoolean";

type InputTab = "paste" | "upload" | "repo";
type DisplayIssue = {
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

const SAMPLE_CODE = `async function submitOrder(payload) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return data.order.id;
}

export async function checkout(formValues) {
  const result = submitOrder(formValues);
  return result.id;
}`;

const LOADING_STEPS = [
  "Parsing code structure",
  "Checking risk patterns",
  "Comparing AI reasoning",
  "Preparing issue intelligence",
];
const ANALYZER_GRAPH_CONTEXT_KEY = "agenticpulse-code-analysis-graph";

function inferLanguageFromPath(path: string) {
  const normalized = path.toLowerCase();
  if (normalized.endsWith(".ts") || normalized.endsWith(".tsx")) return "TypeScript";
  if (normalized.endsWith(".js") || normalized.endsWith(".jsx") || normalized.endsWith(".mjs") || normalized.endsWith(".cjs")) return "JavaScript";
  if (normalized.endsWith(".py")) return "Python";
  if (normalized.endsWith(".java")) return "Java";
  if (normalized.endsWith(".go")) return "Go";
  if (normalized.endsWith(".rb")) return "Ruby";
  if (normalized.endsWith(".php")) return "PHP";
  if (normalized.endsWith(".rs")) return "Rust";
  if (normalized.endsWith(".c")) return "C";
  if (normalized.endsWith(".cpp") || normalized.endsWith(".cc") || normalized.endsWith(".cxx") || normalized.endsWith(".hpp")) return "C++";
  if (normalized.endsWith(".cs")) return "C#";
  if (normalized.endsWith(".swift")) return "Swift";
  if (normalized.endsWith(".kt") || normalized.endsWith(".kts")) return "Kotlin";
  if (normalized.endsWith(".scala")) return "Scala";
  if (normalized.endsWith(".sql")) return "SQL";
  if (normalized.endsWith(".html") || normalized.endsWith(".htm")) return "HTML";
  if (normalized.endsWith(".css")) return "CSS";
  if (normalized.endsWith(".scss") || normalized.endsWith(".sass")) return "SCSS";
  if (normalized.endsWith(".less")) return "Less";
  if (normalized.endsWith(".json")) return "JSON";
  if (normalized.endsWith(".yaml") || normalized.endsWith(".yml")) return "YAML";
  if (normalized.endsWith(".xml")) return "XML";
  if (normalized.endsWith(".md")) return "Markdown";
  if (normalized.endsWith(".sh") || normalized.endsWith(".bash") || normalized.endsWith(".zsh")) return "Bash";
  if (normalized.endsWith(".ps1")) return "PowerShell";
  if (normalized.endsWith("dockerfile")) return "Dockerfile";
  if (normalized.endsWith(".vue")) return "Vue";
  if (normalized.endsWith(".svelte")) return "Svelte";
  return "Text";
}

function inferLanguageFromCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return "Text";
  if (/^\s*<\?php/.test(trimmed)) return "PHP";
  if (/^#!/.test(trimmed) || /\becho\b.+\$/m.test(code)) return "Bash";
  if (/\binterface\b|\btype\b|:\s*(string|number|boolean|unknown|any)\b/.test(code)) return "TypeScript";
  if (/\bdef\s+\w+\s*\(|\bself\b|\bprint\(/.test(code)) return "Python";
  if (/\bpublic\s+class\b|\bSystem\.out\.println\b|\bpackage\s+[a-z0-9_.]+;/i.test(code)) return "Java";
  if (/\bfunc\s+\w+\s*\(|\bpackage\s+main\b|\bfmt\./.test(code)) return "Go";
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|\bimpl\b/.test(code)) return "Rust";
  if (/\busing\s+System\b|\bnamespace\b|\bpublic\s+(class|record)\b/.test(code)) return "C#";
  if (/\bfun\s+\w+\s*\(|\bval\s+\w+\s*=/.test(code)) return "Kotlin";
  if (/\bSELECT\b|\bFROM\b|\bWHERE\b|\bJOIN\b/i.test(code)) return "SQL";
  if (/<template>|<script setup|<script lang=/.test(code)) return "Vue";
  if (/<script>|<\/[a-z]+>/.test(code) && /<html|<div|<span|<body/i.test(code)) return "HTML";
  if (/^\s*[.#]?[a-z0-9_-]+\s*\{/.test(code) || /:\s*[^;]+;/.test(code)) return "CSS";
  if (/<[A-Z][A-Za-z]+/.test(code) || /return\s*\(/.test(code)) return "React / JSX";
  if (/\bfunction\b|\bconst\b|\bawait\b|\basync\b|\bexport\b|\bimport\b/.test(code)) return "JavaScript";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "JSON";
  return "Text";
}

function inferCategory(title: string, detail: string) {
  const normalized = `${title} ${detail}`.toLowerCase();
  if (/(auth|login|token|session|password|signin)/.test(normalized)) return "Authentication";
  if (/(xss|csrf|secret|credential|security|permission)/.test(normalized)) return "Security";
  if (/(latency|slow|performance|timeout|blocking|render)/.test(normalized)) return "Performance";
  if (/(input|validation|sanitize|form|payload)/.test(normalized)) return "Validation";
  if (/(null|undefined|optional|property)/.test(normalized)) return "Reliability";
  if (/(promise|async|await|catch|throw)/.test(normalized)) return "Async Flow";
  return "Code Risk";
}

function inferImpact(severity: string, detail: string) {
  const normalizedDetail = detail.toLowerCase();
  if (severity === "high" && /(crash|security|credential|data loss|auth)/.test(normalizedDetail)) {
    return "critical" as const;
  }
  if (severity === "high") return "high" as const;
  if (severity === "medium") return "medium" as const;
  return "low" as const;
}

function parseInlinePatch(patch: string) {
  if (!patch.trim()) return [] as DiffLine[];

  try {
    const parsed = parsePatch(patch);
    const rows: DiffLine[] = [];
    parsed.forEach((file, fileIndex) => {
      file.hunks.forEach((hunk, hunkIndex) => {
        rows.push({
          id: `meta-${fileIndex}-${hunkIndex}`,
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
          if (marker === "\\") return;
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
    return [] as DiffLine[];
  }
}

function getSeverityTone(severity: string) {
  if (severity === "high") {
    return "border-red-200/80 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }
  if (severity === "medium") {
    return "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function getImpactTone(impact: DisplayIssue["impact"]) {
  if (impact === "critical" || impact === "high") {
    return "border-red-200/80 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }
  if (impact === "medium") {
    return "border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function highlightInlineCode(content: string) {
  const tokens = String(content).split(/(\s+|[()[\]{}.,:;=+\-*/<>!&|]+)/g);
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
    "export",
    "import",
    "from",
  ]);

  return tokens.map((token, index) => {
    if (!token) return null;
    if (/^\s+$/.test(token)) return <span key={`${token}-${index}`}>{token}</span>;

    const isKeyword = keywordSet.has(token);
    const isString = /^['"`].*['"`]$/.test(token);
    const isNumber = /^\d+$/.test(token);

    return (
      <span
        key={`${token}-${index}`}
        className={cn(
          isKeyword && "text-blue-700 dark:text-blue-300",
          isString && "text-emerald-700 dark:text-emerald-300",
          isNumber && "text-amber-700 dark:text-amber-300"
        )}
      >
        {token}
      </span>
    );
  });
}

function buildDisplayIssues(result: CodeRiskAnalysisResponse) {
  return result.issues.map((issue, index) => ({
    id: `${issue.title}-${issue.startLine || "unknown"}-${index}`,
    title: issue.title,
    description: issue.detail,
    severity: (issue.severity === "high" || issue.severity === "medium" ? issue.severity : "low") as
      | "low"
      | "medium"
      | "high",
    impact: inferImpact(issue.severity, issue.detail),
    confidence: Math.min(
      1,
      result.confidence + (issue.severity === "high" ? 0.12 : issue.severity === "medium" ? 0.06 : 0.02)
    ),
    category: inferCategory(issue.title, issue.detail),
    source: issue.source,
    startLine: issue.startLine,
    endLine: issue.endLine,
  })) satisfies DisplayIssue[];
}

function buildFallbackDisplayIssue(
  result: CodeRiskAnalysisResponse,
  currentCode: string
): DisplayIssue {
  const explanation = result.explanation;
  const lines = String(currentCode || "").split("\n");
  const totalLines = Math.max(1, lines.length);
  const targetedStart = explanation?.targeted_lines?.start || 1;
  const targetedEnd = explanation?.targeted_lines?.end || Math.min(totalLines, targetedStart + 4);
  const title =
    result.topIssue?.title ||
    (result.risk_score >= 0.55 ? "Code quality risk detected" : "Recommended hardening update");
  const description =
    explanation?.what ||
    result.fixSummary ||
    result.suggestions?.[0] ||
    "A focused improvement can make this code safer and easier to maintain.";
  const severity: DisplayIssue["severity"] =
    result.topIssue?.severity === "high" || result.risk_score >= 0.7
      ? "high"
      : result.topIssue?.severity === "medium" || result.risk_score >= 0.45
        ? "medium"
        : "low";

  return {
    id: "analysis-fallback-issue",
    title,
    description,
    severity,
    impact:
      result.impact === "critical" || result.impact === "high"
        ? result.impact
        : severity === "high"
          ? "high"
          : severity === "medium"
            ? "medium"
            : "low",
    confidence: Math.max(0.56, result.confidence || 0.56),
    category: inferCategory(title, description),
    source: result.topIssue?.source || "Analysis",
    startLine: targetedStart,
    endLine: targetedEnd,
  };
}

function getIssueSnippet(code: string, issue: DisplayIssue | null) {
  const lines = code.split("\n");
  if (!issue?.startLine) return lines.slice(0, 10).join("\n");
  const start = Math.max(1, issue.startLine - 2);
  const end = Math.min(lines.length, (issue.endLine || issue.startLine) + 2);
  return lines.slice(start - 1, end).join("\n");
}

export default function CodeAnalysisPage() {
  const { session } = useAuth();
  const [inputTab, setInputTab] = useState<InputTab>("paste");
  const [code, setCode] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Scratch input");
  const [repoStatus, setRepoStatus] = useState<GitHubConnectionStatus | null>(null);
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoStructure, setRepoStructure] = useState<RepoStructure | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [analysis, setAnalysis] = useState<CodeRiskAnalysisResponse | null>(null);
  const [issues, setIssues] = useState<DisplayIssue[]>([]);
  const [selectedIssueIndex, setSelectedIssueIndex] = useState(0);
  const [fixResult, setFixResult] = useState<CodeAutoFixResponse | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [generatedTests, setGeneratedTests] = useState<CodeGeneratedTestsResponse | null>(null);
  const [testResult, setTestResult] = useState<CodeTestRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [analysisJob, setAnalysisJob] = useState<CodeAnalysisJobStatusResponse | null>(null);
  const [pullRequestCreating, setPullRequestCreating] = useState(false);
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [askLoading, setAskLoading] = useState(false);
  const [testGenerating, setTestGenerating] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [selfHealJob, setSelfHealJob] = useState<SelfHealJobStatusResponse | null>(null);
  const [selfHealing, setSelfHealing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("tests");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeViewerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    writeStoredBoolean("product-pulse-sidebar-expanded", false);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = window.setInterval(() => {
      setLoadingStepIndex((current) => (current + 1) % LOADING_STEPS.length);
    }, 900);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const [repoOwner, repoName] = selectedRepo.split("/");
    const repoBacked =
      inputTab === "repo" &&
      Boolean(repoOwner && repoName && selectedPath);

    if (!analysis || !repoBacked) {
      window.sessionStorage.removeItem(ANALYZER_GRAPH_CONTEXT_KEY);
      return;
    }

    const payload = {
      savedAt: new Date().toISOString(),
      repository: {
        owner: repoOwner,
        name: repoName,
        defaultBranch: repoStructure?.defaultBranch || "main",
      },
      selectedPath,
      sourceLabel,
      currentFileLabel: selectedPath || sourceLabel,
      code: String((fixResult?.updated || code) || "").slice(0, 50000),
      issues,
      analysis: {
        risk_score: analysis.risk_score,
        confidence: analysis.confidence,
        explanation: analysis.explanation || null,
        impact: analysis.impact || null,
      },
      repoStructure: repoStructure
        ? {
            defaultBranch: repoStructure.defaultBranch,
            keyFiles: repoStructure.keyFiles,
            techStack: repoStructure.techStack,
            fileCount: repoStructure.fileCount,
          }
        : null,
    };

    window.sessionStorage.setItem(ANALYZER_GRAPH_CONTEXT_KEY, JSON.stringify(payload));
  }, [
    analysis,
    code,
    fixResult?.updated,
    inputTab,
    issues,
    repoStructure,
    selectedRepo,
    selectedPath,
    sourceLabel,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;

    void (async () => {
      try {
        const [status, repoResponse] = await Promise.all([
          api.github.status(session.access_token).catch(() => null),
          api.github.repos(session.access_token).catch(() => ({ repos: [] })),
        ]);
        if (cancelled) return;
        setRepoStatus(status);
        setRepos(repoResponse.repos || []);
        const connectedRepo =
          status?.repository?.owner && status?.repository?.name
            ? `${status.repository.owner}/${status.repository.name}`
            : "";
        const fallbackRepo = connectedRepo || repoResponse.repos[0]?.fullName || "";
        setSelectedRepo((current) => current || fallbackRepo);
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "github-code-insight"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !selectedRepo || inputTab !== "repo") return;
    const [repoOwner, repoName] = selectedRepo.split("/");
    if (!repoOwner || !repoName) return;
    let cancelled = false;

    setRepoLoading(true);
    void (async () => {
      try {
        const response = await api.github.structure(session.access_token, {
          repoOwner,
          repoName,
        });
        if (cancelled) return;
        setRepoStructure(response.structure);
        setSelectedPath((current) => current || response.structure.keyFiles[0] || "");
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "github-code-insight"));
          setRepoStructure(null);
        }
      } finally {
        if (!cancelled) {
          setRepoLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inputTab, selectedRepo, session?.access_token]);

  const selectedIssue = issues[selectedIssueIndex] || null;
  const effectiveCode = fixResult?.updated || code;
  const lineCount = useMemo(
    () => (effectiveCode.trim() ? effectiveCode.split("\n").length : 0),
    [effectiveCode]
  );
  const detectedLanguage = useMemo(() => {
    if (selectedPath) return inferLanguageFromPath(selectedPath);
    return inferLanguageFromCode(effectiveCode);
  }, [effectiveCode, selectedPath]);
  const diffLines = useMemo(() => parseInlinePatch(fixResult?.patch || ""), [fixResult?.patch]);
  const codeLines = useMemo(() => effectiveCode.split("\n"), [effectiveCode]);
  const repoSelection = useMemo(() => {
    const [repoOwner, repoName] = selectedRepo.split("/");
    return {
      repoOwner: repoOwner || "",
      repoName: repoName || "",
    };
  }, [selectedRepo]);
  const isRepoBackedAnalysis =
    inputTab === "repo" && Boolean(repoSelection.repoOwner && repoSelection.repoName && selectedPath);

  const resolveQueuedAnalysis = async (nextCode: string, source = "manual") => {
    if (!session?.access_token) {
      throw new Error("You need to be signed in to analyze code.");
    }

    const started = await api.github.startAnalysis(session.access_token, {
      code: nextCode,
      source,
      language: detectedLanguage,
      filePath: selectedPath || sourceLabel,
    });
    setAnalysisJob({
      id: started.jobId,
      status: started.status,
      result: started.result || null,
      error: null,
      createdAt: null,
      processedAt: null,
      completedAt: null,
    });

    if (started.result) {
      return started.result;
    }

    throw new Error("Code analysis did not return a result.");
  };

  useEffect(() => {
    if (!selectedIssue?.startLine || !codeViewerRef.current) return;
    const target = codeViewerRef.current.querySelector<HTMLDivElement>(
      `[data-line='${selectedIssue.startLine}']`
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedIssue?.startLine, showDiff]);

  const handleAnalyze = async () => {
    if (!session?.access_token || !code.trim()) {
      setError("Add code first so the analyzer has something to inspect.");
      return;
    }

    setLoading(true);
    setError(null);
    setAiAnswer(null);
    setFixResult(null);
    setGeneratedTests(null);
    setTestResult(null);
    setPullRequestUrl(null);
    setShowDiff(false);
    setLoadingStepIndex(0);
    try {
      const result = await resolveQueuedAnalysis(code, inputTab);
      const nextIssues = buildDisplayIssues(result);
      const safeIssues =
        nextIssues.length > 0 ? nextIssues : [buildFallbackDisplayIssue(result, code)];
      setAnalysis(result);
      setIssues(safeIssues);
      setSelectedIssueIndex(0);
      let nextFix = result.patch || null;

      if (!nextFix) {
        try {
          nextFix = await api.github.generateFix(session.access_token, {
            code,
            language: detectedLanguage,
            filePath: selectedPath || sourceLabel,
            issue: {
              title: safeIssues[0].title,
              severity: safeIssues[0].severity,
              detail: safeIssues[0].description,
              startLine: safeIssues[0].startLine,
              endLine: safeIssues[0].endLine,
            },
          });
        } catch {
          nextFix = null;
        }
      }

      setFixResult(nextFix);
      setShowDiff(Boolean(nextFix?.patch));
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = () => {
    setCode(SAMPLE_CODE);
    setSourceLabel("Sample checkout flow");
    setAnalysis(null);
    setFixResult(null);
    setAiAnswer(null);
    setGeneratedTests(null);
    setTestResult(null);
    setShowDiff(false);
    setAnalysisJob(null);
    setPullRequestUrl(null);
    setError(null);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCode(text);
    setSourceLabel(file.name);
    setSelectedPath(file.name);
    setAnalysis(null);
    setFixResult(null);
    setAiAnswer(null);
    setGeneratedTests(null);
    setTestResult(null);
    setShowDiff(false);
    setAnalysisJob(null);
    setPullRequestUrl(null);
    setError(null);
  };

  const handleLoadRepoFile = async () => {
    if (!session?.access_token || !selectedRepo || !selectedPath) return;
    const { repoOwner, repoName } = repoSelection;
    if (!repoOwner || !repoName) return;

    setRepoLoading(true);
    setError(null);
    try {
      const file = await api.github.repoFile(session.access_token, {
        repoOwner,
        repoName,
        path: selectedPath,
      });
      setCode(file.content);
      setSelectedPath(file.path);
      setSourceLabel(`${repoOwner}/${repoName}:${file.path}`);
      setAnalysis(null);
      setFixResult(null);
      setAiAnswer(null);
      setGeneratedTests(null);
      setTestResult(null);
      setShowDiff(false);
      setAnalysisJob(null);
      setPullRequestUrl(null);
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setRepoLoading(false);
    }
  };

  const handleGenerateFix = async () => {
    if (!session?.access_token || !effectiveCode.trim()) return;
    setFixLoading(true);
    setError(null);
    try {
      const result = await api.github.generateFix(session.access_token, {
        code: effectiveCode,
        language: detectedLanguage,
        filePath: selectedPath || sourceLabel,
        issue: selectedIssue
          ? {
              title: selectedIssue.title,
              severity: selectedIssue.severity,
              detail: selectedIssue.description,
              startLine: selectedIssue.startLine,
              endLine: selectedIssue.endLine,
            }
          : undefined,
      });
      setFixResult(result);
      setPullRequestUrl(null);
      setShowDiff(true);
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setFixLoading(false);
    }
  };

  const handleGenerateTests = async (nextCode?: string) => {
    const codeToTest = String(nextCode || effectiveCode || "");
    if (!session?.access_token || !codeToTest.trim()) return;

    setTestGenerating(true);
    setError(null);
    try {
      const result = await api.github.generateTests(session.access_token, {
        code: codeToTest,
        language: detectedLanguage,
        repoOwner: isRepoBackedAnalysis ? repoSelection.repoOwner : undefined,
        repoName: isRepoBackedAnalysis ? repoSelection.repoName : undefined,
        repoPath: isRepoBackedAnalysis ? selectedPath : undefined,
        issue: selectedIssue
          ? {
              title: selectedIssue.title,
              severity: selectedIssue.severity,
              detail: selectedIssue.description,
              startLine: selectedIssue.startLine,
              endLine: selectedIssue.endLine,
            }
          : undefined,
        analysis,
      });
      setGeneratedTests(result);
      return result;
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
      return null;
    } finally {
      setTestGenerating(false);
    }
  };

  const handleRunTests = async (
    override?: { code?: string; testCode?: string } | null
  ) => {
    const codeToRun = String(override?.code || effectiveCode || "");
    const testCode = String(override?.testCode || generatedTests?.testCode || "");
    if (!session?.access_token || !codeToRun.trim()) return null;
    if (!isRepoBackedAnalysis && !testCode.trim()) return null;

    setTestRunning(true);
    setError(null);
    try {
      const result = await api.github.runTests(session.access_token, {
        code: codeToRun,
        testCode: isRepoBackedAnalysis ? undefined : testCode,
        language: detectedLanguage,
        repoOwner: isRepoBackedAnalysis ? repoSelection.repoOwner : undefined,
        repoName: isRepoBackedAnalysis ? repoSelection.repoName : undefined,
        repoPath: isRepoBackedAnalysis ? selectedPath : undefined,
      });
      setTestResult(result);
      return result;
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
      return null;
    } finally {
      setTestRunning(false);
    }
  };

  const handleSelfHeal = async (override?: { code?: string; testCode?: string } | null) => {
    const codeToHeal = String(override?.code || effectiveCode || "");
    const testCode = String(override?.testCode || generatedTests?.testCode || "");
    if (!session?.access_token || !codeToHeal.trim()) return null;
    if (isRepoBackedAnalysis) {
      setError("Self-heal is currently limited to focused code snippets, not full repository validation.");
      return null;
    }

    setSelfHealing(true);
    setError(null);
    try {
        const status = await api.github.startSelfHeal(session.access_token, {
          code: codeToHeal,
          testCode,
          language: detectedLanguage,
        issue: selectedIssue
          ? {
              title: selectedIssue.title,
              severity: selectedIssue.severity,
              detail: selectedIssue.description,
              startLine: selectedIssue.startLine,
              endLine: selectedIssue.endLine,
            }
            : undefined,
        });

        setSelfHealJob(status);

        if (status.status === "completed" && status.result) {
          const result = status.result;
          if (result.finalFix?.updated) {
            setCode(result.finalFix.updated);
          }
          if (result.analysis) {
            setAnalysis(result.analysis);
            setIssues(buildDisplayIssues(result.analysis));
            setSelectedIssueIndex(0);
          }
          setFixResult(result.finalFix || null);
          setGeneratedTests(result.generatedTests || null);
          setTestResult(result.finalTestResult || null);
          setShowDiff(Boolean(result.finalFix));
          return result;
        }

        throw new Error(status.error || "Self-healing did not return a result.");
      } catch (err) {
        setError(toUserFacingError(err, "github-code-insight"));
        return null;
    } finally {
      setSelfHealing(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!fixResult) return;
    const patchedCode = fixResult.updated;
    setCode(patchedCode);
    setSourceLabel((current) => `${current} (patched)`);
    setFixResult(null);
    setShowDiff(false);
    setAiAnswer(null);
    setGeneratedTests(null);
    setTestResult(null);
    setSelfHealJob(null);
    setPullRequestUrl(null);

    if (!session?.access_token) return;
    setLoading(true);
    try {
      const result = await resolveQueuedAnalysis(patchedCode, "patched");
      const nextIssues = buildDisplayIssues(result);
      setAnalysis(result);
      setIssues(nextIssues);
      setSelectedIssueIndex(0);
      setFixResult(result.patch || null);
      setShowDiff(Boolean(result.patch));
      const generated = await handleGenerateTests(patchedCode);
      if (generated?.testCode || isRepoBackedAnalysis) {
        const testRun = await handleRunTests({
          code: patchedCode,
          testCode: generated?.testCode,
        });
        if (testRun?.failed && !isRepoBackedAnalysis) {
          await handleSelfHeal({ code: patchedCode, testCode: generated?.testCode });
        }
      }
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setLoading(false);
    }
  };

  const handleAskAi = async () => {
    if (!session?.access_token || !selectedIssue) return;
    setAskLoading(true);
    setError(null);
    try {
      const prompt = `Explain this code issue in simple engineering terms and suggest the safest next step.\n\nIssue: ${selectedIssue.title}\nCategory: ${selectedIssue.category}\nSeverity: ${selectedIssue.severity}\nSnippet:\n${getIssueSnippet(effectiveCode, selectedIssue)}`;
      const response = await api.ai.chat(session.access_token, prompt);
      setAiAnswer(response.answer);
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setAskLoading(false);
    }
  };

  const handleCreatePullRequest = async () => {
    if (!session?.access_token || !fixResult?.patch || !isRepoBackedAnalysis) {
      setError("Open a repository-backed file and generate a patch before creating a PR.");
      return;
    }

    setPullRequestCreating(true);
    setError(null);
    try {
      const result = await api.github.createCodePullRequest(session.access_token, {
        patch: fixResult.patch,
        repoOwner: repoSelection.repoOwner,
        repoName: repoSelection.repoName,
        baseBranch: repoStructure?.defaultBranch,
        filePath: selectedPath,
        confidence: fixResult.confidence,
        impact: analysis?.impact || selectedIssue?.impact || null,
        issue: selectedIssue
          ? {
              title: selectedIssue.title,
              severity: selectedIssue.severity,
              detail: selectedIssue.description,
            }
          : undefined,
        explanation,
      });

      const nextUrl = result.prUrl || result.pullRequest?.url || null;
      setPullRequestUrl(nextUrl);
      if (nextUrl && typeof window !== "undefined") {
        window.open(nextUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setPullRequestCreating(false);
    }
  };

  const explanation = useMemo(() => {
    if (fixResult?.explanation) return fixResult.explanation;
    if (analysis?.explanation) return analysis.explanation;
    if (!selectedIssue) {
      return {
        what: "The analyzer has not selected an issue yet.",
        why: "Pick an issue from the list to see grounded reasoning here.",
        impact: "This panel becomes the AI guidance rail for the currently focused risk.",
        fix: "Generate a fix to get a patch-ready summary.",
      };
    }
    return {
      what: selectedIssue.description,
      why: `This pattern is classified under ${selectedIssue.category} and can surface as a ${selectedIssue.impact} impact problem if it reaches production.`,
      impact:
        selectedIssue.impact === "critical"
          ? "It can break key user flows or create a production safety issue."
          : selectedIssue.impact === "high"
            ? "It is likely to cause visible failures or unstable behavior."
            : selectedIssue.impact === "medium"
              ? "It may create edge-case failures or inconsistent results."
              : "It is a lower-risk issue, but worth cleaning up before shipping.",
      fix: "Generate a fix to create a minimal patch and inspect the proposed change before applying it.",
    };
  }, [analysis?.explanation, fixResult?.explanation, selectedIssue]);

  const hasAnalysis = Boolean(analysis);
  const activeLine = selectedLine ?? selectedIssue?.startLine ?? null;
  const lineIssue = useMemo(() => {
    if (!activeLine) return null;
    return (
      issues.find(
        (issue) =>
          issue.startLine != null &&
          activeLine >= issue.startLine &&
          activeLine <= (issue.endLine || issue.startLine)
      ) || null
    );
  }, [activeLine, issues]);

  const explorerFiles = useMemo(() => {
    if (repoStructure?.keyFiles?.length) {
      return repoStructure.keyFiles.map((file) => {
        const relatedCount = issues.filter((issue) => {
          const normalized = `${issue.title} ${issue.description}`.toLowerCase();
          return normalized.includes(file.split("/").pop()?.split(".")[0]?.toLowerCase() || "");
        }).length;
        const hasCritical = issues.some((issue) => issue.severity === "high");
        return {
          path: file,
          label: file.split("/").pop() || file,
          icon: file.endsWith(".json") ? FileJson : FileCode2,
          badge: (relatedCount ? (hasCritical ? "critical" : "warning") : null) as
            | "critical"
            | "warning"
            | null,
        };
      });
    }

    return [
      {
        path: sourceLabel,
        label: sourceLabel.includes("/") ? sourceLabel.split(":").pop() || sourceLabel : sourceLabel,
        icon: FileCode2,
        badge: (issues.some((issue) => issue.severity === "high")
          ? "critical"
          : issues.length
            ? "warning"
            : null) as "critical" | "warning" | null,
      },
    ];
  }, [issues, repoStructure?.keyFiles, sourceLabel]);

  const currentFileLabel = useMemo(() => {
    const file = explorerFiles.find((entry) => entry.path === selectedPath) || explorerFiles[0];
    return file?.label || sourceLabel;
  }, [explorerFiles, selectedPath, sourceLabel]);

  const aiMode = selectedLine
    ? "line"
    : selectedIssue
      ? fixResult
        ? "post-fix"
        : "issue"
      : "chat";

  const commandItems = useMemo(() => {
    const base = [
      { id: "analyze", label: "Analyze current code", description: "Run the queued code analysis flow" },
      { id: "fix", label: "Generate fix", description: "Create a targeted patch for the selected issue" },
      {
        id: "tests",
        label: isRepoBackedAnalysis ? "Run repository checks" : "Run tests",
        description: isRepoBackedAnalysis
          ? "Execute lint, test, and build checks for the selected repository file"
          : "Execute generated tests in the terminal panel",
      },
      {
        id: "create-pr",
        label: "Create pull request",
        description: isRepoBackedAnalysis
          ? "Open a GitHub PR from the current analyzer patch"
          : "Available when a repository file is selected",
      },
      { id: "self-heal", label: "Retry with self-heal", description: "Launch the guided repair loop" },
      { id: "ask-ai", label: "Ask AI", description: "Open AI reasoning for the focused issue" },
    ];
    const fileItems = explorerFiles.map((file) => ({
      id: `file:${file.path}`,
      label: `Open ${file.label}`,
      description: file.path,
    }));
    const issueItems = issues.map((issue) => ({
      id: `issue:${issue.id}`,
      label: `Focus ${issue.title}`,
      description: issue.description,
    }));
    const all = [...base, ...fileItems, ...issueItems];
    const query = commandQuery.trim().toLowerCase();
    if (!query) return all.slice(0, 10);
    return all
      .filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query))
      .slice(0, 10);
  }, [commandQuery, explorerFiles, isRepoBackedAnalysis, issues]);

  const handleOpenExplorerFile = async (filePath: string) => {
    if (!session?.access_token) return;
    if (!selectedRepo) {
      setSelectedPath(filePath);
      return;
    }

    const { repoOwner, repoName } = repoSelection;
    if (!repoOwner || !repoName) return;

    setRepoLoading(true);
    setError(null);
    try {
      const file = await api.github.repoFile(session.access_token, {
        repoOwner,
        repoName,
        path: filePath,
      });
      setCode(file.content);
      setSelectedPath(file.path);
      setSourceLabel(`${repoOwner}/${repoName}:${file.path}`);
      setFixResult(null);
      setGeneratedTests(null);
      setTestResult(null);
      setSelfHealJob(null);
      setAiAnswer(null);
      setShowDiff(false);
      setPullRequestUrl(null);
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setRepoLoading(false);
    }
  };

  const executeCommand = async (id: string) => {
    setCommandPaletteOpen(false);
    setCommandQuery("");

    if (id === "analyze") return void handleAnalyze();
    if (id === "fix") return void handleGenerateFix();
    if (id === "tests") {
      setBottomPanelOpen(true);
      setBottomTab("tests");
      return void handleRunTests();
    }
    if (id === "create-pr") return void handleCreatePullRequest();
    if (id === "self-heal") {
      setBottomPanelOpen(true);
      setBottomTab("logs");
      return void handleSelfHeal();
    }
    if (id === "ask-ai") return void handleAskAi();
    if (id.startsWith("file:")) return void handleOpenExplorerFile(id.slice(5));
    if (id.startsWith("issue:")) {
      const issueId = id.slice(6);
      const nextIndex = issues.findIndex((issue) => issue.id === issueId);
      if (nextIndex >= 0) {
        setSelectedIssueIndex(nextIndex);
        setSelectedLine(issues[nextIndex].startLine || null);
      }
    }
  };

  return (
    <TooltipProvider delay={120}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Link
                href="/dashboard/github"
                className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to GitHub Workspace
              </Link>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Code Analysis
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Run fast static analysis, AI reasoning, and patch-ready remediation from one focused workspace.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/github/multi-file">
                <Button variant="outline">
                  <Layers3 className="h-4 w-4" />
                  Multi-File Analysis
                </Button>
              </Link>
              <Link href="/dashboard/github/graph">
                <Button variant="outline">
                  <GitBranch className="h-4 w-4" />
                  Live Dependency Graph
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {!hasAnalysis ? (
          <div className="mx-auto max-w-5xl">
            <Card className="overflow-hidden rounded-[32px] border-slate-200 shadow-sm dark:border-slate-800 dark:bg-[#111111]">
              <CardHeader className="space-y-5 border-b border-slate-200 pb-6 dark:border-slate-800">
                <div className="text-center">
                  <CardTitle className="text-2xl">Analyze Code Before It Ships</CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Paste code, upload a file, or pull a focused file from GitHub to generate issue intelligence.
                  </CardDescription>
                </div>

                <div className="mx-auto flex w-full max-w-xl flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-white/[0.03]">
                  {([
                    { key: "paste", label: "Paste Code", icon: FileCode2 },
                    { key: "upload", label: "Upload File", icon: FileUp },
                    { key: "repo", label: "GitHub Repo", icon: FolderGit2 },
                  ] as const).map((tab) => (
                    <Button
                      key={tab.key}
                      variant={inputTab === tab.key ? "default" : "ghost"}
                      className="flex-1 min-w-[140px]"
                      onClick={() => setInputTab(tab.key)}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {inputTab === "paste" ? (
                  <div className="space-y-4">
                    <textarea
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="Paste code in any common language here..."
                      className="min-h-[360px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 font-mono text-sm leading-7 text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-[#0b0b0b] dark:text-slate-100 dark:focus:border-emerald-500/30 dark:focus:bg-[#080808]"
                    />
                  </div>
                ) : null}

                {inputTab === "upload" ? (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-[#0b0b0b] dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/5"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-[#111111] dark:text-slate-200">
                        <Upload className="h-6 w-6" />
                      </span>
                      <div>
                        <p className="text-base font-medium text-slate-900 dark:text-white">
                          Upload a code file for analysis
                        </p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Works well for focused JavaScript or TypeScript files during fast reviews.
                        </p>
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.java,.go,.rb,.php,.rs,.c,.cc,.cpp,.cxx,.hpp,.cs,.swift,.kt,.kts,.scala,.sql,.html,.htm,.css,.scss,.sass,.less,.json,.yaml,.yml,.xml,.md,.sh,.bash,.zsh,.ps1,.vue,.svelte,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : null}

                {inputTab === "repo" ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Repository
                        </label>
                        <select
                          value={selectedRepo}
                          onChange={(event) => {
                            setSelectedRepo(event.target.value);
                            setSelectedPath("");
                            setRepoStructure(null);
                          }}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-[#0b0b0b] dark:text-slate-100"
                        >
                          <option value="">Select a repository</option>
                          {repos.map((repo) => (
                            <option key={repo.fullName} value={repo.fullName}>
                              {repo.fullName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          File
                        </label>
                        <select
                          value={selectedPath}
                          onChange={(event) => setSelectedPath(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-800 dark:bg-[#0b0b0b] dark:text-slate-100"
                        >
                          <option value="">Select a key file</option>
                          {repoStructure?.keyFiles.map((file) => (
                            <option key={file} value={file}>
                              {file}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-white/[0.03]">
                      {repoLoading ? (
                        <div className="grid gap-3 md:grid-cols-3">
                          <Skeleton className="h-20 rounded-2xl" />
                          <Skeleton className="h-20 rounded-2xl" />
                          <Skeleton className="h-20 rounded-2xl" />
                        </div>
                      ) : repoStructure ? (
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0b0b0b]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              Default branch
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                              {repoStructure.defaultBranch}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0b0b0b]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              Tech stack
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                              {repoStructure.techStack.join(", ") || "Not detected yet"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0b0b0b]">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                              Indexed files
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                              {repoStructure.fileCount}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Connect GitHub and choose a repository to load key files into the analyzer.
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleLoadRepoFile}
                      disabled={!selectedRepo || !selectedPath || repoLoading}
                    >
                      {repoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderGit2 className="h-4 w-4" />}
                      Load Repository File
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-white/[0.03]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{detectedLanguage}</Badge>
                    <Badge variant="outline">{lineCount} lines</Badge>
                    <Badge variant="outline">{sourceLabel}</Badge>
                    {repoStatus?.connected ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        GitHub connected
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleLoadSample}>
                      <Sparkles className="h-4 w-4" />
                      Load Sample
                    </Button>
                    <Button onClick={handleAnalyze} disabled={loading || !code.trim()}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                      Analyze Code
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 px-5 py-5 dark:border-slate-800 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {LOADING_STEPS[loadingStepIndex]}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Building an explainable risk profile with static checks and AI reasoning.
                          {analysisJob?.id ? ` Job ${analysisJob.id.slice(-8)} is ${analysisJob.status}.` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <CodeAnalysisWorkspace
              explorerFiles={explorerFiles}
              selectedPath={selectedPath}
              currentFileLabel={currentFileLabel}
              selectedIssue={selectedIssue}
              selectedIssueIndex={selectedIssueIndex}
              issues={issues}
              detectedLanguage={detectedLanguage}
              lineCount={lineCount}
              sourceLabel={sourceLabel}
              showDiff={showDiff}
              setShowDiff={setShowDiff}
              fixResult={fixResult}
              codeLines={codeLines}
              diffLines={diffLines}
              activeLine={activeLine}
              aiMode={aiMode}
              lineIssue={lineIssue}
              explanation={explanation}
              aiAnswer={aiAnswer}
              loading={loading}
              loadingStep={LOADING_STEPS[loadingStepIndex]}
              codeViewerRef={codeViewerRef}
              commandPaletteOpen={commandPaletteOpen}
              setCommandPaletteOpen={setCommandPaletteOpen}
              commandQuery={commandQuery}
              setCommandQuery={setCommandQuery}
              commandItems={commandItems}
              executeCommand={executeCommand}
              bottomPanelOpen={bottomPanelOpen}
              setBottomPanelOpen={setBottomPanelOpen}
              bottomTab={bottomTab}
              setBottomTab={setBottomTab}
              generatedTests={generatedTests}
              testResult={testResult}
              selfHealJob={selfHealJob}
              selfHealing={selfHealing}
              testGenerating={testGenerating}
              testRunning={testRunning}
              fixLoading={fixLoading}
              pullRequestCreating={pullRequestCreating}
              pullRequestUrl={pullRequestUrl}
              askLoading={askLoading}
              error={error}
              analysisJobStatus={analysisJob?.status}
              repoChecksMode={isRepoBackedAnalysis}
              onOpenExplorerFile={handleOpenExplorerFile}
              onSelectIssue={(index) => {
                setSelectedIssueIndex(index);
                setSelectedLine(issues[index]?.startLine || null);
              }}
              onSelectLine={(line, issueId) => {
                setSelectedLine(line);
                if (issueId) {
                  const nextIndex = issues.findIndex((issue) => issue.id === issueId);
                  if (nextIndex >= 0) {
                    setSelectedIssueIndex(nextIndex);
                  }
                }
              }}
              onGenerateFix={handleGenerateFix}
              onApplyPatch={handleApplyPatch}
              onCreatePullRequest={handleCreatePullRequest}
              onGenerateTests={() => {
                setBottomPanelOpen(true);
                setBottomTab("tests");
                return handleGenerateTests();
              }}
              onRunTests={() => {
                setBottomPanelOpen(true);
                setBottomTab("terminal");
                return handleRunTests();
              }}
              onSelfHeal={() => {
                setBottomPanelOpen(true);
                setBottomTab("logs");
                return handleSelfHeal();
              }}
              onAskAi={handleAskAi}
              highlightInlineCode={highlightInlineCode}
            />
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
