"use client";

import type { ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info,
  Sparkles,
  Cable,
  LayoutDashboard,
  Bot,
  History,
  Package,
  CheckCircle2,
  X,
  Globe2,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GuideStep = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  routeHint?: string;
};

export const guideSteps: GuideStep[] = [
  {
    title: "Welcome to AgenticPulse",
    description:
      "AgenticPulse is your product intelligence system. It listens to feedback, detects issues, inspects experiences, and helps your team move from signal to action without losing context.",
    icon: Sparkles,
    routeHint: "Start with the left sidebar and top navigation",
  },
  {
    title: "Connect your data sources",
    description:
      "Open Data Sources to connect Gmail, Outlook, social listening, reviews, inboxes, and the SDK. Every connected source contributes evidence, context, and health signals to the rest of the system.",
    icon: Cable,
    routeHint: "Sidebar → Data Sources",
  },
  {
    title: "Set up website inspection",
    description:
      "Website Inspection lets AgenticPulse watch critical product flows, run guided checks, and turn failures into readable inspection reports instead of making you guess what broke.",
    icon: Globe2,
    routeHint: "Sidebar → Website Inspection",
  },
  {
    title: "Set up mobile inspection",
    description:
      "Mobile Inspection gives the system a way to inspect your application on cloud devices, monitor key journeys, and surface app-specific failures with the same structure as web inspections.",
    icon: Smartphone,
    routeHint: "Sidebar → Mobile Inspection",
  },
  {
    title: "Use the Control Room",
    description:
      "The Control Room gives you the live product pulse: issue clusters, source health, alerts, trends, and operational pressure. It is the fastest way to understand what matters right now.",
    icon: LayoutDashboard,
    routeHint: "Sidebar → Control Room",
  },
  {
    title: "Track inspections and decisions",
    description:
      "Command Center brings inspections, signals, predictions, and decisions into one operational view so you can see what the agent is monitoring, why it reacted, and what happened next.",
    icon: Sparkles,
    routeHint: "Sidebar → Command Center",
  },
  {
    title: "Open Pulse AI",
    description:
      "Pulse AI is your command interface. Ask what changed, what to fix first, why a decision happened, or which issue deserves attention. It works on the same live system context as the rest of the dashboard.",
    icon: Bot,
    routeHint: "Top bar → Robot icon",
  },
  {
    title: "Install the SDK",
    description:
      "The SDK captures behavior signals, friction, and smart feedback prompts from your product experience. Those signals feed directly into the same issue and insight pipeline as the rest of your sources.",
    icon: Package,
    routeHint: "Sidebar → SDK Integration",
  },
  {
    title: "Review timeline and reports",
    description:
      "Timeline helps you follow issue growth, inspect spikes, and read weekly reports with enough context to explain what changed across the product and why.",
    icon: History,
    routeHint: "Sidebar → Timeline",
  },
  {
    title: "You are ready",
    description:
      "Once sources are connected and inspections are configured, AgenticPulse keeps listening in the background, surfaces what needs attention, and helps your team take action with confidence.",
    icon: CheckCircle2,
    routeHint: "Reopen this guide anytime from the sidebar",
  },
];

interface GuideOverlayProps {
  open: boolean;
  stepIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onSelectStep: (index: number) => void;
}

export default function GuideOverlay({
  open,
  stepIndex,
  onClose,
  onNext,
  onPrevious,
  onSkip,
  onSelectStep,
}: GuideOverlayProps) {
  const step = guideSteps[stepIndex];

  if (!step) {
    return null;
  }

  const Icon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === guideSteps.length - 1;

  return (
    <AnimatePresence>
      {open ? (
        <div className="pointer-events-none fixed inset-0 z-[80]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="pointer-events-auto absolute inset-4 flex items-center justify-center md:inset-6"
          >
            <div className="relative w-full max-w-[490px] overflow-hidden rounded-3xl border border-border bg-background shadow-xl">
              <div className="p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
                        Product Guide
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Step {stepIndex + 1} of {guideSteps.length}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-border bg-background p-2 text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                    aria-label="Close guide"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-5">
                  <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                  {step.routeHint ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <ArrowRight className="h-3.5 w-3.5" />
                      {step.routeHint}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {guideSteps.map((guideStep, index) => (
                      <button
                        key={guideStep.title}
                        type="button"
                        onClick={() => onSelectStep(index)}
                        className={cn(
                          "h-2.5 rounded-full transition-all",
                          index === stepIndex
                            ? "w-7 bg-emerald-500"
                            : "w-2.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500"
                        )}
                        aria-label={`Go to step ${index + 1}`}
                      />
                    ))}
                  </div>

                  <div className="hidden items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:inline-flex">
                    <Info className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                    Follow the hints to learn the layout faster
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onSkip}
                    className="rounded-xl"
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onPrevious}
                    disabled={isFirst}
                    className="rounded-xl disabled:opacity-40"
                  >
                    Previous
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={isLast ? onClose : onNext}
                  className="rounded-xl px-5"
                >
                  {isLast ? "Done" : "Next"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
