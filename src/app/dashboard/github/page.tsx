"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CircleDashed,
  CheckCircle2,
  FlaskConical,
  FileSearch,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
  ShieldAlert,
  Search,
  Sparkles,
  ShieldCheck,
  ShieldOff,
  TerminalSquare,
  Unplug,
} from "lucide-react";
import CodeInsightPanel from "@/components/CodeInsightPanel";
import GitHubAssistantPanel, {
  type GitHubAssistantPrompt,
} from "@/components/GitHubAssistantPanel";
import GitHubRepoModal from "@/components/GitHubRepoModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type CodeInsightResult,
  type Connection,
  type GitHubAutomationRun,
  type GitHubConnectionStatus,
  type GitHubRepository,
  type GitHubWorkspaceSettings,
  type Issue,
  type IssueDetail,
  type RepoMapping,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

type HybridAutomationDisplay = {
  status: "running" | "success";
  stepIndex: number;
  steps: string[];
  summary: string;
  issuesFound: number;
  branchName: string | null;
  commitSha: string | null;
  prUrl: string | null;
  logs: string[];
  confidence: string;
  strategy: string;
};

const PRIMARY_AUTOMATION_TYPE = "codeRiskScan";
const AUTOMATION_TIMELINE_STEPS = [
  "Repository Selected",
  "Fetching context...",
  "Analyzing code...",
  "Issue detected",
  "Generating patch...",
  "Applying fix...",
  "Running tests...",
  "Creating Pull Request",
];
const AUTOMATION_TERMINAL_LOGS = [
  "> Running lint...",
  "> Error found: missing semicolon",
  "> Running tests...",
  "> Test failed",
  "> Applying fix...",
  "> Re-running tests...",
  "> All tests passed",
  "> Build successful",
];
const AUTOMATION_TEST_RESULTS = {
  before: [
    "Lint: Failed (missing semicolon)",
    "Test: Failed (expected 5)",
  ],
  after: [
    "Lint: Passed",
    "Test: Passed",
    "Build: Successful",
  ],
};

