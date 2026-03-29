"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type AiChatResponse } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";

type ChatMessage =
  | {
      id: string;
      role: "assistant";
      text: string;
      meta?: AiChatResponse;
    }
  | {
      id: string;
      role: "user";
      text: string;
    };

const starterPrompts = [
  "What issue should I fix first today?",
  "Summarize the highest-risk problems from the live data.",
  "Which team should act first and why?",
];

export default function AiHelperPage() {
  const { session } = useAuth();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "I can read your live Product Pulse data and turn it into next actions. Ask me what needs attention, what is trending, or what the team should do first.",
    },
  ]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();

    if (!session?.access_token) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    if (!trimmed) {
      setError("Please type a question for AI Helper.");
      return;
    }

    setError(null);
    setLoading(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: trimmed },
    ]);
    setInput("");

    try {
      const response = await api.ai.chat(session.access_token, trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: response.answer,
          meta: response,
        },
      ]);
    } catch (err) {
      setError(toUserFacingError(err, "ai-helper"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await sendMessage(input);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_60px_rgba(15,23,42,0.22)]">
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Helper</h2>
              <p className="mt-1 text-sm text-slate-400">
                Chat with a Groq-powered assistant that reads your live Product Pulse
                database snapshot before replying.
              </p>
            </div>
          </div>
        </div>

        <div ref={containerRef} className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "ml-auto max-w-[85%]" : "max-w-[88%]"}
            >
              <div
                className={
                  message.role === "user"
                    ? "rounded-3xl rounded-br-md bg-indigo-500 px-4 py-3 text-sm text-white"
                    : "rounded-3xl rounded-bl-md border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
                }
              >
                {message.text}
              </div>

              {message.role === "assistant" && message.meta && (
                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                    Suggested Actions
                  </div>
                  <div className="space-y-2">
                    {message.meta.suggestedActions.map((action, index) => (
                      <p key={`${message.id}-${index}`} className="text-sm text-slate-300">
                        {index + 1}. {action}
                      </p>
                    ))}
                  </div>
                  {message.meta.suggestedIssueIds.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.meta.suggestedIssueIds.map((issueId) => (
                        <Link
                          key={issueId}
                          href={`/dashboard/issues/${issueId}`}
                          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition hover:border-indigo-400 hover:text-white"
                        >
                          Open issue
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-[88%] rounded-3xl rounded-bl-md border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                AI Helper is reading your latest data...
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 p-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <Input
              required
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask what matters most, what to fix first, or what is trending..."
              className="h-12 rounded-2xl border-slate-800 bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim() || !session?.access_token}
              className="h-12 rounded-2xl bg-[linear-gradient(90deg,#61d5da_0%,#7599f8_38%,#b04cf2_70%,#eb2ee9_100%)] text-white hover:brightness-105"
            >
              <CornerDownLeft className="mr-2 h-4 w-4" />
              Send
            </Button>
          </form>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.22)]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Quick Prompts
          </h3>
          <div className="mt-4 space-y-3">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage(prompt)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-indigo-500/40 hover:text-white"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.22)]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            What It Can Do
          </h3>
          <div className="mt-4 space-y-3 text-sm text-slate-400">
            <p>Read your current issue records and connected sources.</p>
            <p>Explain what changed and which team should act first.</p>
            <p>Point you to the most relevant issue cards to inspect next.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
