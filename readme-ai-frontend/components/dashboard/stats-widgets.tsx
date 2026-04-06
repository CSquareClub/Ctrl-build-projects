"use client";

import { Download, Copy, FileText, Check, Star, GitFork, AlertCircle, Code } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface StatsWidgetsProps {
  repoData: {
    stars: number;
    forks: number;
    issues: number;
    languages: { name: string; percentage: number; color: string }[];
  };
  markdownContent: string;
}

export function StatsWidgets({ repoData, markdownContent }: StatsWidgetsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Language Breakdown */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-4 h-4" style={{ color: 'var(--neon-purple)' }} />
          <h3 className="text-sm font-medium text-foreground">Languages</h3>
        </div>
        <div className="space-y-3">
          {repoData.languages.map((lang) => (
            <div key={lang.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: lang.color }}
                  />
                  {lang.name}
                </span>
                <span className="font-mono text-foreground">{lang.percentage}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${lang.percentage}%`,
                    backgroundColor: lang.color,
                    boxShadow: `0 0 10px ${lang.color}`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Repo Stats */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4" style={{ color: 'var(--neon-cyan)' }} />
          <h3 className="text-sm font-medium text-foreground">Repository Stats</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="glass p-3 rounded-xl text-center">
            <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">
              {repoData.stars >= 1000
                ? `${(repoData.stars / 1000).toFixed(1)}k`
                : repoData.stars}
            </p>
            <p className="text-xs text-muted-foreground">Stars</p>
          </div>
          <div className="glass p-3 rounded-xl text-center">
            <GitFork className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--neon-cyan)' }} />
            <p className="text-lg font-bold text-foreground">
              {repoData.forks >= 1000
                ? `${(repoData.forks / 1000).toFixed(1)}k`
                : repoData.forks}
            </p>
            <p className="text-xs text-muted-foreground">Forks</p>
          </div>
          <div className="glass p-3 rounded-xl text-center">
            <AlertCircle className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--neon-green)' }} />
            <p className="text-lg font-bold text-foreground">{repoData.issues}</p>
            <p className="text-xs text-muted-foreground">Issues</p>
          </div>
        </div>
      </div>

      {/* Export Widget */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4" style={{ color: 'var(--neon-green)' }} />
          <h3 className="text-sm font-medium text-foreground">Export README</h3>
        </div>
        <div className="space-y-3">
          <button
            onClick={handleDownload}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 text-background",
              "hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] glow-purple"
            )}
            style={{ background: 'linear-gradient(to right, var(--neon-purple), var(--neon-cyan))' }}
          >
            <Download className="w-4 h-4" />
            Download .md File
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300",
              "glass hover:bg-secondary/50 text-foreground border border-border/50"
            )}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-neon-green" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Raw Markdown
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
