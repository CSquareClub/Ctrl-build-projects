"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers3, Loader2, Radar, Sparkles } from "lucide-react";
import DependencyIssueGraph from "@/components/DependencyIssueGraph";
import GraphGuidePanel from "@/components/GraphGuidePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type GitHubConnectionStatus, type Issue, type IssueGraphData, type IssueGraphNode, type IssueGraphQueryResponse, type IssueGraphResponse } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { writeStoredBoolean } from "@/lib/useStoredBoolean";

type GraphFilters = { onlyIssues: boolean; onlyDependencies: boolean; onlyAffected: boolean };
type AnalyzerIssue = { id: string; title: string; description: string; severity: "low" | "medium" | "high"; impact: "low" | "medium" | "high" | "critical"; confidence: number; category: string; source: string; startLine: number | null; endLine: number | null };
type AnalyzerGraphContext = {
  savedAt: string;
  repository: { owner: string; name: string; defaultBranch: string };
  selectedPath: string;
  currentFileLabel: string;
  code: string;
  issues: AnalyzerIssue[];
  analysis: { risk_score: number; confidence: number; explanation?: { what: string; why: string; impact: string; fix: string } | null; impact?: string | null };
  repoStructure: { defaultBranch: string; keyFiles: string[]; techStack: string[]; fileCount: number } | null;
};
type AnalyzerFile = { path: string; filePurpose: string; imports: string[]; relatedIssues: string[]; confidence: number; snippet: string };

const ANALYZER_GRAPH_CONTEXT_KEY = "agenticpulse-code-analysis-graph";
const DEFAULT_FILTERS: GraphFilters = { onlyIssues: false, onlyDependencies: false, onlyAffected: false };
const ISSUE_PROMPTS = ["What is the root cause?", "Show the impact path", "Highlight the critical path", "Which files are most connected?"];
const ANALYZER_PROMPTS = ["What is the likely root cause in this repo file?", "Which files are affected by this code risk?", "Show the dependency path from the selected file", "Where should I fix this first?"];

