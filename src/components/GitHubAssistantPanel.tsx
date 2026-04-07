"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  Mic,
  Send,
  Square,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  api,
  type CodeInsightResult,
  type GitHubRepository,
  type IssueDetail,
} from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import {
  speakText,
  startVoiceRecognition,
  stopSpeaking,
  supportsVoiceInput,
} from "@/services/voiceClient";

export interface GitHubAssistantPrompt {
  message: string;
  action?: string;
  filePath?: string;
}

interface GitHubAssistantPanelProps {
  token: string | null | undefined;
  issue: IssueDetail | null;
  analysis: CodeInsightResult | null;
  repositoryOverride?: Pick<GitHubRepository, "owner" | "name"> | null;
  incomingPrompt?: GitHubAssistantPrompt | null;
  onPromptHandled?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const QUICK_ACTIONS: Array<{ label: string; action: string; message: string }> = [
  {
    label: "Explain issue",
    action: "explain_issue",
    message: "Explain this issue in the context of the selected repository.",
  },
  {
    label: "Explain patch",
    action: "explain_patch",
    message: "Explain what this patch changes and why it helps.",
  },
  {
    label: "Suggest fix",
    action: "suggest_fix",
    message: "Suggest the safest fix for this issue using the current code context.",
  },
  {
    label: "What should I do?",
    action: "next_action",
    message: "What should I do next to debug and validate this issue quickly?",
  },
];

export default function GitHubAssistantPanel({
  token,
  issue,
  analysis,
  repositoryOverride,
  incomingPrompt,
  onPromptHandled,
}: GitHubAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const voiceSupported = useMemo(() => supportsVoiceInput(), []);

  useEffect(() => {
    if (!issue) {
      setMessages([]);
      setInput("");
      setError(null);
      return;
    }

    setMessages([
      {
        id: `assistant-intro-${issue.id}`,
        role: "assistant",
        text: `I’m watching ${issue.title} against the selected GitHub repository. Ask about the issue, the patch, or a specific file and I’ll stay grounded in the current code context.`,
      },
    ]);
    setInput("");
    setError(null);
  }, [issue]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const sendMessage = useCallback(async (
    message: string,
    options?: { action?: string; filePath?: string; speak?: boolean }
  ) => {
    if (!token || !issue || !message.trim()) {
      return;
    }

    const trimmed = message.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await api.codeAgent.chat(token, issue.id, {
        message: trimmed,
        action: options?.action,
        filePath: options?.filePath,
        repoOwner: repositoryOverride?.owner || analysis?.repository.owner,
        repoName: repositoryOverride?.name || analysis?.repository.name,
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: response.answer,
        },
      ]);

        if (options?.speak) {
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
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setLoading(false);
    }
  }, [analysis?.repository.name, analysis?.repository.owner, issue, repositoryOverride?.name, repositoryOverride?.owner, token]);

  useEffect(() => {
    if (!incomingPrompt || !issue || !token) {
      return;
    }

    void sendMessage(incomingPrompt.message, {
      action: incomingPrompt.action,
      filePath: incomingPrompt.filePath,
    });
    onPromptHandled?.();
  }, [incomingPrompt, issue, onPromptHandled, sendMessage, token]);

  const handleVoice = async () => {
    if (!voiceSupported || listening) {
      return;
    }

    setListening(true);
    setError(null);
    try {
      const result = await startVoiceRecognition();
      setInput(result.text);
      if (result.text.trim()) {
        await sendMessage(result.text, { speak: true });
      }
    } catch (err) {
      setError(toUserFacingError(err, "github-code-insight"));
    } finally {
      setListening(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800/90 px-5 pb-5 pt-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-700 dark:text-slate-100">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Code Agent</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Repo-aware debugging help for the selected issue, files, and patch.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              disabled={!issue || loading}
              onClick={() =>
                void sendMessage(action.message, {
                  action: action.action,
                })
              }
            >
              <WandSparkles className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>

        <div
          ref={listRef}
          className="max-h-[520px] min-h-[280px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-red-600 text-white"
                    : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-200"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-red-600 dark:text-red-400" />
                Thinking through the repo context...
              </div>
            </div>
          ) : null}
        </div>

        {issue ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4 text-sm text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-800 dark:text-slate-200">{issue.title}</p>
            <p className="mt-2">
              {analysis
                ? `Using ${analysis.files.length} relevant file snippets and the current patch diff.`
                : "Issue context is ready. Generate a suggestion to unlock patch-aware answers."}
            </p>
            {analysis?.repository ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">
                  {analysis.repository.owner}/{analysis.repository.name}
                </Badge>
                <Badge variant="outline">
                  {analysis.totalLines} lines reviewed
                </Badge>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4 text-sm text-slate-500 dark:text-slate-400">
            Select an issue to start a contextual debugging conversation.
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#161616]/90 p-3 backdrop-blur">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the issue, patch, or a file..."
              className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(input);
                }
              }}
            />
            {voiceSupported ? (
              <Button
                variant="secondary"
                size="icon"
                disabled={!issue || listening}
                onClick={() => void handleVoice()}
              >
                {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="icon"
              disabled={!speaking}
              onClick={() => {
                stopSpeaking();
                setSpeaking(false);
              }}
            >
              {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button disabled={!issue || loading || !input.trim()} onClick={() => void sendMessage(input)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
