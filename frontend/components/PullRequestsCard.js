import React, { useState } from 'react';
import { GitPullRequest, GitMerge } from 'lucide-react';

export default function PullRequestsCard({ pullRequests }) {
  const [filter, setFilter] = useState('open');

  const list = pullRequests || [];
  const filtered = list.filter((pr) => pr.state === filter);
  const openCount = list.filter((pr) => pr.state === 'open').length;
  const closedCount = list.filter((pr) => pr.state === 'closed').length;

  return (
    <div className="bg-github-bg border border-github-border rounded-lg p-5 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitPullRequest size={15} className="text-purple-400" />
          Pull Requests
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
            <GitPullRequest size={11} />
            Open{openCount > 0 && <span className="ml-1 bg-black bg-opacity-20 px-1 rounded">{openCount}</span>}
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-2.5 py-1 flex items-center gap-1 transition border-l border-github-border ${
              filter === 'closed'
                ? 'bg-purple-700 text-white'
                : 'text-github-muted hover:bg-github-border hover:text-white'
            }`}
          >
            <GitMerge size={11} />
            Closed{closedCount > 0 && <span className="ml-1 bg-black bg-opacity-20 px-1 rounded">{closedCount}</span>}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {filtered.length > 0 ? (
          filtered.map((pr) => (
            <div
              key={pr.id}
              className="flex items-start gap-2 p-2.5 bg-github-border bg-opacity-20 rounded hover:bg-opacity-40 transition cursor-pointer"
            >
              <div className="flex-shrink-0 mt-0.5">
                {pr.state === 'open' ? (
                  <GitPullRequest size={13} className="text-green-400" />
                ) : (
                  <GitMerge size={13} className="text-purple-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-github-muted text-xs font-mono bg-github-border px-1.5 py-0.5 rounded">
                    #{pr.number}
                  </span>
                </div>
                <p className="text-white text-xs font-medium truncate">{pr.title}</p>
                <p className="text-github-muted text-xs mt-0.5">{pr.createdAt}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-github-muted text-xs">No {filter} pull requests</p>
        )}
      </div>
    </div>
  );
}
