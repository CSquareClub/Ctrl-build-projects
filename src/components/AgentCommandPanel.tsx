"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  AudioLines,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eraser,
  Expand,
  Loader2,
  Mic,
  MicOff,
  Minimize2,
  Send,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  api,
  type AgentChatResponse,
  type AgentCommandContext,
  type Issue,
  type TimelineDay,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { useAgentCommandPanel } from "@/providers/AgentCommandPanelProvider";
import { deriveSystemHealthTone } from "@/lib/system-health";
import {
  speakText,
  startVoiceRecognition,
  stopSpeaking,
  supportsVoiceInput,
} from "@/services/voiceClient";

const STORAGE_KEY = "agentic_chat_history";
const MAX_MESSAGES = 40;
const STARTER_PROMPTS = [
  "What are the top issues right now?",
  "Why are issues increasing?",
  "Show me critical problems",
  "What should I fix first?",
  "Run a health inspection",
  "Summarize this week",
];

type PanelMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  meta?: AgentChatResponse;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detectCommandMode(value: string) {
  return /\b(create|fix|run|schedule|assign|inspect|deploy|patch)\b/i.test(value);
}

function summarizeTimeline(days: TimelineDay[]) {
  const recent = days.slice(-7);
  if (recent.length === 0) {
    return "";
  }
  const issueCount = recent.reduce((sum, day) => sum + Number(day.issue_count || 0), 0);
  const feedbackCount = recent.reduce((sum, day) => sum + Number(day.feedback_count || 0), 0);
  return `Last 7 days: ${issueCount} issues and ${feedbackCount} feedback events.`;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1, repeat: Infinity, delay: index * 0.2 }}
        />
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  onSuggestedAction,
}: {
  message: PanelMessage;
  onSuggestedAction: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const isCommand = isUser && detectCommandMode(message.text);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className="max-w-[90%] space-y-2">
        <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold",
              isUser
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-white/[0.06] dark:text-slate-300"
            )}
          >
            {isUser ? "U" : <Bot className="h-3.5 w-3.5" />}
          </div>

          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm leading-relaxed",
              isUser
                ? "rounded-tr-md border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-50"
                : "rounded-tl-md border border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-200"
            )}
          >
            <div className="whitespace-pre-wrap">{message.text}</div>
          </div>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 px-10 text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {isUser ? (
            isCommand ? (
              <span className="flex items-center gap-1">
                <WandSparkles className="h-2.5 w-2.5" /> Command
              </span>
            ) : (
              <span>Chat</span>
            )
          ) : message.meta?.responseMode === "action" ? (
            <span>Action</span>
          ) : (
            <span>Reasoning</span>
          )}
          <span>•</span>
          <span>{formatTime(message.createdAt)}</span>
          {message.meta?.confidence ? (
            <>
              <span>•</span>
              <span
                className={cn(
                  message.meta.confidence === "high"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : message.meta.confidence === "medium"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-400 dark:text-slate-500"
                )}
              >
                {message.meta.confidence}
              </span>
            </>
          ) : null}
        </div>

        {message.role === "assistant" && message.meta?.actionResult ? (
          <div
            className={cn(
              "ml-10 rounded-2xl border p-4",
              message.meta.actionResult.status === "success"
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                : message.meta.actionResult.status === "pending"
                  ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
                  : "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
            )}
          >
            <div className="flex items-start gap-3">
              {message.meta.actionResult.status === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              ) : message.meta.actionResult.status === "pending" ? (
                <Clock3 className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-300" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600 dark:text-red-300" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {message.meta.actionResult.title}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {message.meta.actionResult.description}
                </p>
                {message.meta.actionResult.href ? (
                  <Link
                    href={message.meta.actionResult.href}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:underline dark:text-white"
                  >
                    {message.meta.actionResult.hrefLabel || "Open"}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {message.role === "assistant" && message.meta?.suggestedActions?.length ? (
          <div className="ml-10 flex flex-wrap gap-1.5">
            {message.meta.suggestedActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onSuggestedAction(action)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
              >
                {action}
              </button>
            ))}
          </div>
        ) : null}

        {message.role === "assistant" && message.meta?.suggestedIssueIds?.length ? (
          <div className="ml-10 flex flex-wrap gap-1.5">
            {message.meta.suggestedIssueIds.map((issueId) => (
              <Link
                key={issueId}
                href={`/dashboard/issues/${issueId}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
              >
                View issue
                <ChevronRight className="h-2.5 w-2.5" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

export default function AgentCommandPanel() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const { open, closePanel, expanded, toggleExpanded } = useAgentCommandPanel();
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapContext, setBootstrapContext] = useState<AgentCommandContext | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const voiceSupported = useMemo(() => supportsVoiceInput(), []);
  const healthTone = deriveSystemHealthTone(criticalAlerts);

  const toneBorder =
    healthTone === "good"
      ? "border-emerald-200 dark:border-emerald-500/20"
      : healthTone === "warning"
        ? "border-amber-200 dark:border-amber-500/20"
        : "border-red-200 dark:border-red-500/20";

  const toneAccent =
    healthTone === "good"
      ? "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
      : healthTone === "warning"
        ? "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
        : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600";

  const toneText =
    healthTone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : healthTone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as PanelMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed.slice(-MAX_MESSAGES));
      }
    } catch {
      // Ignore corrupted cache.
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0 || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
    } catch {
      // Ignore storage failures.
    }
  }, [messages]);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!voiceOutputEnabled) {
      stopSpeaking();
      setSpeaking(false);
    }
  }, [voiceOutputEnabled]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const [status, nextIssues, nextActions, nextTimeline] = await Promise.all([
          api.agent.status(session.access_token),
          api.issues.list(session.access_token, { status: "active" }),
          api.agent.actions(session.access_token),
          api.timeline.list(session.access_token),
        ]);

        if (cancelled) {
          return;
        }

        const nextContext: AgentCommandContext = {
          active_issues: nextIssues.slice(0, 5).map((issue: Issue) => ({
            id: issue.id,
            title: issue.title,
            priority: issue.priority,
            report_count: issue.reportCount,
            trend_percent: issue.trendPercent,
          })),
          insights: [
            nextIssues[0] ? `${nextIssues[0].title} is currently the highest-pressure issue.` : null,
            status.latestBanner || null,
          ].filter(Boolean) as string[],
          suggestions: [
            nextIssues[0] ? `Review ${nextIssues[0].title}` : "Review active issues",
            "Run inspection",
            "Generate fix",
          ],
          recent_activity: nextActions.slice(0, 5).map((action) => ({
            id: action.id,
            title: action.reason,
            status: String((action.metadata?.status as string | undefined) || "info").toLowerCase(),
            action_type: action.actionType,
            created_at: action.createdAt,
          })),
          timeline_summary: summarizeTimeline(nextTimeline),
        };

        setBootstrapContext(nextContext);

        if (messages.length === 0) {
          setMessages([
            {
              id: "agent-command-intro",
              role: "assistant",
              createdAt: new Date().toISOString(),
              text: nextIssues[0]
                ? `I'm watching ${nextIssues[0].title} closely right now. Ask me what changed, what matters most, or tell me to act.`
                : "I'm ready. Ask me about issues, trends, inspections, or tell me to take action on your product.",
              meta: {
                answer: "",
                suggestedActions: STARTER_PROMPTS.slice(0, 3),
                suggestedIssueIds: nextIssues[0] ? [nextIssues[0].id] : [],
                confidence: "high",
                responseMode: "chat",
                detectedIntent: "bootstrap",
                systemContext: nextContext,
                actionResult: null,
                generatedAt: new Date().toISOString(),
                mode: status.state || "real",
              },
            },
          ]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "agent-load"));
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [messages.length, session?.access_token]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    if (!session?.access_token) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    setError(null);
    setLoading(true);
    setInput("");

    const userMessage: PanelMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage].slice(-MAX_MESSAGES));

    try {
      const response = await api.agent.chat(session.access_token, trimmed);
      setBootstrapContext(response.systemContext || bootstrapContext);

      const assistantMessage: PanelMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: response.answer,
        createdAt: response.generatedAt || new Date().toISOString(),
        meta: response,
      };
      setMessages((current) => [...current, assistantMessage].slice(-MAX_MESSAGES));

      if (voiceOutputEnabled) {
        const started = speakText(response.answer, {
          onStart: () => setSpeaking(true),
          onEnd: () => setSpeaking(false),
          onError: () => setSpeaking(false),
        });
        if (!started) {
          setSpeaking(false);
        }
      }
    } catch (err) {
      setError(toUserFacingError(err, "ai-helper"));
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = async () => {
    if (!voiceSupported || listening) {
      return;
    }
    setError(null);
    setListening(true);
    stopSpeaking();
    setSpeaking(false);

    try {
      const result = await startVoiceRecognition();
      if (result.text) {
        await sendMessage(result.text);
      }
    } catch (err) {
      setError(toUserFacingError(err, "ai-helper"));
    } finally {
      setListening(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.aside
          key="agent-panel"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className={cn(
            "relative z-20 hidden h-screen w-full shrink-0 flex-col border-l bg-white/98 backdrop-blur-xl lg:flex dark:bg-[#0a0a0a]/98",
            toneBorder,
            expanded ? "max-w-[52rem]" : "max-w-[28rem]"
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl border", toneBorder, toneText)}>
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Pulse AI</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                  {listening ? "Listening..." : speaking ? "Speaking..." : loading ? "Thinking..." : "Ready"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setVoiceOutputEnabled((current) => {
                    const next = !current;
                    if (!next) {
                      stopSpeaking();
                      setSpeaking(false);
                    }
                    return next;
                  })
                }
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                title={voiceOutputEnabled ? "Mute voice" : "Enable voice"}
              >
                {voiceOutputEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearConversation}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                title="Clear conversation"
              >
                <Eraser className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleExpanded}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                title={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={closePanel}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                title="Close panel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {bootstrapContext?.timeline_summary ? (
            <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2 dark:border-slate-800/50">
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400">
                {bootstrapContext.timeline_summary}
              </span>
            </div>
          ) : null}

          <div ref={containerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.length <= 1 ? (
              <div className="space-y-4 pb-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Ask Pulse AI anything</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    I can explain issues, run inspections, create fixes, and summarize your product health.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onSuggestedAction={(text) => void sendMessage(text)}
              />
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-white/[0.06] dark:text-slate-300">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-white/[0.03]">
                    <TypingDots />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200/80 px-4 py-3 dark:border-slate-800/80">
            {error ? (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  placeholder="Ask anything or give a command..."
                  rows={1}
                  className="min-h-[44px] max-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-white/[0.03] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-slate-800"
                  style={{ fieldSizing: "content" } as any}
                />
              </div>

              {voiceSupported ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleVoice()}
                  disabled={listening}
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-2xl border-slate-200 bg-white dark:border-slate-800 dark:bg-white/[0.03]",
                    listening ? toneText : ""
                  )}
                >
                  {listening ? <AudioLines className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
                </Button>
              ) : null}

              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className={cn("h-11 shrink-0 rounded-2xl border-0 px-4 text-white transition", toneAccent)}
              >
                {detectCommandMode(input) ? <WandSparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>{detectCommandMode(input) ? "Command mode" : "Chat mode"}</span>
              <span>Shift+Enter for new line</span>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
