"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InspectionActivityPanel from "@/components/InspectionActivityPanel";
import InspectionResultCard from "@/components/InspectionResultCard";
import MobileInspectionCard from "@/components/MobileInspectionCard";
import MobileInspectionResultCard from "@/components/MobileInspectionResultCard";
import {
  AlertTriangle,
  ArrowUpRight,
  AudioLines,
  BellRing,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCode2,
  GitPullRequestArrow,
  Loader2,
  MessageSquareText,
  Mic,
  PauseCircle,
  RefreshCw,
  SendHorizonal,
  Sparkles,
  Ticket,
  Volume2,
  Download,
  Zap,
  Eye,
  TrendingUp,
  Activity,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  api,
  type AgentAction,
  type AgentAnomaly,
  type AgentChatResponse,
  type AgentExecutiveSummary,
  type InspectionActivity,
  type InspectionResult,
  type MobileInspectionResult,
  type AgentMemoryHighlight,
  type AgentPrediction,
  type AgentPriorityResult,
  type AgentTrend,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAgent } from "@/providers/AgentProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { useLiveEvents } from "@/providers/LiveEventsProvider";
import { useSetup } from "@/providers/SetupProvider";
import {
  DEMO_UI_MODE,
  PRIMARY_WEBSITE_URL,
  demoAgentActions,
  demoAgentStatus,
  demoCommandCenterAnomalies,
  demoCommandCenterPredictions,
  demoCommandCenterPriority,
  demoCommandCenterSummary,
  demoCommandCenterTrends,
  demoInspectionActivity,
  demoInspectionResults,
  demoMobileInspectionResults,
  getDemoCommandCenterChatResponse,
} from "@/lib/demo-ui-mode";
import {
  speakText,
  startVoiceRecognition,
  stopSpeaking,
  supportsVoiceInput,
} from "@/services/voiceClient";

/* ─── types ─── */

type CommandFilter = "all" | "critical" | "actions" | "insights";

type CommandMessage =
  | {
    id: string;
    role: "assistant";
    text: string;
    meta?: AgentChatResponse;
  }
  | {
    id: string;
    role: "user";
    text: string;
  };

const FILTERS: Array<{ id: CommandFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "actions", label: "Actions" },
  { id: "insights", label: "Insights" },
];

const QUICK_PROMPTS = [
  "What needs attention?",
  "Explain last decision",
  "What should I fix first?",
];

type NavSection = "overview" | "inspections" | "signals" | "predictions" | "decisions" | "activity" | "ask";

/* ─── helpers ─── */

function getActionIssueId(action: AgentAction | null) {
  if (!action) return null;
  const linkedIssueId = action.metadata?.linkedIssueId;
  if (typeof linkedIssueId === "string" && linkedIssueId) return linkedIssueId;
  const issueId = action.metadata?.issueId;
  if (typeof issueId === "string" && issueId && !issueId.includes(":")) return issueId;
  return null;
}

