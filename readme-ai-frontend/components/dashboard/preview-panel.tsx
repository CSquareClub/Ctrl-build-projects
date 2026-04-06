"use client";

import { Eye, Github, ExternalLink, Star, GitFork, Eye as EyeIcon } from "lucide-react";

interface PreviewPanelProps {
  content: string;
  repoName?: string;
}

function parseMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block handling
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockContent = [];
      } else {
        elements.push(
          <div key={`code-${i}`} className="my-4 rounded-lg overflow-hidden bg-secondary/50 border border-border/50">
            {codeBlockLang && (
              <div className="px-4 py-2 bg-secondary/50 border-b border-border/50 text-xs text-muted-foreground font-mono">
                {codeBlockLang}
              </div>
            )}
            <pre className="p-4 overflow-x-auto">
              <code className="text-sm font-mono" style={{ color: 'var(--neon-cyan)' }}>
                {codeBlockContent.join("\n")}
              </code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-3xl font-bold text-foreground mt-6 mb-4 pb-2 border-b border-border/50">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-2xl font-semibold text-foreground mt-5 mb-3 pb-2 border-b border-border/30">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xl font-semibold text-foreground mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    }
    // Badges (simplified)
    else if (line.includes("![") && line.includes("badge")) {
      const badges = line.match(/!\[([^\]]*)\]\([^)]+\)/g) || [];
      elements.push(
        <div key={i} className="flex flex-wrap gap-2 my-2">
          {badges.map((_, idx) => (
            <span
              key={idx}
              className="px-3 py-1 text-xs font-medium rounded-full"
              style={{ background: 'oklch(0.7 0.2 280 / 0.2)', color: 'var(--neon-purple)', border: '1px solid oklch(0.7 0.2 280 / 0.3)' }}
            >
              badge
            </span>
          ))}
        </div>
      );
    }
    // Lists
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="text-muted-foreground ml-6 list-disc">
          {line.slice(2)}
        </li>
      );
    }
    // Inline code
    else if (line.includes("`") && !line.startsWith("```")) {
      const parts = line.split(/`([^`]+)`/);
      elements.push(
        <p key={i} className="text-muted-foreground my-2 leading-relaxed">
          {parts.map((part, idx) =>
            idx % 2 === 1 ? (
              <code key={idx} className="px-1.5 py-0.5 bg-secondary rounded text-sm font-mono" style={{ color: 'var(--neon-cyan)' }}>
                {part}
              </code>
            ) : (
              part
            )
          )}
        </p>
      );
    }
    // Empty lines
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular text
    else {
      elements.push(
        <p key={i} className="text-muted-foreground my-2 leading-relaxed">
          {line}
        </p>
      );
    }
  }

  return elements;
}

export function PreviewPanel({ content, repoName = "username/repository" }: PreviewPanelProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col">
      {/* GitHub-style Header */}
      <div className="px-4 py-3 border-b border-border/30 bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium" style={{ color: 'var(--neon-cyan)' }}>{repoName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground">
              Public
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              <span>124.2k</span>
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              <span>28.5k</span>
            </span>
            <span className="flex items-center gap-1">
              <EyeIcon className="w-3.5 h-3.5" />
              <span>3.2k</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-4 border-b border-border/30 bg-secondary/20">
        <div className="flex items-center gap-1">
          <button className="px-4 py-2 text-sm font-medium text-foreground border-b-2 -mb-px" style={{ borderColor: 'var(--neon-purple)' }}>
            <Eye className="w-4 h-4 inline mr-2" />
            Preview
          </button>
          <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Raw
          </button>
          <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Blame
          </button>
          <div className="flex-1" />
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 p-6 overflow-y-auto bg-background/50">
        <article className="prose prose-invert max-w-none">
          {parseMarkdown(content)}
        </article>
      </div>
    </div>
  );
}
