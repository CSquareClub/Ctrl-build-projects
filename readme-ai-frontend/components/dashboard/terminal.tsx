"use client";

import { useEffect, useState } from "react";
import { Terminal as TerminalIcon, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  isActive: boolean;
  stage: "idle" | "analyzing" | "generating" | "complete";
}

const logs = {
  idle: [
    { text: "$ readme-ai --version", type: "command" },
    { text: "v2.4.1", type: "output" },
    { text: "$ Awaiting repository input...", type: "info" },
  ],
  analyzing: [
    { text: "$ readme-ai analyze --repo", type: "command" },
    { text: "→ Connecting to GitHub API...", type: "info", delay: 0 },
    { text: "✓ Repository found", type: "success", delay: 800 },
    { text: "→ Fetching repository metadata...", type: "info", delay: 1200 },
    { text: "✓ Metadata extracted", type: "success", delay: 2000 },
    { text: "→ Analyzing file structure...", type: "info", delay: 2400 },
    { text: "  ├── package.json", type: "tree", delay: 2800 },
    { text: "  ├── tsconfig.json", type: "tree", delay: 3000 },
    { text: "  ├── src/", type: "tree", delay: 3200 },
    { text: "  └── tests/", type: "tree", delay: 3400 },
    { text: "✓ Structure analysis complete", type: "success", delay: 3800 },
    { text: "→ Extracting dependencies...", type: "info", delay: 4200 },
  ],
  generating: [
    { text: "→ Initializing AI model...", type: "info", delay: 0 },
    { text: "✓ Model loaded: Qwen2.5-Coder", type: "success", delay: 600 },
    { text: "→ Generating README sections...", type: "info", delay: 1000 },
    { text: "  [████████░░░░░░░░] 50% - Features", type: "progress", delay: 1500 },
    { text: "  [████████████░░░░] 75% - Installation", type: "progress", delay: 2200 },
    { text: "  [████████████████] 100% - Complete", type: "progress", delay: 3000 },
    { text: "✓ README generation complete!", type: "success", delay: 3500 },
  ],
  complete: [
    { text: "✓ All operations completed successfully", type: "success", delay: 0 },
    { text: "→ README ready for preview and editing", type: "info", delay: 300 },
  ],
};

export function Terminal({ isActive, stage }: TerminalProps) {
  const [visibleLogs, setVisibleLogs] = useState<typeof logs.idle>([]);
  const [currentStage, setCurrentStage] = useState<keyof typeof logs>("idle");

  useEffect(() => {
    if (stage === "idle" && !isActive) {
      setVisibleLogs(logs.idle);
      return;
    }

    if (stage !== currentStage) {
      setCurrentStage(stage);
      const stageLogs = logs[stage] || [];
      setVisibleLogs([]);

      stageLogs.forEach((log, index) => {
        const delay = log.delay ?? index * 200;
        setTimeout(() => {
          setVisibleLogs((prev) => [...prev, log]);
        }, delay);
      });
    }
  }, [stage, isActive, currentStage]);

  const getLogStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case "command":
        return { color: 'var(--neon-cyan)' };
      case "success":
        return { color: 'var(--neon-green)' };
      case "info":
        return { color: 'var(--muted-foreground)' };
      case "tree":
        return { color: 'var(--muted-foreground)', opacity: 0.7 };
      case "progress":
        return { color: 'var(--neon-purple)' };
      case "output":
        return { color: 'var(--foreground)', opacity: 0.8 };
      default:
        return { color: 'var(--foreground)' };
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/30">
        <div className="flex items-center gap-2">
          <Circle className="w-3 h-3 fill-red-500 text-red-500" />
          <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
          <Circle className="w-3 h-3 fill-green-500 text-green-500" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TerminalIcon className="w-3.5 h-3.5" />
          <span className="font-mono">readme-ai-console</span>
        </div>
        <div
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            isActive && "animate-pulse"
          )}
          style={{ background: isActive ? 'var(--neon-green)' : 'var(--muted-foreground)' }}
        />
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-4 font-mono text-sm overflow-y-auto bg-background/50">
        <div className="space-y-1">
          {visibleLogs.map((log, index) => (
            <div
              key={index}
              className="animate-fade-in-up"
              style={{ ...getLogStyle(log.type), animationDelay: `${index * 50}ms` }}
            >
              {log.text}
            </div>
          ))}
          {isActive && stage !== "complete" && (
            <span className="inline-block w-2 h-4 cursor-blink" style={{ background: 'var(--neon-cyan)' }} />
          )}
        </div>
      </div>

      {/* Terminal Footer */}
      <div className="px-4 py-2 border-t border-border/30 bg-secondary/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-mono">
            {stage === "idle" && "Ready"}
            {stage === "analyzing" && "Analyzing repository..."}
            {stage === "generating" && "Generating README..."}
            {stage === "complete" && "Complete"}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: stage === "complete" 
                ? 'oklch(0.8 0.2 140 / 0.2)' 
                : stage !== "idle" 
                ? 'oklch(0.7 0.2 280 / 0.2)' 
                : 'var(--secondary)',
              color: stage === "complete" 
                ? 'var(--neon-green)' 
                : stage !== "idle" 
                ? 'var(--neon-purple)' 
                : 'var(--muted-foreground)'
            }}
          >
            {stage.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