function getActionConfidence(action: AgentAction | null) {
  const value = Number(action?.metadata?.confidenceScore ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getConfidenceVariant(score: number) {
  if (score > 70) return "success";
  if (score >= 40) return "default";
  return "destructive";
}

function getConfidenceColor(score: number) {
  if (score > 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getActionVariant(action: AgentAction) {
  if (
    action.actionType === "ticket_created" ||
    action.actionType === "reminder_created" ||
    action.actionType === "calendar_event_created" ||
    action.actionType === "pr_created"
  ) return "actions" as const;
  return "insights" as const;
}

function getActionSeverity(action: AgentAction) {
  const priorityLevel = String(action.metadata?.priorityLevel || "").toLowerCase();
  const confidence = getActionConfidence(action);
  if (
    priorityLevel === "critical" || priorityLevel === "high" ||
    action.actionType === "predictive_alert" ||
    (action.actionType === "spike_detected" && String(action.metadata?.spikeLevel || "").toLowerCase() === "high")
  ) return "critical";
  if (confidence >= 70) return "high";
  return "normal";
}

function formatActionTitle(action: AgentAction) {
  switch (action.actionType) {
    case "issue_detected": return "Issue detected";
    case "spike_detected": return "Spike detected";
    case "predictive_alert": return "Predictive alert";
    case "ticket_created": return "Ticket created";
    case "reminder_created": return "Reminder scheduled";
    case "calendar_event_created": return "Calendar event scheduled";
    case "calendar_event_skipped": return "Calendar action skipped";
    case "action_suggested": return "Suggested action ready";
    case "email_reply_sent": return "Auto reply sent";
    case "email_reply_skipped": return "Auto reply skipped";
    case "patch_suggested": return "Patch suggested";
    case "pr_created": return "Pull request created";
    default: return action.actionType.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  }
}

function getActionIcon(action: AgentAction) {
  switch (action.actionType) {
    case "issue_detected": return BrainCircuit;
    case "spike_detected": case "predictive_alert": return BellRing;
    case "ticket_created": return Ticket;
    case "reminder_created": case "calendar_event_created": return Clock3;
    case "patch_suggested": return FileCode2;
    case "pr_created": return GitPullRequestArrow;
    default: return Zap;
  }
}

function getActionBullets(action: AgentAction | null, priority: AgentPriorityResult | null) {
  if (!action) return [];
  const bullets: string[] = [];
  const confidenceReasoning = String(action.metadata?.confidenceReasoning || "");
  const plannerReasoning = String(action.metadata?.plannerReasoning || "");
  const predictionText = String((action.metadata?.prediction as { prediction?: string } | undefined)?.prediction || "");
  if (confidenceReasoning) {
    bullets.push(
      ...confidenceReasoning.split("\n").map((l) => l.replace(/^- /, "").trim())
        .filter((l) => l && !l.toLowerCase().startsWith("confidence:") && l.toLowerCase() !== "based on:")
    );
  }
  if (plannerReasoning) bullets.push(plannerReasoning);
  if (predictionText) bullets.push(predictionText);
  if (priority?.reasoning) bullets.push(priority.reasoning);
  if (bullets.length === 0 && action.reason) bullets.push(action.reason);
  return [...new Set(bullets)].slice(0, 5);
}

function matchesFilter(action: AgentAction, filter: CommandFilter) {
  if (filter === "all") return true;
  if (filter === "critical") return getActionSeverity(action) === "critical";
  return getActionVariant(action) === filter;
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

function buildProactiveInsights(
  predictions: AgentPrediction[], anomalies: AgentAnomaly[], summary: AgentExecutiveSummary | null
) {
  const insights = [
    ...predictions.slice(0, 2).map((e) => ({ id: `prediction-${e.issue_type}`, text: e.prediction, type: "prediction" as const })),
    ...anomalies.slice(0, 2).map((e) => ({ id: `anomaly-${e.issue_type}`, text: `${e.issue_type_label} is showing a ${e.spike_level} anomaly spike.`, type: "anomaly" as const })),
    ...(summary?.recommendations || []).slice(0, 2).map((text, i) => ({ id: `recommendation-${i}`, text, type: "recommendation" as const })),
  ];
  return insights.slice(0, 4);
}

function getTimelineActions(actions: AgentAction[], selectedAction: AgentAction | null) {
  const issueId = getActionIssueId(selectedAction);
  const relevant = issueId ? actions.filter((a) => getActionIssueId(a) === issueId) : selectedAction ? [selectedAction] : [];
  return [...relevant].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(-5);
}

function summarizeMemory(memory: AgentMemoryHighlight) {
  const content = memory.content || {};
  if (typeof content.summary === "string" && content.summary.trim()) return content.summary.trim();
  if (typeof content.reason === "string" && content.reason.trim()) return content.reason.trim();
  if (typeof content.question === "string" && typeof content.answer === "string") return `${content.question} ${content.answer}`.trim();
  return "Stored context from a previous important system moment.";
}

function getMemoryTone(memoryType: string) {
  switch (memoryType) {
    case "issue": return "Issue memory";
    case "action": return "Action memory";
    case "decision": return "User decision";
    case "chat": return "Conversation";
    default: return "Memory";
  }
}

/* ─── sub-components ─── */

function SectionHeading({
  icon: Icon,
  title,
  id,
  tone = "bad",
}: {
  icon: React.ElementType;
  title: string;
  id?: string;
  tone?: SystemHealthTone;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div id={id} className="flex items-center gap-3 scroll-mt-8">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent", toneClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    </div>
  );
}

/* ─── main component ─── */

export default function CommandCenterPage() {
  const { session } = useAuth();
  const { status: setupStatus } = useSetup();
  const { subscribeToEvents } = useLiveEvents();
  const { status, actions, loading, error, refreshAgent } = useAgent();
  const { criticalAlerts } = useDashboardLive();
  const [filter, setFilter] = useState<CommandFilter>("all");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<AgentAnomaly[]>([]);
  const [predictions, setPredictions] = useState<AgentPrediction[]>([]);
  const [trends, setTrends] = useState<AgentTrend[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [priority, setPriority] = useState<AgentPriorityResult | null>(null);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<AgentExecutiveSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const [activeNav, setActiveNav] = useState<NavSection>("overview");
  const [inspectionActivity, setInspectionActivity] = useState<InspectionActivity[]>([]);
  const [inspectionResults, setInspectionResults] = useState<InspectionResult[]>([]);
  const [inspectionLoading, setInspectionLoading] = useState(true);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [startingInspection, setStartingInspection] = useState(false);
  const [inspectionStatus, setInspectionStatus] = useState<string | null>(null);
  const [mobileInspectionActivity, setMobileInspectionActivity] = useState<InspectionActivity[]>([]);
  const [mobileInspectionResults, setMobileInspectionResults] = useState<MobileInspectionResult[]>([]);
  const [mobileInspectionLoading, setMobileInspectionLoading] = useState(true);
  const [mobileInspectionError, setMobileInspectionError] = useState<string | null>(null);
  const [startingMobileInspection, setStartingMobileInspection] = useState(false);
  const [mobileInspectionStatus, setMobileInspectionStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommandMessage[]>([
    { id: "command-center-welcome", role: "assistant", text: "I can explain what the agent is doing, what is escalating, and what needs attention first." },
  ]);
  const [demoTick, setDemoTick] = useState(0);
  const voiceEnabled = supportsVoiceInput();
  const effectiveStatus = DEMO_UI_MODE ? demoAgentStatus : status;
  const effectiveActions = DEMO_UI_MODE ? demoAgentActions : actions;
  const effectiveLoading = DEMO_UI_MODE ? false : loading;
  const effectiveError = DEMO_UI_MODE ? null : error;
  const effectiveWebsiteUrl = setupStatus?.websiteUrl || PRIMARY_WEBSITE_URL;
  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const navTone =
    chromeTone === "good"
      ? {
        active: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-100 dark:border-emerald-500/15",
        heading: "good" as SystemHealthTone,
      }
      : chromeTone === "warning"
        ? {
          active: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border border-amber-100 dark:border-amber-500/15",
          heading: "warning" as SystemHealthTone,
        }
        : {
          active: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium border border-red-100 dark:border-red-500/15",
          heading: "bad" as SystemHealthTone,
        };

  /* ─── data fetching (unchanged) ─── */

  useEffect(() => {
    if (DEMO_UI_MODE) {
      setInspectionActivity(demoInspectionActivity);
      setInspectionResults(demoInspectionResults);
      setInspectionLoading(false);
      setInspectionError(null);
      setInspectionStatus("completed");
      return;
    }
    if (!session?.access_token) {
      setInspectionActivity([]);
      setInspectionResults([]);
      setInspectionLoading(false);
      return;
    }

    let cancelled = false;
    const loadInspection = async () => {
      setInspectionLoading(true);
      setInspectionError(null);
      try {
        const [activityResponse, resultResponse] = await Promise.all([
          api.inspect.activity(session.access_token, { limit: 10 }),
          api.inspect.results(session.access_token, { limit: 3 }),
        ]);
        if (!cancelled) {
          setInspectionActivity(activityResponse.activity);
          setInspectionResults(resultResponse.results);
        }
      } catch (err) {
        if (!cancelled) {
          setInspectionError(toUserFacingError(err, "agent-load"));
        }
      } finally {
        if (!cancelled) {
          setInspectionLoading(false);
        }
      }
    };

    void loadInspection();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (DEMO_UI_MODE) {
      setMobileInspectionActivity(
        demoInspectionActivity.map((item, index) => ({
          ...item,
          id: `mobile-${item.id}`,
          message:
            index === 0
              ? "Detected crash-on-submit regression on Android"
              : index === 1
                ? "Confidence score stabilized at 84%"
                : index === 2
                  ? "Retry-safe patch prepared for mobile submit flow"
                  : "Mobile release candidate marked ready",
        }))
      );
      setMobileInspectionResults(demoMobileInspectionResults);
      setMobileInspectionLoading(false);
      setMobileInspectionError(null);
      setMobileInspectionStatus("completed");
      return;
    }
    if (!session?.access_token) {
      setMobileInspectionActivity([]);
      setMobileInspectionResults([]);
      setMobileInspectionLoading(false);
      return;
    }

    let cancelled = false;
    const loadMobileInspection = async () => {
      setMobileInspectionLoading(true);
      setMobileInspectionError(null);
      try {
        const [activityResponse, resultResponse] = await Promise.all([
          api.mobileInspect.activity(session.access_token, { limit: 10 }),
          api.mobileInspect.results(session.access_token, { limit: 3 }),
        ]);
        if (!cancelled) {
          setMobileInspectionActivity(activityResponse.activity);
          setMobileInspectionResults(resultResponse.results);
        }
      } catch (err) {
        if (!cancelled) {
          setMobileInspectionError(toUserFacingError(err, "agent-load"));
        }
      } finally {
        if (!cancelled) {
          setMobileInspectionLoading(false);
        }
      }
    };

    void loadMobileInspection();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  useEffect(() => {
    if (DEMO_UI_MODE) {
      return;
    }
    return subscribeToEvents(
      (event) => {
        if (event.type === "inspection.activity") {
          setInspectionActivity((current) => {
            const next = [
              event.payload as unknown as InspectionActivity,
              ...current.filter((item) => item.id !== String(event.payload?.id || "")),
            ];
            return next.slice(0, 10);
          });
          return;
        }

        if (event.type === "inspection.result") {
          setInspectionResults((current) => {
            const next = [
              event.payload as unknown as InspectionResult,
              ...current.filter((item) => item.id !== String(event.payload?.id || "")),
            ];
            return next.slice(0, 3);
          });
          setInspectionStatus("completed");
          setStartingInspection(false);
          return;
        }

        if (event.type === "inspection.status") {
          const state =
            typeof event.payload?.state === "string" ? event.payload.state : "queued";
          setInspectionStatus(state);
          if (state === "completed" || state === "failed") {
            setStartingInspection(false);
          }
        }

        if (event.type === "mobile-inspection.activity") {
          setMobileInspectionActivity((current) => {
            const next = [
              event.payload as unknown as InspectionActivity,
              ...current.filter((item) => item.id !== String(event.payload?.id || "")),
            ];
            return next.slice(0, 10);
          });
          return;
        }

        if (event.type === "mobile-inspection.result") {
          setMobileInspectionResults((current) => {
            const next = [
              event.payload as unknown as MobileInspectionResult,
              ...current.filter((item) => item.id !== String(event.payload?.id || "")),
            ];
            return next.slice(0, 3);
          });
          setMobileInspectionStatus("completed");
          setStartingMobileInspection(false);
          return;
        }

        if (event.type === "mobile-inspection.status") {
          const state =
            typeof event.payload?.state === "string" ? event.payload.state : "queued";
          setMobileInspectionStatus(state);
          if (state === "completed" || state === "failed") {
            setStartingMobileInspection(false);
          }
        }
      },
      {
        types: [
          "inspection.activity",
          "inspection.result",
          "inspection.status",
          "mobile-inspection.activity",
          "mobile-inspection.result",
          "mobile-inspection.status",
        ],
      }
    );
  }, [subscribeToEvents]);

  useEffect(() => {
    if (DEMO_UI_MODE) {
      setAnomalies(demoCommandCenterAnomalies);
      setPredictions(demoCommandCenterPredictions);
      setTrends(demoCommandCenterTrends);
      setIntelLoading(false);
      setIntelError(null);
      return;
    }
    if (!session?.access_token) { setAnomalies([]); setPredictions([]); setTrends([]); setIntelLoading(false); setIntelError(null); return; }
    let cancelled = false;
    const loadIntel = async (showLoading = true) => {
      if (showLoading) setIntelLoading(true); setIntelError(null);
      try {
        const [a, p, t] = await Promise.all([api.agent.anomalies(session.access_token), api.agent.predictions(session.access_token), api.agent.trends(session.access_token)]);
        if (cancelled) return; setAnomalies(a); setPredictions(p); setTrends(t);
      } catch (err) { if (!cancelled) setIntelError(toUserFacingError(err, "agent-load")); }
      finally { if (!cancelled) setIntelLoading(false); }
    };
    void loadIntel();
    const timer = window.setInterval(() => { void loadIntel(false); }, 12000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session?.access_token]);

  useEffect(() => {
    if (DEMO_UI_MODE) {
      setExecutiveSummary(demoCommandCenterSummary);
      setSummaryLoading(false);
      setSummaryError(null);
      return;
    }
    if (!session?.access_token) { setExecutiveSummary(null); setSummaryLoading(false); setSummaryError(null); return; }
    let cancelled = false;
    const loadSummary = async (showLoading = true) => {
      if (showLoading) setSummaryLoading(true); setSummaryError(null);
      try { const s = await api.agent.executiveSummary(session.access_token); if (!cancelled) setExecutiveSummary(s); }
      catch (err) { if (!cancelled) setSummaryError(toUserFacingError(err, "agent-load")); }
      finally { if (!cancelled) setSummaryLoading(false); }
    };
    void loadSummary();
    const timer = window.setInterval(() => { void loadSummary(false); }, 18000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [session?.access_token]);

  useEffect(() => {
    if (!DEMO_UI_MODE) {
      return;
    }

    const timer = window.setInterval(() => {
      setDemoTick((current) => current + 1);
    }, 4000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!DEMO_UI_MODE || demoTick === 0) {
      return;
    }

    setInspectionActivity((current) =>
      [
        {
          id: `cc-live-${demoTick}`,
          message:
            [
              "Streaming fresh interaction traces from webate.vercel.app",
              "Submit friction remained elevated during the latest check",
              "No new blockers detected outside the audit and submit flows",
            ][demoTick % 3],
          status: "success",
          timestamp: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 10)
    );
  }, [demoTick]);

  const filteredActions = useMemo(() => effectiveActions.filter((a) => matchesFilter(a, filter)), [effectiveActions, filter]);

  useEffect(() => {
    if (!selectedActionId || !filteredActions.some((a) => a.id === selectedActionId)) setSelectedActionId(filteredActions[0]?.id ?? null);
  }, [filteredActions, selectedActionId]);

  const selectedAction = useMemo(() => filteredActions.find((a) => a.id === selectedActionId) || filteredActions[0] || null, [filteredActions, selectedActionId]);

  useEffect(() => {
    if (DEMO_UI_MODE) {
      setPriority(demoCommandCenterPriority);
      setPriorityLoading(false);
      return;
    }
    if (!session?.access_token) { setPriority(null); setPriorityLoading(false); return; }
    const issueId = getActionIssueId(selectedAction);
    if (!issueId) { setPriority(null); setPriorityLoading(false); return; }
    let cancelled = false;
    const loadPriority = async () => {
      setPriorityLoading(true);
      try { const p = await api.agent.priority(session.access_token, issueId); if (!cancelled) setPriority(p); }
      catch { if (!cancelled) setPriority(null); } finally { if (!cancelled) setPriorityLoading(false); }
    };
    void loadPriority();
    return () => { cancelled = true; };
  }, [selectedAction, session?.access_token]);

  const issuesDetectedToday = useMemo(() => effectiveActions.filter((a) => a.actionType === "issue_detected" && new Date(a.createdAt).toDateString() === new Date().toDateString()).length, [effectiveActions]);
  const actionsTakenToday = useMemo(() => effectiveActions.filter((a) => ["ticket_created", "reminder_created", "calendar_event_created", "predictive_alert"].includes(a.actionType) && new Date(a.createdAt).toDateString() === new Date().toDateString()).length, [effectiveActions]);
  const accuracyScore = useMemo(() => { const s = effectiveActions.map((a) => Number(a.metadata?.confidenceScore ?? 0)).filter((v) => Number.isFinite(v) && v > 0); if (s.length === 0) return 81; return Math.round(s.reduce((sum, v) => sum + v, 0) / s.length); }, [effectiveActions]);

  const selectedConfidence = priority?.confidence.score || getActionConfidence(selectedAction || null);
  const selectedBullets = getActionBullets(selectedAction, priority);
  const selectedIcon = selectedAction ? getActionIcon(selectedAction) : BrainCircuit;
  const proactiveInsights = buildProactiveInsights(predictions, anomalies, executiveSummary);
  const decisionTimeline = getTimelineActions(effectiveActions, selectedAction);

  /* ─── chat handlers (unchanged) ─── */

  const submitChat = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setChatError(null); setChatLoading(true);
    setMessages((c) => [...c, { id: `user-${Date.now()}`, role: "user", text: trimmed }]);
    setChatInput(""); setChatOpen(true);
    try {
      const response = DEMO_UI_MODE
        ? await new Promise<AgentChatResponse>((resolve) => {
            window.setTimeout(() => resolve(getDemoCommandCenterChatResponse(trimmed)), 650);
          })
        : await api.agent.chat(session!.access_token, trimmed);
      setMessages((c) => [...c, { id: `assistant-${Date.now()}`, role: "assistant", text: response.answer, meta: response }]);
        const started = speakText(response.answer, {
          onStart: () => setVoiceSpeaking(true),
          onEnd: () => setVoiceSpeaking(false),
          onError: () => setVoiceSpeaking(false),
        });
        if (!started) setVoiceSpeaking(false);
    } catch (err) { setChatError(toUserFacingError(err, "ai-helper")); } finally { setChatLoading(false); }
  };

  const handleChatSubmit = async (event: FormEvent) => { event.preventDefault(); await submitChat(chatInput); };

  const handleVoiceInput = async () => {
    if (!voiceEnabled || voiceListening) return;
    setChatError(null); setVoiceListening(true);
    try { const result = await startVoiceRecognition(); if (result.text) { setChatInput(result.text); await submitChat(result.text); } }
    catch (err) { setChatError(toUserFacingError(err, "ai-helper")); } finally { setVoiceListening(false); }
  };

  const handleDownloadReport = () => {
    if (!executiveSummary) return;
    const lines = [
      "AgenticPulse Executive Summary", `Generated: ${new Date(executiveSummary.generatedAt).toLocaleString()}`, "",
      executiveSummary.summary, "", "Top Issues:", ...executiveSummary.topIssues.map((i) => `- ${i.title} (${i.priority}, ${i.reportCount} reports, ${i.trendPercent}% trend)`),
      "", "Risks:", ...executiveSummary.risks.map((r) => `- ${r}`), "", "Recommendations:", ...executiveSummary.recommendations.map((r) => `- ${r}`),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "agenticpulse-executive-summary.txt"; link.click(); URL.revokeObjectURL(url);
  };

  const handleGenerateSummary = async () => {
    if (DEMO_UI_MODE) {
      setSummaryError(null); setSummaryLoading(true);
      window.setTimeout(() => {
        setExecutiveSummary({
          ...demoCommandCenterSummary,
          generatedAt: new Date().toISOString(),
        });
        setSummaryLoading(false);
      }, 700);
      return;
    }
    if (!session?.access_token) return;
    setSummaryError(null); setSummaryLoading(true);
    try { const s = await api.agent.executiveSummary(session.access_token); setExecutiveSummary(s); }
    catch (err) { setSummaryError(toUserFacingError(err, "agent-load")); } finally { setSummaryLoading(false); }
  };

  const handleStartHealthInspection = async () => {
    if (DEMO_UI_MODE) {
      setInspectionError(null);
      setInspectionStatus("queued");
      setStartingInspection(true);
      window.setTimeout(() => {
        setInspectionStatus("running");
        setInspectionActivity((current) => [
          {
            id: `manual-health-${Date.now()}`,
            message: "Health inspection replayed on the primary website flow",
            status: "success",
            timestamp: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 10));
      }, 450);
      window.setTimeout(() => {
        setInspectionStatus("completed");
        setStartingInspection(false);
      }, 1200);
      return;
    }
    if (!session?.access_token || !setupStatus?.websiteUrl) {
      setInspectionError("Add your website URL in setup before starting a live inspection.");
      return;
    }

    setInspectionError(null);
    setInspectionStatus("queued");
    setStartingInspection(true);

    try {
      await api.inspect.start(session.access_token, {
        url: setupStatus.websiteUrl,
        issue: "Automated product health inspection",
        jobType: "inspect:health",
        context: {
          page: "Production website",
          steps: [],
        },
      });
    } catch (err) {
      setInspectionError(toUserFacingError(err, "inspection-start"));
      setInspectionStatus("failed");
      setStartingInspection(false);
    }
  };

  const handleStartMobileInspection = async () => {
    if (DEMO_UI_MODE) {
      setMobileInspectionError(null);
      setMobileInspectionStatus("queued");
      setStartingMobileInspection(true);
      window.setTimeout(() => {
        setMobileInspectionStatus("running");
        setMobileInspectionActivity((current) => [
          {
            id: `manual-mobile-${Date.now()}`,
            message: "Mobile submit flow replayed against the latest build",
            status: "success",
            timestamp: new Date().toISOString(),
          },
          ...current,
        ].slice(0, 10));
      }, 450);
      window.setTimeout(() => {
        setMobileInspectionStatus("completed");
        setStartingMobileInspection(false);
      }, 1200);
      return;
    }
    if (!session?.access_token) {
      setMobileInspectionError("Sign in to start a mobile inspection.");
      return;
    }

    setMobileInspectionError(null);
    setMobileInspectionStatus("queued");
    setStartingMobileInspection(true);

    try {
      await api.mobileInspect.start(session.access_token, {
        issue: "App crash on login",
        steps: ["open app", "click login", "wait for dashboard"],
      });
    } catch (err) {
      setMobileInspectionError(toUserFacingError(err, "inspection-start"));
      setMobileInspectionStatus("failed");
      setStartingMobileInspection(false);
    }
  };

  /* ─── internal sidebar nav ─── */

  const navSections: { key: NavSection; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: Eye },
    { key: "inspections", label: "Inspections", icon: Bot },
    { key: "signals", label: "Signals", icon: Activity },
    { key: "predictions", label: "Predictions", icon: TrendingUp },
    { key: "decisions", label: "Decisions", icon: Shield },
    { key: "activity", label: "Activity", icon: Sparkles },
    { key: "ask", label: "Ask AI", icon: Bot },
  ];

  useEffect(() => {
    const sections = navSections
      .map((section) => ({
        key: section.key,
        element: document.getElementById(`cc-${section.key}`),
      }))
      .filter(
        (entry): entry is { key: NavSection; element: HTMLElement } =>
          Boolean(entry.element)
      );

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length === 0) {
          return;
        }

        const nextSection = visible[0].target.id.replace("cc-", "") as NavSection;
        setActiveNav(nextSection);
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.5, 0.7],
      }
    );

    sections.forEach((section) => observer.observe(section.element));

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (key: NavSection) => {
    setActiveNav(key);
    document.getElementById(`cc-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* ─── render ─── */

  return (
    <TooltipProvider delay={120}>
      <div className="flex gap-0 lg:gap-8">
        {/* ── LEFT NAV (internal sidebar) ── */}
        <nav className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-24 self-start">
          {navSections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => scrollToSection(s.key)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all text-left",
                activeNav === s.key
                  ? navTone.active
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent"
              )}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </nav>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-10 pb-24">

          {/* ═══════════════════════════════════════════════════════
              1. SYSTEM OVERVIEW
          ═══════════════════════════════════════════════════════ */}
          <section id="cc-overview" className="space-y-5">
            <SectionHeading icon={Eye} title="System Overview" tone={navTone.heading} />

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {/* Agent Status */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Agent Status</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={cn(
                      "absolute inline-flex h-full w-full rounded-full opacity-75",
                      effectiveStatus.state === "active" ? "animate-ping bg-emerald-400" : effectiveStatus.state === "processing" ? "animate-ping bg-amber-400" : "bg-slate-400"
                    )} />
                    <span className={cn(
                      "relative inline-flex h-2.5 w-2.5 rounded-full",
                      effectiveStatus.state === "active" ? "bg-emerald-500" : effectiveStatus.state === "processing" ? "bg-amber-500" : "bg-slate-400"
                    )} />
                  </span>
                  <span className="text-base font-semibold text-slate-900 dark:text-white capitalize">{effectiveStatus.state}</span>
                </div>
              </div>
              {/* Issues Today */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Issues Detected</p>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{issuesDetectedToday}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">today</p>
              </div>
              {/* Actions Taken */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Actions Taken</p>
                <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{actionsTakenToday}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">today</p>
              </div>
              {/* Accuracy */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Accuracy</p>
                <p className={cn("mt-3 text-2xl font-bold", getConfidenceColor(accuracyScore))}>{accuracyScore}%</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">avg confidence</p>
              </div>
            </div>

            {/* Executive Summary */}
            {executiveSummary && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Executive Summary</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{executiveSummary.summary}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => void handleGenerateSummary()} disabled={summaryLoading}>
                      {summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={!executiveSummary}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-red-600 dark:text-red-400 font-medium">Top Issues</p>
                    <div className="mt-3 space-y-2">
                      {executiveSummary.topIssues.slice(0, 2).map((issue) => (
                        <p key={issue.id} className="text-sm text-slate-700 dark:text-slate-300">{issue.title}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-medium">Risks</p>
                    <div className="mt-3 space-y-2">
                      {executiveSummary.risks.slice(0, 2).map((risk, i) => (
                        <p key={i} className="text-sm text-slate-700 dark:text-slate-300">{risk}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-medium">Recommendations</p>
                    <div className="mt-3 space-y-2">
                      {executiveSummary.recommendations.slice(0, 2).map((item, i) => (
                        <p key={i} className="text-sm text-slate-700 dark:text-slate-300">{item}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section id="cc-inspections" className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <SectionHeading icon={Bot} title="Live Inspections" tone={navTone.heading} />
              <div className="flex items-center gap-3">
                {inspectionStatus ? (
                  <Badge
                    variant={
                      inspectionStatus === "completed"
                        ? "success"
                        : inspectionStatus === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="rounded-full px-3 py-1"
                  >
                    {inspectionStatus}
                  </Badge>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleStartHealthInspection()}
                  disabled={startingInspection || !effectiveWebsiteUrl}
                  className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  {startingInspection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {startingInspection ? "Inspecting..." : "Run health inspection"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
              <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Inspection target</p>
                  <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white break-all">
                    {effectiveWebsiteUrl || "No website URL configured yet"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    The agent inspects your live product and keeps the latest report ready in this control room.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-500/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Daily health check</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">3:00 AM every day</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Your scheduled inspection hits the system API, queues the run, and lets AgenticPulse analyze the latest product state.
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {setupStatus?.inspectionAccess?.enabled
                      ? "Authenticated inspection enabled"
                      : "Public-page inspection only"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Latest report</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {inspectionResults[0]
                      ? new Date(inspectionResults[0].createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "Waiting for first run"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {inspectionResults[0]
                      ? `${Math.round(inspectionResults[0].confidence)}% confidence on the latest inspection result.`
                      : "Once the first health check completes, the report appears here automatically."}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Execution path: Schedule → AgenticPulse API → Inspection queue → Agent runtime
                </div>
                {effectiveWebsiteUrl ? (
                  <a
                    href={effectiveWebsiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    Open target
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <Link
                    href="/setup"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    Add website URL
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>

            {inspectionError ? (
              <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {inspectionError}
              </div>
            ) : null}

            {inspectionLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : (
              <>
                <InspectionActivityPanel items={inspectionActivity} />
                {inspectionResults[0] ? (
                  <InspectionResultCard result={inspectionResults[0]} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
                    No inspection results yet. Run a health inspection to watch the agent inspect your live product.
                  </div>
                )}

                <div className="mt-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 p-4 dark:bg-slate-950/20">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        Mobile Agent
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                        Real-device mobile inspection in the cloud
                      </h3>
                    </div>
                    {mobileInspectionStatus ? (
                      <Badge
                        variant={
                          mobileInspectionStatus === "completed"
                            ? "success"
                            : mobileInspectionStatus === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                        className="rounded-full px-3 py-1"
                      >
                        {mobileInspectionStatus}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <MobileInspectionCard
                      running={startingMobileInspection}
                      status={mobileInspectionStatus}
                      lastRunAt={mobileInspectionResults[0]?.createdAt ?? null}
                      deviceName={mobileInspectionResults[0]?.deviceName ?? "Google Pixel 6"}
                      onRun={() => void handleStartMobileInspection()}
                    />

                    {mobileInspectionError ? (
                      <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {mobileInspectionError}
                      </div>
                    ) : null}

                    {mobileInspectionLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                        <Skeleton className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                      </div>
                    ) : (
                      <>
                        <InspectionActivityPanel items={mobileInspectionActivity} />
                        {mobileInspectionResults[0] ? (
                          <MobileInspectionResultCard result={mobileInspectionResults[0]} />
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
                    No mobile inspection results yet. Run a mobile inspection to watch AgenticPulse test your app on a cloud device.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════
              2. SIGNALS & MEMORY
          ═══════════════════════════════════════════════════════ */}
          <section id="cc-signals" className="space-y-5">
            <SectionHeading icon={Activity} title="Signals & Memory" tone={navTone.heading} />

            {proactiveInsights.length > 0 ? (
              <div className="space-y-3">
                {proactiveInsights.map((insight) => (
                  <div key={insight.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                        insight.type === "anomaly" ? "border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" :
                          insight.type === "prediction" ? "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {insight.type === "anomaly" ? <AlertTriangle className="h-4 w-4" /> : insight.type === "prediction" ? <BellRing className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      </div>
                      <div>
                        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.15em]",
                          insight.type === "anomaly" ? "text-red-600 dark:text-red-400" : insight.type === "prediction" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {insight.type === "anomaly" ? "Anomaly" : insight.type === "prediction" ? "Prediction" : "Recommendation"}
                        </span>
                        <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{insight.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
                No active signals right now. The system is monitoring.
              </div>
            )}

            {/* Memory Highlights */}
            {executiveSummary?.memoryHighlights && executiveSummary.memoryHighlights.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <AudioLines className="h-4 w-4 text-red-600 dark:text-red-400" />
                  Memory Highlights
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {executiveSummary.memoryHighlights.slice(0, 4).map((memory) => (
                    <div key={memory.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-600 dark:text-red-400">{getMemoryTone(memory.memoryType)}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{summarizeMemory(memory)}</p>
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(memory.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════
              3. PREDICTIONS & RISKS
          ═══════════════════════════════════════════════════════ */}
          <section id="cc-predictions" className="space-y-5">
            <SectionHeading icon={TrendingUp} title="Predictions & Risks" tone={navTone.heading} />

            {predictions.length > 0 || anomalies.length > 0 ? (
              <div className="space-y-3">
                {predictions.map((p) => (
                  <div key={p.issue_type} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    {(() => {
                      const predictionConfidence = Number.isFinite(p.confidence)
                        ? Number(p.confidence)
                        : 0;

                      return (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-slate-900 dark:text-white">{p.issue_type_label || p.issue_type}</h4>
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{p.prediction}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={cn("text-lg font-bold", getConfidenceColor(predictionConfidence))}>{Math.round(predictionConfidence)}%</span>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">confidence</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
                {anomalies.map((a) => (
                  <div key={a.issue_type} className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 p-5 transition-all hover:border-red-300 dark:hover:border-red-500/30">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-red-700 dark:text-red-300">{a.issue_type_label} — {a.spike_level} spike</h4>
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400/80">Anomalous activity detected. Trend growth: {a.trend_growth_percent}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : intelLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <Skeleton className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
                {intelError || "No active predictions. The system is collecting data."}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════
              4. AGENT DECISIONS (MOST IMPORTANT)
          ═══════════════════════════════════════════════════════ */}
          <section id="cc-decisions" className="space-y-5">
            <div className="flex items-center justify-between">
              <SectionHeading icon={Shield} title="Agent Decisions" tone={navTone.heading} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (DEMO_UI_MODE) {
                    setDemoTick((current) => current + 1);
                    return;
                  }
                  void refreshAgent();
                }}
                className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                    filter === item.id
                      ? "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Decision cards */}
            {effectiveLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : filteredActions.length > 0 ? (
              <div className="space-y-4">
                {filteredActions.slice(0, 8).map((action) => {
                  const Icon = getActionIcon(action);
                  const score = getActionConfidence(action);
                  const isSelected = selectedAction?.id === action.id;
                  const severity = getActionSeverity(action);
                  const bullets = getActionBullets(action, isSelected ? priority : null);
                  const issueId = getActionIssueId(action);

                  return (
                    <div
                      key={action.id}
                      onClick={() => setSelectedActionId(action.id)}
                      className={cn(
                        "rounded-2xl border p-5 transition-all cursor-pointer",
                        isSelected
                          ? "border-red-200 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5 shadow-lg"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 hover:shadow-md"
                      )}
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            severity === "critical" ? "border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" :
                              "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-600 dark:text-slate-300"
                          )}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{formatActionTitle(action)}</h4>
                              {severity === "critical" && (
                                <span className="rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:text-red-400">Critical</span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{action.reason.split(".")[0]}.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {score > 0 && (
                            <span className={cn("text-base font-bold", getConfidenceColor(score))}>{score}%</span>
                          )}
                          <span className="text-xs text-slate-400 dark:text-slate-500">{formatRelativeTime(action.createdAt)}</span>
                        </div>
                      </div>

                      {/* Expanded reasoning (when selected) */}
                      {isSelected && bullets.length > 0 && (
                        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-transparent p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-600 dark:text-red-400 mb-3">Why this decision</p>
                          <div className="space-y-2">
                            {bullets.map((bullet, i) => (
                              <div key={`${action.id}-b-${i}`} className="flex gap-3">
                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400 shrink-0" />
                                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{bullet}</p>
                              </div>
                            ))}
                          </div>
                          {issueId && (
                            <Link
                              href={`/dashboard/issues/${issueId}`}
                              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:border-red-300 dark:hover:border-red-500/40 hover:text-red-600 dark:hover:text-red-400"
                            >
                              Open issue <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
                {effectiveError || "No agent activity matches this filter yet."}
              </div>
            )}
          </section>

          {/* ═══════════════════════════════════════════════════════
              5. ACTIVITY TIMELINE
          ═══════════════════════════════════════════════════════ */}
          <section id="cc-activity" className="space-y-5">
            <SectionHeading icon={Sparkles} title="Decision Timeline" tone={navTone.heading} />

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-colors">
              {decisionTimeline.length > 0 ? (
                <div className="space-y-0">
                  {decisionTimeline.map((action, index) => {
                    const Icon = getActionIcon(action);
                    return (
                      <div key={action.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-600 dark:text-slate-300">
                            <Icon className="h-4 w-4" />
                          </div>
                          {index < decisionTimeline.length - 1 && (
                            <div className="mt-2 h-10 w-px bg-slate-200 dark:bg-slate-800" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{formatActionTitle(action)}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{action.reason}</p>
                          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{new Date(action.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No decision timeline events available yet.
                </p>
              )}
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════
              6. ASK YOUR SYSTEM
          ═══════════════════════════════════════════════════════ */}
          <section id="cc-ask" className="space-y-5">
            <SectionHeading icon={Bot} title="Ask Your System" tone={navTone.heading} />

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6 transition-colors">
              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2 mb-5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submitChat(prompt)}
                    className="rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-4 py-2 text-xs text-slate-600 dark:text-slate-400 transition hover:border-red-300 dark:hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="max-h-[400px] space-y-4 overflow-y-auto mb-5 pr-1">
                {messages.map((message) => (
                  <div key={message.id} className={cn("max-w-[88%]", message.role === "user" ? "ml-auto" : "mr-auto")}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm",
                      message.role === "user"
                        ? "rounded-br-md bg-red-600 text-white"
                        : "rounded-bl-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-700 dark:text-slate-200"
                    )}>
                      {message.text}
                    </div>
                    {message.role === "assistant" && message.meta ? (
                      <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-600 dark:text-red-400 mb-2">Suggested next steps</p>
                        <div className="space-y-2">
                          {message.meta.suggestedActions.map((act, i) => (
                            <p key={`${message.id}-${i}`} className="text-sm text-slate-600 dark:text-slate-300">{i + 1}. {act}</p>
                          ))}
                        </div>
                        {message.meta.suggestedIssueIds.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.meta.suggestedIssueIds.map((id) => (
                              <Link key={id} href={`/dashboard/issues/${id}`} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-3 py-1 text-xs text-slate-600 dark:text-slate-300 transition hover:border-red-300 dark:hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400">
                                Open issue
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
                {chatLoading && (
                  <div className="mr-auto max-w-[88%] rounded-2xl rounded-bl-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-red-600 dark:text-red-400" />
                      Reasoning through live signals...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat input */}
              {chatError && (
                <div className="mb-3 rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {chatError}
                </div>
              )}
              <form onSubmit={handleChatSubmit} className="flex gap-3">
                <div className="flex-1 relative">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask what needs attention, why a decision was made..."
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 pr-12"
                  />
                  {voiceEnabled && (
                    <button
                      type="button"
                      onClick={() => void handleVoiceInput()}
                      disabled={voiceListening || chatLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition"
                    >
                      {voiceListening ? <AudioLines className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-12 rounded-xl px-6 shrink-0"
                >
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </form>
              {voiceSpeaking && (
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => { stopSpeaking(); setVoiceSpeaking(false); }} className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition">
                    <PauseCircle className="h-3.5 w-3.5" />
                    Stop speaking
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
