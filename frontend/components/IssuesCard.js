import React, { useState } from 'react';
import { CircleDot, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function IssuesCard({ issues, error, loading }) {
  const [filter, setFilter] = useState('open');

  const list = issues || [];
  const filtered = list.filter((issue) => issue.state === filter);
  const openCount = list.filter((issue) => issue.state === 'open').length;
  const closedCount = list.filter((issue) => issue.state === 'closed').length;

  return (
    <div className="bg-github-bg border border-github-border rounded-lg p-5 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CircleDot size={15} className="text-yellow-400" />
          Issues
        </h2>
        <div className="flex rounded-md overflow-hidden border border-github-border text-xs">
          <button
            onClick={() => setFilter('open')}
            className={`px-2.5 py-1 flex items-center gap-1 transition ${
              filter === 'open'
                ? 'bg-green-700 text-white'
                : 'text-github-muted hover:bg-github-border hover:text-white'
            }`}
          >
            <CircleDot size={11} />
            Open{openCount > 0 && <span className="ml-1 bg-black bg-opacity-20 px-1 rounded">{openCount}</span>}
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-2.5 py-1 flex items-center gap-1 transition border-l border-github-border ${
              filter === 'closed'
                ? 'bg-red-700 text-white'
                : 'text-github-muted hover:bg-github-border hover:text-white'
            }`}
          >
            <CheckCircle2 size={11} />
            Closed{closedCount > 0 && <span className="ml-1 bg-black bg-opacity-20 px-1 rounded">{closedCount}</span>}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="flex items-center gap-2 text-github-muted text-xs pt-2">
            <Loader2 size={13} className="animate-spin" />
            Loading issues...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-red-400 text-xs pt-2">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((issue) => (
            <div
              key={issue.id}
              className="flex items-start gap-2 p-2.5 bg-github-border bg-opacity-20 rounded hover:bg-opacity-40 transition cursor-pointer"
            >
              <div className="flex-shrink-0 mt-0.5">
                {issue.state === 'open' ? (
                  <CircleDot size={13} className="text-green-400" />
                ) : (
                  <CheckCircle2 size={13} className="text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-github-muted text-xs font-mono bg-github-border px-1.5 py-0.5 rounded">
                    #{issue.number}
                  </span>
                </div>
                <p className="text-white text-xs font-medium truncate">{issue.title}</p>
                <p className="text-github-muted text-xs mt-0.5">{issue.createdAt}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-github-muted text-xs pt-2">No {filter} issues</p>
        )}
      </div>
    </div>
  );
}
