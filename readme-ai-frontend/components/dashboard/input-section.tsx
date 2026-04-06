"use client";

import { useState } from "react";
import { FolderCode, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputSectionProps {
  onGenerate: (url: string) => void;
  isLoading: boolean;
}

export function InputSection({ onGenerate, isLoading }: InputSectionProps) {
  const [path, setPath] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim()) {
      onGenerate(path);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 transition-all duration-300">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--neon-green)' }} />
          Local Repository Path
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide the absolute path to your project (e.g., /Users/name/projects/my-app)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className={cn("relative rounded-xl transition-all duration-300", isFocused && "glow-purple")}>
          <div className="flex items-center glass rounded-xl overflow-hidden">
            <div className="flex items-center justify-center w-14 h-14">
              <FolderCode className="w-5 h-5" style={{ color: isFocused ? 'var(--neon-purple)' : undefined }} />
            </div>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="/absolute/path/to/your/repo"
              className="flex-1 h-14 bg-transparent text-foreground focus:outline-none font-mono text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !path.trim()}
              className="h-10 px-6 mx-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isLoading ? "Generating..." : "Generate README"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}