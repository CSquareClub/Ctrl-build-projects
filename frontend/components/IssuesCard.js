import { useState } from 'react';
import { CircleDot, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function IssuesCard({ issues, error, loading }) {
  const [filter, setFilter] = useState('open');

  const list = issues || [];
  const filtered = list.filter((issue) => issue.state === filter);
  const openCount = list.filter((issue) => issue.state === 'open').length;
  const closedCount = list.filter((issue) => issue.state === 'closed').length;

  return (
    <div className="border border-terminal-border rounded bg-terminal-surface flex flex-col h-full overflow-hidden terminal-hover">
      {/* title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-terminal-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-terminal-bright text-xs">$</span>
          <span className="text-terminal-text text-xs">gh issue list</span>
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
            fetching issues...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-terminal-red text-xs pt-3">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((issue) => (
            <div key={issue.id}
              className="py-2.5 border-b border-terminal-border last:border-b-0 cursor-pointer group">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">
                  {issue.state === 'open'
                    ? <CircleDot size={12} className="text-terminal-text" />
                    : <CheckCircle2 size={12} className="text-terminal-muted" />
                  }
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-terminal-muted text-xs">#{issue.number}</code>
                    <span className={`text-xs ${issue.state === 'open' ? 'text-terminal-bright' : 'text-terminal-muted'}`}>
                      [{issue.state}]
                    </span>
                  </div>
                  <p className="text-terminal-text text-xs truncate group-hover:text-terminal-bright transition">{issue.title}</p>
                  <p className="text-terminal-muted text-xs mt-0.5">{issue.createdAt}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-terminal-muted text-xs pt-3">{`// no ${filter} issues`}</p>
        )}
      </div>
    </div>
  );
}