function normalizePath(value: string) { return String(value || "").replace(/\\/g, "/").toLowerCase(); }
function basename(filePath: string) { return normalizePath(filePath).split("/").pop() || filePath; }
function detectIntent(question: string) {
  const q = String(question || "").toLowerCase();
  if (/root cause|origin|why/.test(q)) return "root_cause";
  if (/impact|affected|blast radius|break/.test(q)) return "impact";
  if (/critical path|path|flow/.test(q)) return "critical_path";
  if (/depend|import|connected|linked/.test(q)) return "dependencies";
  return "overview";
}
function collectNeighbors(graph: IssueGraphData | null, nodeId: string) {
  if (!graph) return { nodeIds: [nodeId], edgeIds: [] };
  const edgeIds = graph.edges.filter((e) => String(e.source) === nodeId || String(e.target) === nodeId).map((e) => e.id);
  const nodeIds = new Set<string>([nodeId]);
  graph.edges.forEach((e) => { if (edgeIds.includes(e.id)) { nodeIds.add(String(e.source)); nodeIds.add(String(e.target)); } });
  return { nodeIds: [...nodeIds], edgeIds };
}
function extractImports(filePath: string, content: string) {
  const imports = new Set<string>();
  const regexes = [/import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g, /require\(\s*['"]([^'"]+)['"]\s*\)/g, /from\s+([A-Za-z0-9_./-]+)\s+import/g, /import\s+([A-Za-z0-9_./-]+)/g];
  for (const regex of regexes) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(String(content || ""))) !== null) {
      const value = String(match[1] || "").trim();
      if (value && !value.startsWith("@") && !value.startsWith("http")) imports.add(value);
    }
  }
  if (normalizePath(filePath).endsWith(".go")) {
    for (const match of String(content || "").matchAll(/"([^"]+)"/g)) {
      const value = String(match[1] || "").trim();
      if (value.includes("/") || value.startsWith(".")) imports.add(value);
    }
  }
  return [...imports];
}
function matchImportTarget(importValue: string, paths: string[]) {
  const needle = normalizePath(importValue).replace(/^\.\//, "").replace(/\.[^.]+$/, "");
  return paths.find((candidate) => {
    const normalized = normalizePath(candidate);
    const base = basename(candidate).replace(/\.[^.]+$/, "");
    return normalized.includes(needle) || needle.includes(base) || base === needle.split("/").pop();
  }) || null;
}
function buildAnalyzerGraphData(context: AnalyzerGraphContext, files: AnalyzerFile[]): IssueGraphData {
  const nodes: IssueGraphData["nodes"] = [];
  const edges: IssueGraphData["edges"] = [];
  const seen = new Set<string>();
  const rootNodeId = `file:${context.selectedPath}`;
  context.issues.slice(0, 6).forEach((issue, index) => {
    const id = `issue:${issue.id || `${issue.title}-${index}`}`;
    nodes.push({ id, label: issue.title, type: "issue", status: issue.severity === "high" ? "issue" : issue.impact === "medium" ? "affected" : "active", severity: issue.severity, affected: true, data: issue });
  });
  files.forEach((file) => nodes.push({ id: `file:${file.path}`, label: basename(file.path), path: file.path, type: "file", status: file.path === context.selectedPath ? "active" : file.relatedIssues.length ? "affected" : "normal", rootCause: file.path === context.selectedPath, affected: file.relatedIssues.length > 0, confidence: file.confidence, data: file }));
  context.issues.slice(0, 6).forEach((issue, index) => {
    const issueId = `issue:${issue.id || `${issue.title}-${index}`}`;
    const linked = files.filter((file) => file.path === context.selectedPath || file.relatedIssues.includes(issue.title));
    (linked.length ? linked : files.slice(0, 1)).forEach((file) => {
      const edgeId = `issue-link:${issueId}:${file.path}`;
      if (seen.has(edgeId)) return;
      edges.push({ id: edgeId, source: issueId, target: `file:${file.path}`, type: file.path === context.selectedPath ? "root-cause" : "issue-flow", active: file.path === context.selectedPath, label: file.path === context.selectedPath ? "root cause" : "related" });
      seen.add(edgeId);
    });
  });
  const paths = files.map((file) => file.path);
  files.forEach((file) => file.imports.forEach((entry) => {
    const target = matchImportTarget(entry, paths);
    if (!target || target === file.path) return;
    const edgeId = `import:${file.path}:${target}`;
    if (seen.has(edgeId)) return;
    edges.push({ id: edgeId, source: `file:${file.path}`, target: `file:${target}`, type: "import", active: false, label: "imports" });
    seen.add(edgeId);
  }));
  return { nodes, edges, meta: { rootNodeId, issueNodeId: nodes.find((n) => n.type === "issue")?.id || rootNodeId, fileCount: files.length, edgeCount: edges.length } };
}
function buildAnalyzerQueryResult(question: string, context: AnalyzerGraphContext, graph: IssueGraphData): IssueGraphQueryResponse {
  const intent = detectIntent(question);
  const rootNodeId = graph.meta.rootNodeId;
  const issueNodeId = graph.meta.issueNodeId;
  const affected = graph.nodes.filter((n) => n.affected).map((n) => n.id);
  const importEdges = graph.edges.filter((e) => e.type === "import").map((e) => e.id);
  const flowEdges = graph.edges.filter((e) => e.type === "root-cause" || e.type === "issue-flow").map((e) => e.id);
  const focus = intent === "dependencies"
    ? { nodeIds: graph.nodes.filter((n) => n.type === "file").map((n) => n.id), edgeIds: importEdges }
    : intent === "impact" || intent === "critical_path"
      ? { nodeIds: [issueNodeId, rootNodeId, ...affected].filter(Boolean), edgeIds: flowEdges }
      : intent === "root_cause"
        ? { nodeIds: [issueNodeId, rootNodeId].filter(Boolean), edgeIds: flowEdges }
        : { nodeIds: graph.nodes.map((n) => n.id), edgeIds: graph.edges.map((e) => e.id) };
  const explanation = intent === "dependencies"
    ? "The highlighted links show import relationships in the repo slice loaded from Code Analysis."
    : intent === "impact"
      ? `The likely blast radius starts at ${basename(context.selectedPath)} and spreads through the affected file nodes.`
      : intent === "critical_path"
        ? `The critical path runs from the issue nodes into ${basename(context.selectedPath)} and then across the highlighted related files.`
        : intent === "root_cause"
          ? `${basename(context.selectedPath)} is the current root-cause file based on the live analyzer context.`
          : "This live graph stays aligned with the repo file and risks from your current Code Analysis run.";
  return { intent, explanation, reasoning: [context.analysis.explanation?.what || "Analyzer detected the strongest risk in the selected file.", context.analysis.explanation?.why || "The selected file anchors the current graph.", `Graph built from ${graph.meta.fileCount} file nodes and ${context.issues.length} issue signals.`], focus, graphAction: { mode: intent === "dependencies" ? "dependencies" : intent === "critical_path" || intent === "root_cause" ? "path" : "focus", zoomNodeId: rootNodeId, animatePath: intent === "impact" || intent === "critical_path" || intent === "root_cause" } };
}

export default function DependencyIssueGraphPage() {
  const { session } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [graphResponse, setGraphResponse] = useState<IssueGraphResponse | null>(null);
  const [analyzerContext, setAnalyzerContext] = useState<AnalyzerGraphContext | null>(null);
  const [analyzerGraph, setAnalyzerGraph] = useState<IssueGraphData | null>(null);
  const [analyzerFiles, setAnalyzerFiles] = useState<AnalyzerFile[]>([]);
  const [mode, setMode] = useState<"issue" | "analyzer">("issue");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [graphFocus, setGraphFocus] = useState<{ nodeIds: string[]; edgeIds: string[] }>({ nodeIds: [], edgeIds: [] });
  const [queryInput, setQueryInput] = useState("");
  const [queryResult, setQueryResult] = useState<IssueGraphQueryResponse | null>(null);
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [rootCauseMode, setRootCauseMode] = useState(false);
  const [focusVersion, setFocusVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { writeStoredBoolean("product-pulse-sidebar-expanded", false); }, []);

  useEffect(() => {
    if (!session?.access_token) { setLoading(false); return; }
    let cancelled = false;
    void (async () => {
      try {
        const [issueList, status] = await Promise.all([api.issues.list(session.access_token), api.github.status(session.access_token).catch(() => null)]);
        if (cancelled) return;
        setIssues(issueList);
        setGithubStatus(status);
        setSelectedIssueId((current) => current || issueList[0]?.id || null);
        if (typeof window !== "undefined") {
          const raw = window.sessionStorage.getItem(ANALYZER_GRAPH_CONTEXT_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as AnalyzerGraphContext;
            if (parsed?.repository?.owner && parsed?.repository?.name && parsed?.selectedPath) { setAnalyzerContext(parsed); setMode("analyzer"); }
          }
        }
      } catch (err) {
        if (!cancelled) setError(toUserFacingError(err, "github-code-insight"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);

  async function loadIssueGraph(issueId: string) {
    if (!session?.access_token) return;
    setGraphLoading(true); setError(null);
    try {
      const response = await api.codeAgent.graph(session.access_token, issueId);
      setGraphResponse(response);
      setSelectedNodeId(response.graph.meta.rootNodeId || response.graph.meta.issueNodeId);
      setGraphFocus({ nodeIds: [response.graph.meta.issueNodeId, response.graph.meta.rootNodeId].filter(Boolean), edgeIds: response.graph.edges.filter((edge) => edge.active).map((edge) => edge.id) });
      setFocusVersion((v) => v + 1); setQueryResult(null);
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight")); setGraphResponse(null);
    } finally { setGraphLoading(false); }
  }

  async function loadAnalyzerGraph(context: AnalyzerGraphContext) {
    if (!session?.access_token) return;
    setGraphLoading(true); setError(null);
    try {
      const candidatePaths = Array.from(new Set([context.selectedPath, ...(context.repoStructure?.keyFiles || [])])).slice(0, 7);
      const files = await Promise.all(candidatePaths.map(async (filePath) => {
        const file = await api.github.repoFile(session.access_token!, { repoOwner: context.repository.owner, repoName: context.repository.name, path: filePath, ref: context.repository.defaultBranch });
        const relatedIssues = context.issues.filter((issue) => {
          const bag = `${issue.title} ${issue.description}`.toLowerCase();
          const base = basename(file.path).replace(/\.[^.]+$/, "");
          return file.path === context.selectedPath || bag.includes(base.toLowerCase());
        }).map((issue) => issue.title);
        return { path: file.path, filePurpose: file.path === context.selectedPath ? "Selected code analysis file" : "Related repository file", imports: extractImports(file.path, file.content), relatedIssues, confidence: file.path === context.selectedPath ? context.analysis.confidence : 0.64, snippet: file.content.split("\n").slice(0, 18).join("\n") } satisfies AnalyzerFile;
      }));
      const graph = buildAnalyzerGraphData(context, files);
      setAnalyzerFiles(files); setAnalyzerGraph(graph);
      setSelectedNodeId(graph.meta.rootNodeId || graph.meta.issueNodeId);
      setGraphFocus({ nodeIds: [graph.meta.issueNodeId, graph.meta.rootNodeId].filter(Boolean), edgeIds: graph.edges.filter((edge) => edge.active).map((edge) => edge.id) });
      setFocusVersion((v) => v + 1); setQueryResult(null);
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight")); setAnalyzerGraph(null); setAnalyzerFiles([]);
    } finally { setGraphLoading(false); }
  }

  useEffect(() => {
    if (!session?.access_token) return;
    if (mode === "analyzer" && analyzerContext) { void loadAnalyzerGraph(analyzerContext); return; }
    if (mode === "issue" && selectedIssueId && githubStatus?.connected) void loadIssueGraph(selectedIssueId);
  }, [analyzerContext, githubStatus?.connected, mode, selectedIssueId, session?.access_token]);

  const graph = mode === "analyzer" ? analyzerGraph : graphResponse?.graph || null;
  const selectedIssue = useMemo(() => issues.find((issue) => issue.id === selectedIssueId) || null, [issues, selectedIssueId]);
  const selectedNode = useMemo(() => graph?.nodes.find((node) => node.id === selectedNodeId) || null, [graph?.nodes, selectedNodeId]);
  const detailNode = useMemo(() => selectedNode || (hoveredNodeId ? graph?.nodes.find((node) => node.id === hoveredNodeId) || null : graph?.nodes[0] || null), [graph?.nodes, hoveredNodeId, selectedNode]);
  const detailFile = useMemo(() => detailNode ? (mode === "analyzer" ? analyzerFiles.find((file) => `file:${file.path}` === detailNode.id) || null : graphResponse?.analysis?.files.find((file) => `file:${file.path}` === detailNode.id) || null) : null, [analyzerFiles, detailNode, graphResponse?.analysis?.files, mode]);
  const highlightedNodeIds = useMemo(() => { const merged = new Set<string>(graphFocus.nodeIds); if (selectedNodeId) merged.add(selectedNodeId); if (hoveredNodeId) merged.add(hoveredNodeId); return [...merged]; }, [graphFocus.nodeIds, hoveredNodeId, selectedNodeId]);
  const repositoryLabel = mode === "analyzer" ? (analyzerContext ? `${analyzerContext.repository.owner}/${analyzerContext.repository.name}` : "Repository not selected") : graphResponse?.analysis ? `${graphResponse.analysis.repository.owner}/${graphResponse.analysis.repository.name}` : "Repository not selected";
  const graphSummary = mode === "analyzer" ? analyzerContext?.analysis : graphResponse?.analysis || null;

  const handleNodeClick = (node: IssueGraphNode) => { setSelectedNodeId(node.id); setGraphFocus(collectNeighbors(graph, node.id)); setFocusVersion((v) => v + 1); };
  const handleGraphQuery = async (question: string) => {
    if (!question.trim()) return;
    setQueryLoading(true); setQueryInput(question);
    try {
      if (mode === "analyzer" && analyzerContext && graph) {
        const response = buildAnalyzerQueryResult(question, analyzerContext, graph);
        setQueryResult(response); setGraphFocus(response.focus); setSelectedNodeId(response.graphAction.zoomNodeId || response.focus.nodeIds[0] || null); setRootCauseMode(response.graphAction.animatePath); setFocusVersion((v) => v + 1);
      } else if (session?.access_token && selectedIssueId) {
        const response = await api.codeAgent.queryGraph(session.access_token, selectedIssueId, { question });
        setQueryResult(response); setGraphFocus(response.focus); setSelectedNodeId(response.graphAction?.zoomNodeId || response.focus.nodeIds[0] || null); setRootCauseMode(Boolean(response.graphAction?.animatePath)); setFocusVersion((v) => v + 1);
      }
    } catch (err) { setError(toUserFacingError(err, "github-code-insight")); }
    finally { setQueryLoading(false); }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"><Radar className="h-4 w-4" />Dependency Graph</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Follow file relationships and issue propagation in real time</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">This page now works with the live Code Analysis context, so the graph reflects the repo file and risks you just analyzed instead of feeling disconnected.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/github"><Button variant="outline">Back to GitHub Workspace</Button></Link>
          <Link href="/dashboard/github/code-analysis"><Button variant="outline"><Sparkles className="h-4 w-4" />Back to Code Analysis</Button></Link>
          <Link href="/dashboard/github/multi-file"><Button variant="outline"><Layers3 className="h-4 w-4" />Open Multi-File Analysis</Button></Link>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</div> : null}

      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-transparent">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4"><Skeleton className="h-16 w-full rounded-2xl bg-slate-100 dark:bg-slate-800" /><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><Skeleton className="h-[720px] rounded-[28px] bg-slate-100 dark:bg-slate-800" /><Skeleton className="h-[720px] rounded-[28px] bg-slate-100 dark:bg-slate-800" /></div></div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-4">
                <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-white/[0.03]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap gap-2">
                        <Button variant={mode === "analyzer" ? "default" : "outline"} size="sm" onClick={() => analyzerContext && setMode("analyzer")} disabled={!analyzerContext}>Live Analyzer Graph</Button>
                        <Button variant={mode === "issue" ? "default" : "outline"} size="sm" onClick={() => setMode("issue")}>Issue Graph</Button>
                      </div>
                      {mode === "issue" ? (
                        <select value={selectedIssueId || ""} onChange={(e) => setSelectedIssueId(e.target.value)} className="h-11 min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-transparent dark:text-slate-100">
                          {issues.map((issue) => <option key={issue.id} value={issue.id}>{issue.title}</option>)}
                        </select>
                      ) : (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">Live from Code Analysis: {analyzerContext?.currentFileLabel || analyzerContext?.selectedPath}</div>
                      )}
                      <Button onClick={() => mode === "analyzer" ? analyzerContext && void loadAnalyzerGraph(analyzerContext) : selectedIssueId && void loadIssueGraph(selectedIssueId)} disabled={graphLoading || (mode === "analyzer" ? !analyzerContext : !selectedIssueId || !githubStatus?.connected)}>{graphLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Refresh Graph</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant={filters.onlyIssues ? "default" : "outline"} size="sm" onClick={() => setFilters((v) => ({ ...v, onlyIssues: !v.onlyIssues }))}>Issues</Button>
                      <Button variant={filters.onlyDependencies ? "default" : "outline"} size="sm" onClick={() => setFilters((v) => ({ ...v, onlyDependencies: !v.onlyDependencies }))}>Dependencies</Button>
                      <Button variant={filters.onlyAffected ? "default" : "outline"} size="sm" onClick={() => setFilters((v) => ({ ...v, onlyAffected: !v.onlyAffected }))}>Affected</Button>
                      <Button variant={rootCauseMode ? "default" : "outline"} size="sm" onClick={() => setRootCauseMode((v) => !v)}>Root Cause Mode</Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Badge variant="outline">{repositoryLabel}</Badge>
                    <Badge variant="outline">{graph?.meta.fileCount || 0} files</Badge>
                    <Badge variant="outline">{graph?.meta.edgeCount || 0} edges</Badge>
                    {mode === "issue" && selectedIssue ? <Badge variant="outline">{selectedIssue.priority}</Badge> : null}
                    {mode === "analyzer" ? <Badge variant="outline">Realtime from analyzer</Badge> : null}
                  </div>
                </div>

                <DependencyIssueGraph graph={graph} selectedNodeId={selectedNodeId} highlightedNodeIds={highlightedNodeIds} highlightedEdgeIds={graphFocus.edgeIds} focusVersion={focusVersion} filters={filters} rootCauseMode={rootCauseMode} onNodeClick={handleNodeClick} onNodeHover={(node) => setHoveredNodeId(node?.id || null)} />

                <div className="grid gap-3 md:grid-cols-5">
                  {[{ label: "Normal", color: "bg-slate-400" }, { label: "Active", color: "bg-blue-500" }, { label: "Issue", color: "bg-red-500" }, { label: "Affected", color: "bg-yellow-400" }, { label: "Resolved", color: "bg-emerald-500" }].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300"><div className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />{item.label}</div></div>)}
                </div>
              </div>

              <div className="space-y-4">
                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-transparent">
                  <CardHeader><CardTitle>Node Detail</CardTitle><CardDescription>Click a node to inspect the connected file, issue role, and suggested fix path.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {detailNode ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-900 dark:text-white">{detailNode.label}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detailNode.type === "file" ? detailNode.path : "Issue node"}</p></div><Badge variant="outline">{detailNode.status}</Badge></div></div>
                        {detailFile ? (
                          <>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Role</p><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{"relatedIssues" in detailFile ? detailFile.filePurpose : detailFile.finding?.rootCauseRole || detailFile.filePurpose}</p></div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Suggested Fix</p><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{"relatedIssues" in detailFile ? (detailFile.relatedIssues.length ? `This file is linked to: ${detailFile.relatedIssues.join(", ")}. Start with the selected file, then trace the highlighted imports.` : "This file is connected through the current repo slice and may matter if the root fix expands.") : detailFile.finding?.reason}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">Confidence {Math.round((("confidence" in detailFile ? detailFile.confidence : detailFile.finding?.confidence) || 0) * 100)}%</Badge></div></div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Preview</p><pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-900 px-4 py-4 font-mono text-xs leading-6 text-slate-100">{(detailFile as { snippet?: string } | null)?.snippet || ""}</pre></div>
                          </>
                        ) : <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-300">{mode === "analyzer" ? analyzerContext?.analysis.explanation?.why || "The graph is focused on the currently selected analyzer file." : graphResponse?.analysis?.rootCause}</div>}
                      </>
                    ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400">Run a graph analysis to inspect the selected node.</div>}
                  </CardContent>
                </Card>

                <GraphGuidePanel prompts={mode === "analyzer" ? ANALYZER_PROMPTS : graphResponse?.suggestedPrompts?.length ? graphResponse.suggestedPrompts : ISSUE_PROMPTS} queryInput={queryInput} queryLoading={queryLoading} queryResult={queryResult} onInputChange={setQueryInput} onPromptClick={(prompt) => void handleGraphQuery(prompt)} onSubmit={() => void handleGraphQuery(queryInput)} />

                <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-transparent">
                  <CardHeader><CardTitle>Graph Summary</CardTitle><CardDescription>{mode === "analyzer" ? "Live summary from the same Code Analysis state you just ran." : "Cross-file context from the same reasoning pipeline used for multi-file fixes."}</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                    {graphSummary ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Root Cause</p><p className="mt-2 text-sm leading-6 text-slate-900 dark:text-white">{"rootCause" in graphSummary ? graphSummary.rootCause : graphSummary.explanation?.what || "The analyzer is using the selected file as the current root."}</p></div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-white/[0.03]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Flow Summary</p><p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{"flowSummary" in graphSummary ? graphSummary.flowSummary : graphSummary.explanation?.why || "The highlighted path shows how this risk connects to nearby repository files."}</p></div>
                        <div className="flex flex-wrap gap-2"><Badge variant="outline">Confidence {Math.round((graphSummary.confidence || 0) * 100)}%</Badge>{mode === "analyzer" ? <Badge variant="outline">Analyzer linked</Badge> : "meta" in graphSummary && graphSummary.meta.llmFallback ? <Badge variant="secondary">Fallback reasoning</Badge> : <Badge variant="outline">Groq enhanced</Badge>}</div>
                      </>
                    ) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400">No graph summary yet.</div>}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
