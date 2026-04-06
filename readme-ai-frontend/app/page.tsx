"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { InputSection } from "@/components/dashboard/input-section";
import { Terminal } from "@/components/dashboard/terminal";
import { MarkdownEditor } from "@/components/dashboard/markdown-editor";
import { PreviewPanel } from "@/components/dashboard/preview-panel";
import { StatsWidgets } from "@/components/dashboard/stats-widgets";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "analyzing" | "generating" | "complete">("idle");
  const [markdown, setMarkdown] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [repoName, setRepoName] = useState("username/repository");

  const handleGenerate = useCallback(async (localPath: string) => {
    // 1. Setup UI State
    setIsLoading(true);
    setShowEditor(false);
    setStage("analyzing");
    setRepoName(localPath.split("/").pop() || "repository");

    try {
      // 2. Connect to your FastAPI Backend
      const response = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: localPath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate README");
      }

      setStage("generating");
      const data = await response.json();

      // 3. Handle Success
      if (data.status === "success") {
        setMarkdown(data.readme);
        setStage("complete");
        setShowEditor(true);
        
        if (data.metadata?.warnings?.length > 0) {
          toast({
            title: "README Generated with Suggestions",
            description: data.metadata.warnings[0],
            variant: "default",
          });
        }
      }
    } catch (error: any) {
      // 4. Handle Errors (Ollama offline, Path not found, etc.)
      setStage("idle");
      toast({
        title: "Generation Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-border/30 glass">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">README Engine</h1>
              <p className="text-sm text-muted-foreground">Powered by Qwen2.5-Coder</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">API Status</p>
                <p className="text-sm font-medium flex items-center gap-1 justify-end" style={{ color: 'var(--neon-green)' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--neon-green)' }} />
                  Connected to Localhost:8000
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-[1800px] mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <InputSection onGenerate={handleGenerate} isLoading={isLoading} />
              </div>
              <div className="h-64 lg:h-auto">
                <Terminal isActive={isLoading} stage={stage} />
              </div>
            </div>

            {(showEditor || stage !== "idle") && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[500px]">
                <div className="h-[500px]">
                  <MarkdownEditor content={markdown} onChange={setMarkdown} />
                </div>
                <div className="h-[500px]">
                  <PreviewPanel content={markdown} repoName={repoName} />
                </div>
              </div>
            )}

            {stage === "idle" && !showEditor && (
              <div className="glass-card rounded-2xl p-12 text-center">
                <h3 className="text-xl font-semibold mb-2">Local Analysis Mode</h3>
                <p className="text-muted-foreground">Enter the absolute path to your local project folder.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}