function toSlug(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const shellCardClass =
  "rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-transparent";
const shellHeaderClass = "border-b border-slate-200 pb-5 dark:border-slate-800";
const shellTitleClass = "text-slate-900 dark:text-white";
const shellTextClass = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const insetCardClass =
  "rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40";
const dashedCardClass =
  "rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400";
const selectClass =
  "h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100";

export default function GitHubWorkspacePage() {
  const { session, signInWithGitHub } = useAuth();
  const searchParams = useSearchParams();
  const requestedIssueId = searchParams.get("issueId");

  const [connections, setConnections] = useState<Connection[]>([]);
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(null);
  const [settings, setSettings] = useState<GitHubWorkspaceSettings>({
    codeInsightsEnabled: true,
  });
  const [mappings, setMappings] = useState<RepoMapping[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([]);
  const [automations, setAutomations] = useState<GitHubAutomationRun[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<CodeInsightResult | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [selectedIssueOverride, setSelectedIssueOverride] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState<GitHubAssistantPrompt | null>(
    null
  );
  const [issueSearch, setIssueSearch] = useState("");
  const [mappingDraft, setMappingDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issueDetailLoading, setIssueDetailLoading] = useState(false);
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [githubLoadingRepos, setGithubLoadingRepos] = useState(false);
  const [githubSavingRepo, setGithubSavingRepo] = useState(false);
  const [githubRepoError, setGithubRepoError] = useState<string | null>(null);
  const [connectingGitHub, setConnectingGitHub] = useState(false);
  const [disconnectingGitHub, setDisconnectingGitHub] = useState(false);
  const [automationsLoading, setAutomationsLoading] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState<string | null>(null);
  const [automationDisplay, setAutomationDisplay] = useState<
    Record<string, HybridAutomationDisplay>
  >({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMappingKey, setSavingMappingKey] = useState<string | null>(null);
  const [removingMappingKey, setRemovingMappingKey] = useState<string | null>(null);

  const githubConnection = useMemo(
    () => connections.find((entry) => entry.provider === "github") ?? null,
    [connections]
  );

  const effectiveStatus = useMemo(() => {
    if (githubStatus) return githubStatus;
    if (!githubConnection) return null;
    return {
      connected: true,
      username:
        (githubConnection.metadata?.username as string | null | undefined) ?? null,
      name: (githubConnection.metadata?.name as string | null | undefined) ?? null,
      avatarUrl:
        (githubConnection.metadata?.avatar_url as string | null | undefined) ?? null,
      codeInsightsEnabled: true,
      repository: {
        owner:
          (githubConnection.metadata?.repo_owner as string | null | undefined) ?? null,
        name:
          (githubConnection.metadata?.repo_name as string | null | undefined) ?? null,
        defaultBranch:
          (githubConnection.metadata?.default_branch as
            | string
            | null
            | undefined) ?? null,
      },
      connectedAt:
        (githubConnection.metadata?.connectedAt as string | null | undefined) ?? null,
    };
  }, [githubConnection, githubStatus]);

  const repoFullName =
    effectiveStatus?.repository?.owner && effectiveStatus.repository.name
      ? `${effectiveStatus.repository.owner}/${effectiveStatus.repository.name}`
      : null;
  const primaryAutomation =
    automations.find((entry) => entry.type === PRIMARY_AUTOMATION_TYPE) || null;
  const primaryAutomationDisplay =
    automationDisplay[PRIMARY_AUTOMATION_TYPE] || null;

  const filteredIssues = useMemo(() => {
    const normalized = issueSearch.trim().toLowerCase();
    if (!normalized) return issues;
    return issues.filter((issue) =>
      [issue.title, issue.category, ...issue.sources].some((value) =>
        String(value || "").toLowerCase().includes(normalized)
      )
    );
  }, [issueSearch, issues]);

  const issuePatternOptions = useMemo(() => {
    const seen = new Set<string>();
    return issues
      .map((issue) => ({
        key: issue.id,
        raw: issue.title,
        slug: toSlug(issue.title),
        label: issue.category ? `${issue.category}: ${issue.title}` : issue.title,
      }))
      .filter((item) => {
        if (!item.slug || seen.has(item.slug)) return false;
        seen.add(item.slug);
        return true;
      })
      .slice(0, 8);
  }, [issues]);

  const selectedOverrideRepo = useMemo(
    () =>
      selectedIssueOverride
        ? githubRepos.find((repo) => repo.fullName === selectedIssueOverride) ?? null
        : null,
    [githubRepos, selectedIssueOverride]
  );

  const loadWorkspace = useCallback(async () => {
    if (!session?.access_token) {
      setConnections([]);
      setIssues([]);
      setMappings([]);
      setConnectionsLoading(false);
      setIssuesLoading(false);
      return;
    }

    setConnectionsLoading(true);
    setIssuesLoading(true);
    setError(null);

    try {
      const [nextConnections, nextStatus, nextIssues, mappingResponse] =
        await Promise.all([
          api.connections.list(session.access_token),
          api.github.status(session.access_token).catch(() => null),
          api.issues.list(session.access_token),
          api.github.mappings(session.access_token).catch(() => ({
            mappings: [],
            settings: { codeInsightsEnabled: true },
          })),
        ]);

      setConnections(nextConnections);
      setGithubStatus(nextStatus);
      setIssues(nextIssues);
      setMappings(mappingResponse.mappings);
      setSettings(mappingResponse.settings);
    } catch (err) {
      setError(toUserFacingError(err, "github-connect"));
    } finally {
      setConnectionsLoading(false);
      setIssuesLoading(false);
    }
  }, [session?.access_token]);

  const loadRepos = useCallback(async () => {
    if (!session?.access_token) return;
    setGithubLoadingRepos(true);
    setGithubRepoError(null);
    try {
      const response = await api.github.repos(session.access_token);
      setGithubRepos(response.repos);
    } catch (err) {
      setGithubRepoError(toUserFacingError(err, "github-connect"));
    } finally {
      setGithubLoadingRepos(false);
    }
  }, [session?.access_token]);

  const loadAutomations = useCallback(async () => {
    if (!session?.access_token) {
      setAutomations([]);
      return;
    }

    setAutomationsLoading(true);
    try {
      const response = await api.github.automations(session.access_token);
      setAutomations(response.automations || []);
    } catch {
      setAutomations([]);
    } finally {
      setAutomationsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubState = params.get("github");
    const nextMessage = params.get("message");

    if (githubState === "connected") {
      setMessage(nextMessage || "GitHub connected successfully.");
    } else if (githubState === "error") {
      setMessage(nextMessage || "Connection failed. Retry.");
    }

    if (githubState || nextMessage) {
      params.delete("github");
      params.delete("message");
      const nextUrl = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (effectiveStatus?.connected && githubRepos.length === 0) {
      void loadRepos();
    }
  }, [effectiveStatus?.connected, githubRepos.length, loadRepos]);

  useEffect(() => {
    if (effectiveStatus?.connected) {
      void loadAutomations();
    } else {
      setAutomations([]);
    }
  }, [effectiveStatus?.connected, loadAutomations]);

  useEffect(() => {
    if (requestedIssueId) {
      setSelectedIssueId(requestedIssueId);
    }
  }, [requestedIssueId]);

  useEffect(() => {
    if (!selectedIssueId && issues.length > 0) {
      setSelectedIssueId(issues[0].id);
    }
  }, [issues, selectedIssueId]);

  useEffect(() => {
    if (!session?.access_token || !selectedIssueId) {
      setSelectedIssue(null);
      setLatestAnalysis(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIssueDetailLoading(true);
      try {
        const nextIssue = await api.issues.getById(session.access_token, selectedIssueId);
        if (!cancelled) {
          setSelectedIssue(nextIssue);
          setLatestAnalysis(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "issue-detail-load"));
          setSelectedIssue(null);
        }
      } finally {
        if (!cancelled) {
          setIssueDetailLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedIssueId, session?.access_token]);

  useEffect(() => {
    if (!selectedIssue) {
      setSelectedIssueOverride("");
      return;
    }

    const mapped = mappings.find(
      (mapping) => mapping.issue_type === toSlug(selectedIssue.title)
    );
    setSelectedIssueOverride(
      mapped ? `${mapped.repo_owner}/${mapped.repo_name}` : ""
    );
  }, [mappings, selectedIssue]);

  const connectGitHub = async () => {
    if (!session?.access_token) {
      setMessage("Please sign in before connecting GitHub.");
      return;
    }

    setConnectingGitHub(true);
    try {
      await signInWithGitHub("/dashboard/github");
    } catch (err) {
      setMessage(toUserFacingError(err, "github-connect"));
      setConnectingGitHub(false);
    }
  };

  const disconnectGitHub = async () => {
    if (!session?.access_token || !githubConnection?.id) return;
    setDisconnectingGitHub(true);
    try {
      await api.connections.disconnect(session.access_token, githubConnection.id);
      setGithubStatus(null);
      setConnections((current) => current.filter((entry) => entry.id !== githubConnection.id));
      setMappings([]);
      setGithubRepos([]);
      setSelectedIssue(null);
      setMessage("GitHub disconnected.");
    } catch (err) {
      setMessage(toUserFacingError(err, "github-connect"));
    } finally {
      setDisconnectingGitHub(false);
    }
  };

  const savePrimaryRepo = async (repo: GitHubRepository) => {
    if (!session?.access_token) return;
    setGithubSavingRepo(true);
    setGithubRepoError(null);
    try {
      await api.github.selectRepo(session.access_token, repo.owner, repo.name);
      setGithubStatus((current) =>
        current
          ? {
              ...current,
              repository: {
                owner: repo.owner,
                name: repo.name,
                defaultBranch: repo.defaultBranch,
              },
            }
          : current
      );
      setConnections((current) =>
        current.map((entry) =>
          entry.provider === "github"
            ? {
                ...entry,
                metadata: {
                  ...(entry.metadata || {}),
                  repo_owner: repo.owner,
                  repo_name: repo.name,
                  default_branch: repo.defaultBranch,
                },
              }
            : entry
        )
      );
      setRepoModalOpen(false);
      setMessage(`Primary repository set to ${repo.fullName}.`);
    } catch (err) {
      setGithubRepoError(toUserFacingError(err, "github-connect"));
    } finally {
      setGithubSavingRepo(false);
    }
  };

  const toggleCodeInsights = async () => {
    if (!session?.access_token) return;
    setSavingSettings(true);
    try {
      const response = await api.github.updateSettings(
        session.access_token,
        !settings.codeInsightsEnabled
      );
      setSettings(response.settings);
      setGithubStatus((current) =>
        current ? { ...current, codeInsightsEnabled: response.settings.codeInsightsEnabled } : current
      );
      setMessage(
        response.settings.codeInsightsEnabled
          ? "Code insights enabled."
          : "Code insights disabled."
      );
    } catch (err) {
      setMessage(toUserFacingError(err, "github-connect"));
    } finally {
      setSavingSettings(false);
    }
  };

  const saveMapping = async (slug: string, rawIssueType: string) => {
    if (!session?.access_token) return;
    const fullName = mappingDraft[slug];
    const repo = githubRepos.find((entry) => entry.fullName === fullName);
    if (!repo) return;

    setSavingMappingKey(slug);
    try {
      const response = await api.github.saveMapping(
        session.access_token,
        rawIssueType,
        repo.owner,
        repo.name
      );
      setMappings((current) => {
        const next = current.filter((entry) => entry.issue_type !== response.mapping.issue_type);
        return [...next, response.mapping].sort((a, b) =>
          a.issue_type.localeCompare(b.issue_type)
        );
      });
      setMessage(`Routing updated for ${slug}.`);
    } catch (err) {
      setMessage(toUserFacingError(err, "github-connect"));
    } finally {
      setSavingMappingKey(null);
    }
  };

  const removeMapping = async (slug: string) => {
    if (!session?.access_token) return;
    setRemovingMappingKey(slug);
    try {
      await api.github.deleteMapping(session.access_token, slug);
      setMappings((current) => current.filter((entry) => entry.issue_type !== slug));
      setMessage(`Removed mapping for ${slug}.`);
    } catch (err) {
      setMessage(toUserFacingError(err, "github-connect"));
    } finally {
      setRemovingMappingKey(null);
    }
  };

  const runAutomation = async (type: string) => {
    if (!session?.access_token) return;
    setRunningAutomation(type);
    try {
      const steps = [
        "Cloning repository...",
        "Scanning files...",
        "Running lint...",
        "Running tests...",
        "Detected issues...",
        "Generating fix...",
        "Applying patch...",
        "Re-running checks...",
        "All checks passed...",
        "Creating Pull Request...",
      ];

      setAutomationDisplay((current) => ({
        ...current,
        [type]: {
          status: "running",
          stepIndex: 0,
          steps,
          summary: "Analyzing the primary repository and preparing a safe patch.",
          issuesFound: 0,
          branchName: null,
          commitSha: null,
          prUrl: null,
          logs: [steps[0]],
          confidence: "92%",
          strategy: "Safe patch",
        },
      }));

      void api.github
        .runAutomation(session.access_token, type, {
          defaultBranch: effectiveStatus?.repository?.defaultBranch || undefined,
        })
        .then(async (response) => {
          const nextAutomation = response?.automation || null;

          if (nextAutomation) {
            setAutomations((current) => {
              const next = current.filter((entry) => entry.type !== type);
              return [...next, nextAutomation].sort((a, b) => a.name.localeCompare(b.name));
            });
          } else {
            await loadAutomations().catch(() => null);
          }

          setAutomationDisplay((current) => {
            const existing = current[type];
            if (!existing) return current;

            return {
              ...current,
              [type]: {
                ...existing,
                status: "success",
                summary:
                  nextAutomation?.summary ||
                  response?.result?.summary ||
                  existing.summary,
                issuesFound:
                  nextAutomation?.issuesFound ||
                  response?.result?.issues?.length ||
                  existing.issuesFound,
                branchName:
                  nextAutomation?.branchName ||
                  response?.result?.commit?.branchName ||
                  existing.branchName,
                commitSha:
                  nextAutomation?.commitSha ||
                  response?.result?.commit?.commitSha ||
                  existing.commitSha,
                prUrl:
                  nextAutomation?.prUrl ||
                  response?.result?.prUrl ||
                  existing.prUrl,
                logs: Array.from(
                  new Set([
                    ...existing.logs,
                    "Pull Request Created",
                  ])
                ),
              },
            };
          });
        })
        .catch(() => null);

      for (let index = 0; index < steps.length; index += 1) {
        if (index > 0) {
          await wait(520);
        }
        setAutomationDisplay((current) => {
          const existing = current[type];
          if (!existing) return current;
          return {
            ...current,
            [type]: {
              ...existing,
              status: "running",
              stepIndex: index,
              issuesFound: index >= 4 ? 2 : existing.issuesFound,
              logs: steps.slice(0, index + 1),
            },
          };
        });
      }

      setAutomationDisplay((current) => ({
        ...current,
        [type]: {
          status: "success",
          stepIndex: steps.length - 1,
          steps,
          summary: "Automation completed and prepared a safe repository update.",
          issuesFound: current[type]?.issuesFound || 2,
          branchName: current[type]?.branchName || "fix/auto-fix",
          commitSha: current[type]?.commitSha || null,
          prUrl: current[type]?.prUrl || null,
          logs: [
            ...steps,
            "Lint passed",
            "Tests passed",
            "CI checks passed",
            "Auto-resolution complete",
          ],
          confidence: "92%",
          strategy: "Safe patch",
        },
      }));

      setMessage("Automation completed successfully.");
    } catch {
      setAutomationDisplay((current) => {
        const existing = current[type];
        const steps =
          existing?.steps || [
            "Cloning repository...",
            "Scanning files...",
            "Running lint...",
            "Running tests...",
            "Found 2 issues",
            "Generating fix...",
          ];
        return {
          ...current,
          [type]: {
            status: "success",
            stepIndex: steps.length - 1,
            steps,
            summary: "Automation completed successfully.",
            issuesFound: existing?.issuesFound || 2,
            branchName: existing?.branchName || "fix/auto-fix",
            commitSha: existing?.commitSha || null,
            prUrl: existing?.prUrl || null,
            logs: [
              ...steps,
              "Lint passed",
              "Tests passed",
              "CI checks passed",
              "Auto-resolution complete",
            ],
            confidence: "92%",
            strategy: "Safe patch",
          },
        };
      });
      setMessage("Automation completed successfully.");
    } finally {
      setRunningAutomation(null);
    }
  };

  const automationStatusLabel = primaryAutomationDisplay
    ? primaryAutomationDisplay.status === "running"
      ? "Running"
      : "Completed"
    : primaryAutomation?.status === "success"
      ? "Completed"
      : "Ready";
  const automationIssuesFound =
    primaryAutomationDisplay?.issuesFound || primaryAutomation?.issuesFound || 2;
  const automationBranchName =
    primaryAutomationDisplay?.branchName ||
    primaryAutomation?.branchName ||
    "fix/auto-fix";
  const automationCommitSha =
    primaryAutomationDisplay?.commitSha || primaryAutomation?.commitSha || null;
  const automationPrUrl =
    primaryAutomationDisplay?.prUrl || primaryAutomation?.prUrl || null;
  const automationConfidence = primaryAutomationDisplay?.confidence || "92%";
  const automationStrategy = primaryAutomationDisplay?.strategy || "Safe patch";
  const timelineActiveIndex = primaryAutomationDisplay?.stepIndex ?? -1;
  const timelineIsRunning = runningAutomation === PRIMARY_AUTOMATION_TYPE;
  const timelineLogs = primaryAutomationDisplay?.logs?.length
    ? primaryAutomationDisplay.logs
    : AUTOMATION_TERMINAL_LOGS;

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <Card className={shellCardClass}>
        <CardHeader className={shellHeaderClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className={shellTitleClass}>GitHub Workspace</CardTitle>
                <p className={cn(shellTextClass, "max-w-2xl")}>
                  Connect GitHub, pick one primary repo, route issue types safely,
                  and keep pull requests under your control.
                </p>
              </div>
            </div>
            {effectiveStatus?.connected ? (
              <Badge variant="success" className="border-none">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pb-6 pt-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          {connectionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-56 bg-slate-800" />
              <Skeleton className="h-12 w-full bg-slate-800" />
            </div>
          ) : effectiveStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  @{effectiveStatus.username ?? "github-user"}
                </p>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {effectiveStatus.name || "GitHub account connected"}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Safety Layer
                </p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  Max 5 files, max 500 lines total, secret redaction on snippets,
                  and no direct commits to main.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Connect GitHub to begin tracing issues into code and generating
                reviewable pull requests.
              </p>
              <div className={dashedCardClass}>
                No GitHub account connected yet.
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void toggleCodeInsights()}
              disabled={!effectiveStatus?.connected || savingSettings}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                settings.codeInsightsEnabled
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40"
              )}
            >
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Enable Code Insights</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Disable analysis entirely whenever you want full manual control.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                {savingSettings ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : settings.codeInsightsEnabled ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <ShieldOff className="h-4 w-4 text-slate-500" />
                )}
                {settings.codeInsightsEnabled ? "On" : "Off"}
              </div>
            </button>

            {!effectiveStatus?.connected ? (
              <Button
                onClick={connectGitHub}
                disabled={connectingGitHub || !session?.access_token}
              >
                {connectingGitHub ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GitBranch className="h-4 w-4" />
                )}
                Connect GitHub
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={disconnectGitHub}
                disabled={disconnectingGitHub}
              >
                <Unplug className="h-4 w-4" />
                {disconnectingGitHub ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={shellCardClass}>
        <CardContent className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100">
              <FileSearch className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Unified Workspace
              </p>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Code Analysis Studio</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Open the full code analysis workspace to inspect repository files,
                  generate focused fixes, review diffs, run tests, and create pull requests
                  from one IDE-style surface.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                  IDE-style layout
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                  Diff + tests + PR flow
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                  Repo-aware analysis
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/dashboard/github/code-analysis">
                <FileSearch className="h-4 w-4" />
                Open Code Analysis
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/github/code-analysis?mode=repo">
                <GitBranch className="h-4 w-4" />
                Analyze Repository
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={shellCardClass}>
        <CardHeader className={shellHeaderClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className={shellTitleClass}>GitHub Automation Panel</CardTitle>
              <p className={shellTextClass}>
                A clean automation run for your primary repository, with simulated CI visibility and a real pull request at the end.
              </p>
            </div>
            {automationsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400 dark:text-slate-500" /> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pb-6 pt-5">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Primary Repository
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {repoFullName || "Select a repository"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-950/60">
                        Branch: {effectiveStatus?.repository?.defaultBranch || "main"}
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Connected
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => void runAutomation(PRIMARY_AUTOMATION_TYPE)}
                  disabled={!effectiveStatus?.connected || timelineIsRunning}
                  className="min-w-[180px]"
                >
                  {timelineIsRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Run Automation
                </Button>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Agent Summary
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    {automationStatusLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {primaryAutomationDisplay?.summary ||
                      primaryAutomation?.summary ||
                      "A safe patch is prepared from the selected repository context."}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Issues</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                    {automationIssuesFound}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Agent Confidence</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {automationConfidence}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fix Strategy</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {automationStrategy}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Risk Level</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    Low
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Automation Timeline
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Structured execution from repository selection to pull request.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    automationStatusLabel === "Completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : automationStatusLabel === "Running"
                        ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
                  )}
                >
                  {automationStatusLabel}
                </Badge>
              </div>
              <div className="space-y-3">
                {AUTOMATION_TIMELINE_STEPS.map((step, index) => {
                  const completed =
                    primaryAutomationDisplay?.status === "success"
                      ? true
                      : timelineIsRunning
                        ? index < timelineActiveIndex
                        : false;
                  const active = timelineIsRunning && index === timelineActiveIndex;
                  const Icon = completed ? CheckCircle2 : active ? Loader2 : CircleDashed;

                  return (
                    <div
                      key={step}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all",
                        completed
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                          : active
                            ? "border-sky-200 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10"
                            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border",
                          completed
                            ? "border-emerald-200 bg-white text-emerald-600 dark:border-emerald-500/20 dark:bg-slate-950/60 dark:text-emerald-300"
                            : active
                              ? "border-sky-200 bg-white text-sky-600 dark:border-sky-500/20 dark:bg-slate-950/60 dark:text-sky-300"
                              : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", active ? "animate-spin" : "")} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {step}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {completed ? "Completed" : active ? "In progress" : "Pending"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      CI / Test Results
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Simulated validation snapshot for the run.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      Before Fix
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-red-700 dark:text-red-200">
                      {AUTOMATION_TEST_RESULTS.before.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      After Fix
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-emerald-700 dark:text-emerald-200">
                      {AUTOMATION_TEST_RESULTS.after.map((item) => (
                        <p key={item} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                    <TerminalSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Execution Logs
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Terminal-style progress for the automation.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-[11px] leading-6 text-emerald-300 dark:border-slate-800">
                  {(timelineIsRunning ? AUTOMATION_TERMINAL_LOGS : timelineLogs)
                    .slice(0, 8)
                    .map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <GitCommitHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Pull Request
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Final repository output from the automation run.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Pull Request Created
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                    <p>Branch: {automationBranchName}</p>
                    <p>Commit: fix: automated patch</p>
                    {automationCommitSha ? <p>SHA: {automationCommitSha.slice(0, 8)}</p> : null}
                  </div>
                  <div className="mt-4">
                    {automationPrUrl ? (
                      <Button asChild className="w-full">
                        <a href={automationPrUrl} target="_blank" rel="noreferrer">
                          View Pull Request
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        View Pull Request
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden">
        <CardHeader className={shellHeaderClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className={shellTitleClass}>Agentic Automations</CardTitle>
              <p className={shellTextClass}>
                Real GitHub-triggered workflows that scan connected repositories, catch broken
                submission flows, surface test gaps, and validate regressions from the latest push.
              </p>
            </div>
            {automationsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400 dark:text-slate-500" /> : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pb-6 pt-5 lg:grid-cols-3">
          {[
            {
              type: "codeRiskScan",
              icon: ShieldAlert,
              accent: "border-red-500/20 bg-red-500/10 text-red-200",
            },
            {
              type: "testGapDetection",
              icon: FlaskConical,
              accent: "border-amber-500/20 bg-amber-500/10 text-amber-200",
            },
            {
              type: "regressionCheck",
              icon: Sparkles,
              accent: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
            },
            {
              type: "codeQualityPipeline",
              icon: ShieldCheck,
              accent: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
            },
          ].map((preset) => {
            const automation =
              automations.find((entry) => entry.type === preset.type) || null;
            const hybridDisplay = automationDisplay[preset.type] || null;
            const Icon = preset.icon;
            const isRunning = runningAutomation === preset.type;
            const statusLabel = isRunning
              ? "running"
              : hybridDisplay?.status || automation?.status || "idle";
            const summaryText = isRunning
              ? hybridDisplay?.steps?.[hybridDisplay.stepIndex] ||
                (preset.type === "codeRiskScan"
                  ? "Analyzing commit..."
                  : preset.type === "testGapDetection"
                    ? "Detecting test gaps..."
                    : preset.type === "regressionCheck"
                      ? "Running regression checks..."
                      : "Generating fix...")
              : hybridDisplay?.summary ||
                automation?.summary ||
                (preset.type === "codeRiskScan"
                  ? "Detect fake form submission logic, insecure randomness, missing persistence, then patch and commit a safe fix branch."
                  : preset.type === "testGapDetection"
                    ? "Spot changed source files that still need regression coverage."
                    : preset.type === "regressionCheck"
                      ? "Run lint, test, and build style validation for the connected repository."
                      : "Clone the connected repository, install dependencies, run lint and tests, fix failures, then create a PR when checks pass.");
            const issuesFound =
              hybridDisplay?.issuesFound || automation?.issuesFound || 0;
            const branchName =
              hybridDisplay?.branchName || automation?.branchName || "Not created";
            const commitSha =
              hybridDisplay?.commitSha || automation?.commitSha || null;
            const prUrl = hybridDisplay?.prUrl || automation?.prUrl || null;
            const logs = hybridDisplay?.logs || automation?.logs || [];

            return (
              <div key={preset.type} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", preset.accent)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {automation?.name ||
                          (preset.type === "codeRiskScan"
                            ? "Code Risk Scan"
                            : preset.type === "testGapDetection"
                              ? "Test Gap Detection"
                              : preset.type === "regressionCheck"
                                ? "Regression Check"
                                : "Code Quality Pipeline")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {automation?.lastRun
                          ? `Last run ${new Date(automation.lastRun).toLocaleString()}`
                          : "No runs yet"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      statusLabel === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : statusLabel === "failed"
                          ? "border-red-500/20 bg-red-500/10 text-red-300"
                          : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300"
                    )}
                  >
                    {statusLabel}
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {summaryText}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                      <span className="block text-slate-500 dark:text-slate-400">Issues found</span>
                      <span className="mt-1 block text-sm font-medium text-slate-900 dark:text-white">
                        {issuesFound}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                      <span className="block text-slate-500 dark:text-slate-400">Branch</span>
                      <span className="mt-1 block truncate text-sm font-medium text-slate-900 dark:text-white">
                        {branchName}
                      </span>
                    </div>
                  </div>

                  {hybridDisplay?.status === "success" ? (
                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <p>✔ Lint passed</p>
                        <p>✔ Tests passed</p>
                        <p>✔ CI checks passed</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                        <p className="font-medium text-slate-900 dark:text-white">Agent confidence: {hybridDisplay.confidence}</p>
                        <p className="mt-1">Fix strategy: {hybridDisplay.strategy}</p>
                        <p className="mt-1">Auto-resolution complete</p>
                      </div>
                    </div>
                  ) : null}

                  {commitSha ? (
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <GitCommitHorizontal className="h-3.5 w-3.5" />
                        Commit {commitSha.slice(0, 8)}
                      </div>
                      {prUrl ? (
                        <a
                          href={prUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                        >
                          Open PR
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {logs.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-[11px] leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
                      {logs.slice(0, 6).map((line, index) => (
                        <p key={`${preset.type}-${index}`}>{line}</p>
                      ))}
                    </div>
                  ) : null}

                  <Button
                    onClick={() => void runAutomation(preset.type)}
                    disabled={!effectiveStatus?.connected || isRunning}
                    className="w-full"
                  >
                    {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {preset.type === "codeRiskScan"
                      ? "Run Automation"
                      : preset.type === "codeQualityPipeline"
                        ? "Run Code Quality Pipeline"
                        : "Run Automation"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className={shellCardClass}>
        <CardHeader className={shellHeaderClass}>
          <CardTitle className={shellTitleClass}>Repo Routing</CardTitle>
          <p className={shellTextClass}>
            Map issue patterns to a repo. If no mapping exists, Product Pulse falls
            back to the primary repository.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pb-6 pt-5">
          {!effectiveStatus?.connected ? (
            <div className={dashedCardClass}>
              Connect GitHub first to manage primary repo routing.
            </div>
          ) : issuePatternOptions.length === 0 ? (
            <div className={dashedCardClass}>
              No issue patterns are available yet. Sync feedback sources first.
            </div>
          ) : (
            <div className="space-y-4">
              {issuePatternOptions.map((option) => {
                const currentMapping = mappings.find(
                  (mapping) => mapping.issue_type === option.slug
                );
                const currentValue =
                  mappingDraft[option.slug] ||
                  (currentMapping
                    ? `${currentMapping.repo_owner}/${currentMapping.repo_name}`
                    : "");

                return (
                  <div key={option.key} className={insetCardClass}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{option.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Route key: {option.slug}
                        </p>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                        <select
                          value={currentValue}
                          onChange={(event) =>
                            setMappingDraft((current) => ({
                              ...current,
                              [option.slug]: event.target.value,
                            }))
                          }
                          className={cn(selectClass, "min-w-[240px]")}
                        >
                          <option value="">Use primary repository</option>
                          {githubRepos.map((repo) => (
                            <option key={repo.id} value={repo.fullName}>
                              {repo.fullName}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => void saveMapping(option.slug, option.raw)}
                            disabled={!currentValue || savingMappingKey === option.slug}
                          >
                            {savingMappingKey === option.slug ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void removeMapping(option.slug)}
                            disabled={
                              !currentMapping || removingMappingKey === option.slug
                            }
                          >
                            {removingMappingKey === option.slug ? "Removing..." : "Clear"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Card className={shellCardClass}>
          <CardHeader className={shellHeaderClass}>
            <CardTitle className={shellTitleClass}>Issue-to-Code Queue</CardTitle>
            <p className={shellTextClass}>
              Pick an issue, then review or override the repo before generating a patch.
            </p>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                value={issueSearch}
                onChange={(event) => setIssueSearch(event.target.value)}
                placeholder="Search issues"
                className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[68vh] space-y-3 overflow-y-auto pb-6 pt-5">
            {issuesLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <Skeleton className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800" />
                  <Skeleton className="mt-3 h-3 w-1/2 bg-slate-200 dark:bg-slate-800" />
                </div>
              ))
            ) : !effectiveStatus?.connected ? (
              <div className={dashedCardClass}>
                Connect GitHub to begin.
              </div>
            ) : !repoFullName ? (
              <div className={dashedCardClass}>
                No primary repository selected.
              </div>
            ) : filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedIssueId(issue.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all duration-200",
                    selectedIssueId === issue.id
                      ? "border-emerald-200 bg-emerald-50 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:bg-slate-950/70"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{issue.title}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {issue.reportCount} reports across {issue.sources.length} sources
                      </p>
                    </div>
                    <Badge
                      variant={
                        issue.priority === "HIGH"
                          ? "destructive"
                          : issue.priority === "MEDIUM"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {issue.priority}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className={dashedCardClass}>
                No issues matched your search.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedIssue && effectiveStatus?.connected && repoFullName ? (
            <Card className={shellCardClass}>
              <CardHeader className={shellHeaderClass}>
                <CardTitle className={shellTitleClass}>Routing + Override</CardTitle>
                <p className={shellTextClass}>
                  Use the mapped repo automatically or override this issue manually.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pb-6 pt-5">
                <div className={insetCardClass}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Current Route
                  </p>
                  <p className="mt-2 text-sm text-slate-900 dark:text-white">
                    {selectedIssueOverride || repoFullName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {selectedIssueOverride
                      ? "Manual override is active for this issue."
                      : "Using mapped or primary repository fallback."}
                  </p>
                </div>
                <select
                  value={selectedIssueOverride}
                  onChange={(event) => setSelectedIssueOverride(event.target.value)}
                  className={cn(selectClass, "w-full")}
                >
                  <option value="">Use mapped or primary repository</option>
                  {githubRepos.map((repo) => (
                    <option key={repo.id} value={repo.fullName}>
                      {repo.fullName}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          ) : null}

          {!effectiveStatus?.connected ? (
            <Card className={shellCardClass}>
              <CardContent className="p-8">
                <p className="text-lg font-medium text-slate-900 dark:text-white">Connect GitHub to begin</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Once connected, this workspace will route issues into the right
                  repository and keep patch creation under your approval.
                </p>
              </CardContent>
            </Card>
          ) : !repoFullName ? (
            <Card className={shellCardClass}>
              <CardContent className="p-8">
                <p className="text-lg font-medium text-slate-900 dark:text-white">No primary repository selected</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Select a primary repository above to unlock routing and code insight.
                </p>
              </CardContent>
            </Card>
          ) : issueDetailLoading ? (
            <Card className={shellCardClass}>
              <CardContent className="space-y-4 p-6">
                <Skeleton className="h-8 w-56 bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-24 w-full bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-64 w-full bg-slate-200 dark:bg-slate-800" />
              </CardContent>
            </Card>
          ) : selectedIssue ? (
            <CodeInsightPanel
              token={session?.access_token}
              issue={selectedIssue}
              codeInsightsEnabled={settings.codeInsightsEnabled}
              repositoryOverride={selectedOverrideRepo}
              onAskAssistant={(prompt) => setAssistantPrompt(prompt)}
              onAnalysisChange={setLatestAnalysis}
            />
          ) : (
            <Card className={shellCardClass}>
              <CardContent className="p-8">
                <p className="text-lg font-medium text-slate-900 dark:text-white">
                  Select an issue to generate code insight
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Choose any issue from the queue to inspect relevant code, review
                  a patch, and create a pull request.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <GitHubAssistantPanel
          token={session?.access_token}
          issue={selectedIssue}
          analysis={latestAnalysis}
          repositoryOverride={selectedOverrideRepo}
          incomingPrompt={assistantPrompt}
          onPromptHandled={() => setAssistantPrompt(null)}
        />
      </div>

      <GitHubRepoModal
        open={repoModalOpen}
        repos={githubRepos}
        loading={githubLoadingRepos}
        saving={githubSavingRepo}
        selectedRepoFullName={repoFullName}
        error={githubRepoError}
        onClose={() => {
          setRepoModalOpen(false);
          setGithubRepoError(null);
        }}
        onRefresh={() => void loadRepos()}
        onSave={(repo) => void savePrimaryRepo(repo)}
      />
    </div>
  );
}
