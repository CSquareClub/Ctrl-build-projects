"use client";

import { Sparkles, RefreshCw, Badge, Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const aiTools = [
  { icon: Sparkles, label: "AI Summary", color: "text-neon-purple" },
  { icon: RefreshCw, label: "Rewrite", color: "text-neon-cyan" },
  { icon: Badge, label: "Add Badges", color: "text-neon-green" },
];

export function MarkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const [copied, setCopied] = useState(false);
  const [activeToolIndex, setActiveToolIndex] = useState<number | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToolClick = (index: number) => {
    setActiveToolIndex(index);
    // Simulate AI processing
    setTimeout(() => setActiveToolIndex(null), 1500);
  };

  const lineCount = content.split("\n").length;

  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">README.md</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'oklch(0.7 0.2 280 / 0.2)', color: 'var(--neon-purple)' }}>
            Markdown
          </span>
        </div>
        <div className="flex items-center gap-2">
          {aiTools.map((tool, index) => (
            <button
              key={tool.label}
              onClick={() => handleToolClick(index)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                "glass hover:bg-secondary/50",
                activeToolIndex === index && "animate-pulse"
              )}
            >
              <tool.icon
                className={cn(
                  "w-3.5 h-3.5",
                  activeToolIndex === index ? tool.color : "text-muted-foreground"
                )}
              />
              <span className="text-muted-foreground hidden lg:inline">{tool.label}</span>
            </button>
          ))}
          <div className="w-px h-5 bg-border/50 mx-1" />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium glass hover:bg-secondary/50 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-neon-green" />
                <span className="text-neon-green hidden lg:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground hidden lg:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div className="w-12 flex-shrink-0 bg-secondary/20 border-r border-border/30 py-4 text-right pr-3 select-none overflow-hidden">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="text-xs text-muted-foreground/50 font-mono leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 p-4 bg-transparent text-foreground font-mono text-sm leading-6 resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      {/* Editor Footer */}
      <div className="px-4 py-2 border-t border-border/30 bg-secondary/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">
            {lineCount} lines • {content.length} characters
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--neon-green)' }} />
            Auto-save enabled
          </span>
        </div>
      </div>
    </div>
  );
}
