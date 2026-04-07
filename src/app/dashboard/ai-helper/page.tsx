"use client";

import { useEffect } from "react";
import { Bot } from "lucide-react";
import { useAgentCommandPanel } from "@/providers/AgentCommandPanelProvider";

export default function AiHelperPage() {
  const { openPanel } = useAgentCommandPanel();

  useEffect(() => {
    openPanel();
  }, [openPanel]);

  return (
    <section className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111111] p-8 md:p-10">
      <div className="flex max-w-2xl items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-white/[0.03] dark:text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            Pulse AI
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Your command panel is open on the right.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Use the robot icon in the top-right corner from anywhere in the dashboard to ask questions, issue commands, and keep your product intelligence close without leaving the page you are on.
          </p>
        </div>
      </div>
    </section>
  );
}
