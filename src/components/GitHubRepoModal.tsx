"use client";

import { useMemo, useState } from "react";
import { Check, GitBranch, Lock, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { GitHubRepository } from "@/lib/api";

interface GitHubRepoModalProps {
  open: boolean;
  repos: GitHubRepository[];
  loading: boolean;
  saving: boolean;
  selectedRepoFullName?: string | null;
  error?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onSave: (repo: GitHubRepository) => void;
}

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Updated recently";
  }

  return `Updated ${parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function GitHubRepoModal({
  open,
  repos,
  loading,
  saving,
  selectedRepoFullName,
  error,
  onClose,
  onRefresh,
  onSave,
}: GitHubRepoModalProps) {
  const [query, setQuery] = useState("");
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  const filteredRepos = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return repos;
    }

    return repos.filter((repo) =>
      [repo.name, repo.fullName, repo.owner].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [query, repos]);

  const activeSelection = pendingSelection ?? selectedRepoFullName ?? null;

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              <GitBranch className="h-4 w-4" />
              Primary Repository
            </div>
            <h2 className="text-xl font-semibold text-white">
              Choose the primary codebase Product Pulse should inspect
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              We only search a few relevant files per issue and always open a pull
              request instead of writing to your main branch.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search repositories"
              className="h-11 rounded-2xl border-slate-800 bg-slate-950 pl-11 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-slate-600 focus-visible:ring-2 focus-visible:ring-slate-500/30"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
                  />
                ))}
              </div>
            ) : filteredRepos.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {filteredRepos.map((repo) => {
                  const isSelected = activeSelection === repo.fullName;

                  return (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => setPendingSelection(repo.fullName)}
                      className={`flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition ${
                        isSelected
                          ? "bg-slate-800/80"
                          : "hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {repo.fullName}
                          </p>
                          <Badge
                            variant={repo.private ? "secondary" : "outline"}
                            className="gap-1"
                          >
                            {repo.private ? <Lock className="h-3 w-3" /> : null}
                            {repo.private ? "Private" : "Public"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {formatUpdatedAt(repo.updatedAt)}
                        </p>
                      </div>
                      {isSelected ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-slate-400">
                No repositories matched this search.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-5">
          <Button variant="ghost" onClick={onRefresh} disabled={loading || saving}>
            Refresh List
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const repo = repos.find((entry) => entry.fullName === activeSelection);
                if (repo) {
                  onSave(repo);
                }
              }}
              disabled={!activeSelection || saving}
            >
              {saving ? "Saving..." : "Set as Primary Repo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
