import React from 'react';
import { GitCommit, User, Clock } from 'lucide-react';

export default function ActivitiesCard({ commits }) {
  return (
    <div className="bg-github-bg border border-github-border rounded-lg p-5 flex flex-col h-full overflow-hidden">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <GitCommit size={15} className="text-blue-400" />
        Commit History
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {commits && commits.length > 0 ? (
          commits.map((commit) => (
            <div
              key={commit.sha}
              className="flex items-start gap-2.5 pb-3 border-b border-github-border last:border-b-0"
            >
              <GitCommit size={13} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium leading-snug line-clamp-2">
                  {commit.message}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-github-muted text-xs">
                    <User size={10} />
                    {commit.author}
                  </span>
                  <span className="flex items-center gap-1 text-github-muted text-xs">
                    <Clock size={10} />
                    {commit.timestamp}
                  </span>
                </div>
                <span className="font-mono text-xs text-blue-400 mt-0.5 block">
                  {commit.sha}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-github-muted text-xs">No commits found</p>
        )}
      </div>
    </div>
  );
}
