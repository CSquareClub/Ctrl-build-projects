"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AgentConfidenceResult } from "@/lib/api";

interface AgentTrustPanelProps {
  confidence: AgentConfidenceResult;
}

function getConfidenceVariant(level: string) {
  if (level === "high") return "success" as const;
  if (level === "medium") return "secondary" as const;
  return "destructive" as const;
}

function getBehaviorMessage(level: string) {
  if (level === "high") {
    return {
      icon: Target,
      tone: "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10",
      text: "High confidence - action auto-applied",
    };
  }

  if (level === "medium") {
    return {
      icon: AlertTriangle,
      tone: "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10",
      text: "Suggested action - approval recommended",
    };
  }

  return {
    icon: ShieldAlert,
    tone: "text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10",
    text: "Low confidence - review before taking action",
  };
}

function getRiskLevel(confidence: AgentConfidenceResult) {
  const actionCountBase = Math.max(1, confidence.metrics.source_count);
  const patchRiskScore =
    confidence.metrics.frequency_count > 18
      ? 3
      : confidence.metrics.frequency_count > 8
        ? 2
        : 1;
  const totalScore = actionCountBase + patchRiskScore;

  if (totalScore <= 3) {
    return { label: "Low", variant: "success" as const };
  }

  if (totalScore <= 5) {
    return { label: "Medium", variant: "secondary" as const };
  }

  return { label: "High", variant: "destructive" as const };
}

export default function AgentTrustPanel({ confidence }: AgentTrustPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const behavior = getBehaviorMessage(confidence.confidence_level);
  const risk = getRiskLevel(confidence);
  const confidenceVariant = getConfidenceVariant(confidence.confidence_level);

  const reasoningPoints = [
    {
      icon: Activity,
      text: `Detected in ${confidence.metrics.frequency_count} similar feedback messages`,
    },
    {
      icon: BarChart3,
      text: `Observed across ${confidence.metrics.source_count} sources`,
    },
    {
      icon: Sparkles,
      text:
        confidence.metrics.similarity_score >= 0.7
          ? "Strong pattern match in user reports"
          : confidence.metrics.similarity_score >= 0.4
            ? "Moderate pattern match in user reports"
            : "Light pattern match in user reports",
    },
    {
      icon: Target,
      text: `Previously correct in ${Math.round(
        confidence.metrics.acceptance_rate * 100
      )}% similar cases`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger className="inline-flex">
              <Badge
                variant={confidenceVariant}
                className="rounded-full px-3 py-1 text-sm"
              >
                {confidence.confidence_score}% Confidence
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              How confident the system is in this decision
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>Risk Level:</span>
            <Badge variant={risk.variant}>{risk.label}</Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden"
          onClick={() => setExpanded((current) => !current)}
        >
          Why this decision?
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </Button>
      </div>

      <div className={`rounded-2xl border px-4 py-3 text-sm ${behavior.tone}`}>
        <div className="flex items-center gap-2">
          <behavior.icon className="h-4 w-4" />
          <span>{behavior.text}</span>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 sm:max-h-[500px] sm:opacity-100"
        }`}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#141414]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Why this decision?</h3>
          <div className="mt-4 space-y-3">
            {reasoningPoints.map((point) => (
              <div
                key={point.text}
                className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400"
              >
                <point.icon className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <p>{point.text}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
            System accuracy for this issue type:{" "}
            {Math.round(confidence.metrics.acceptance_rate * 100)}%
          </p>
        </div>
      </div>
    </div>
  );
}
