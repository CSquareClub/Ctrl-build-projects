import { useState } from 'react';
import { GitPullRequest, GitMerge, AlertCircle, Loader2 } from 'lucide-react';

export default function PullRequestsCard({ pullRequests, error, loading }) {
  const [filter, setFilter] = useState('open');

  const list = pullRequests || [];
  const filtered = list.filter((pr) => pr.state === filter);
  const openCount = list.filter((pr) => pr.state === 'open').length;
  const closedCount = list.filter((pr) => pr.state === 'closed').length;

  return (
    <div className="border border-terminal-border rounded bg-terminal-surface flex flex-col h-full overflow-hidden terminal-hover">
      {/* title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-terminal-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-terminal-bright text-xs">$</span>
          <span className="text-terminal-text text-xs">gh pr list</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            onClick={() => setFilter('open')}
            className={`px-2 py-0.5 rounded transition ${
              filter === 'open'
                ? 'text-terminal-bright border border-terminal-text'
                : 'text-terminal-muted border border-terminal-border hover:border-terminal-muted hover:text-terminal-text'
            }`}
          >
            open{openCount > 0 && <span className="ml-1 text-terminal-muted">{openCount}</span>}
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-2 py-0.5 rounded transition ${
              filter === 'closed'
                ? 'text-terminal-bright border border-terminal-text'
                : 'text-terminal-muted border border-terminal-border hover:border-terminal-muted hover:text-terminal-text'
            }`}
          >
            closed{closedCount > 0 && <span className="ml-1 text-terminal-muted">{closedCount}</span>}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-0">
        {loading ? (
          <div className="flex items-center gap-2 text-terminal-muted text-xs pt-3">
            <Loader2 size={12} className="animate-spin" />
            fetching pull requests...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-terminal-red text-xs pt-3">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((pr) => (
            <div key={pr.id}
              className="py-2.5 border-b border-terminal-border last:border-b-0 cursor-pointer group">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">
                  {pr.state === 'open'
                    ? <GitPullRequest size={12} className="text-terminal-text" />
                    : <GitMerge size={12} className="text-terminal-muted" />
                  }
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-terminal-muted text-xs">#{pr.number}</code>
                    <span className={`text-xs ${pr.state === 'open' ? 'text-terminal-bright' : 'text-terminal-muted'}`}>
                      [{pr.state}]
                    </span>
                  </div>
                  <p className="text-terminal-text text-xs truncate group-hover:text-terminal-bright transition">{pr.title}</p>
                  <p className="text-terminal-muted text-xs mt-0.5">{pr.createdAt}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-terminal-muted text-xs pt-3">{`// no ${filter} pull requests`}</p>
        )}
      </div>
    </div>
  );
}
