import { useState, useEffect, useMemo } from 'react';
import { Star, GitFork, ExternalLink, Zap, ZapOff, RefreshCw, Download, Search, X } from 'lucide-react';
import type { Repository } from '../types';
import { cn } from '../utils/cn';
import { getRepos, importRepos, watchRepo, unwatchRepo } from '../lib/api';

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-500',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-blue-400',
  Rust: 'bg-orange-600',
  Go: 'bg-cyan-500',
  CSS: 'bg-purple-500',
};

export function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // Track which repo ids are currently toggling (for per-button spinner)
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRepos()
      .then(setRepos)
      .catch(() => setError('Failed to load repositories'))
      .finally(() => setLoading(false));
  }, []);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const imported = await importRepos();
      setRepos(imported);
    } catch {
      setError('Failed to import repositories from GitHub');
    } finally {
      setImporting(false);
    }
  };

  const toggleMonitor = async (id: string, currently: boolean) => {
    // 1. Optimistic update — instant UI feedback, no waiting
    setRepos((prev) =>
      prev.map((r) => r.id === id ? { ...r, isMonitored: !currently, webhookActive: !currently } : r)
    );
    setToggling((prev) => new Set(prev).add(id));

    try {
      if (currently) {
        await unwatchRepo(id);
      } else {
        await watchRepo(id);
      }
    } catch {
      // 2. Revert on failure
      setRepos((prev) =>
        prev.map((r) => r.id === id ? { ...r, isMonitored: currently, webhookActive: currently } : r)
      );
      setError('Failed to update monitoring status');
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return repos;
    const q = query.toLowerCase();
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.language?.toLowerCase().includes(q)
    );
  }, [repos, query]);

  const monitored = filtered.filter((r) => r.isMonitored);
  const unmonitored = filtered.filter((r) => !r.isMonitored);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Repositories</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {repos.filter((r) => r.isMonitored).length} of {repos.length} repositories monitored
          </p>
        </div>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors disabled:opacity-60"
        >
          {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {importing ? 'Importing…' : 'Import from GitHub'}
        </button>
      </div>

      {/* Search bar */}
      {repos.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, language, description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400 ml-3 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-600 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading repositories…
        </div>
      )}

      {!loading && repos.length === 0 && !error && (
        <div className="text-center py-16 text-zinc-600 text-sm">
          No repositories yet.{' '}
          <button onClick={handleImport} className="text-violet-400 hover:underline">Import from GitHub</button>{' '}
          to get started.
        </div>
      )}

      {!loading && repos.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-zinc-600 text-sm">
          No repositories match <span className="text-zinc-400">"{query}"</span>
        </div>
      )}

      {/* Monitored */}
      {monitored.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Monitored <span className="text-zinc-700 font-normal normal-case">({monitored.length})</span>
          </h3>
          <div className="space-y-3">
            {monitored.map((repo) => (
              <RepoCard key={repo.id} repo={repo} toggling={toggling.has(repo.id)} onToggle={toggleMonitor} />
            ))}
          </div>
        </section>
      )}

      {/* Not monitored */}
      {unmonitored.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Not Monitored <span className="text-zinc-700 font-normal normal-case">({unmonitored.length})</span>
          </h3>
          <div className="space-y-3">
            {unmonitored.map((repo) => (
              <RepoCard key={repo.id} repo={repo} toggling={toggling.has(repo.id)} onToggle={toggleMonitor} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RepoCard({
  repo,
  toggling,
  onToggle,
}: {
  repo: Repository;
  toggling: boolean;
  onToggle: (id: string, currently: boolean) => void;
}) {
  const dotColor = LANGUAGE_COLORS[repo.language] ?? 'bg-zinc-500';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 hover:border-zinc-700 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-zinc-100 hover:text-violet-300 transition-colors flex items-center gap-1"
          >
            {repo.fullName}
            <ExternalLink className="w-3 h-3 text-zinc-600" />
          </a>
          {repo.webhookActive && (
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Webhook active
            </span>
          )}
        </div>

        {repo.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{repo.description}</p>
        )}

        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
          <span className="flex items-center gap-1">
            <span className={cn('w-2 h-2 rounded-full', dotColor)} />
            {repo.language}
          </span>
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {formatNumber(repo.stars)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3 h-3" />
            {formatNumber(repo.forks)}
          </span>
          <span>{repo.openIssues} open issues</span>
        </div>
      </div>

      <button
        onClick={() => onToggle(repo.id, repo.isMonitored)}
        disabled={toggling}
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 disabled:opacity-70',
          repo.isMonitored
            ? 'bg-violet-600/10 text-violet-400 border-violet-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-violet-600/10 hover:text-violet-400 hover:border-violet-500/30'
        )}
      >
        {toggling ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : repo.isMonitored ? (
          <><ZapOff className="w-3.5 h-3.5" /> Stop monitoring</>
        ) : (
          <><Zap className="w-3.5 h-3.5" /> Monitor</>
        )}
      </button>
    </div>
  );
}
