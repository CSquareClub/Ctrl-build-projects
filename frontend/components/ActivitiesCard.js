import { User, Clock, AlertCircle, Loader2 } from 'lucide-react';

export default function ActivitiesCard({ commits, error, loading }) {
  return (
    <div className="border border-terminal-border rounded bg-terminal-surface flex flex-col h-full overflow-hidden terminal-hover">
      {/* title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-terminal-border flex-shrink-0">
        <span className="text-terminal-bright text-xs">$</span>
        <span className="text-terminal-text text-xs">git log <span className="text-terminal-muted">--oneline</span></span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-0">
        {loading ? (
          <div className="flex items-center gap-2 text-terminal-muted text-xs pt-3">
            <Loader2 size={12} className="animate-spin" />
            fetching commits...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-terminal-red text-xs pt-3">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        ) : commits && commits.length > 0 ? (
          commits.map((commit) => (
            <div key={commit.sha}
              className="py-2.5 border-b border-terminal-border last:border-b-0 group">
              <div className="flex items-start gap-2">
                <span className="text-terminal-muted text-xs mt-0.5 flex-shrink-0">{'>'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code className="text-terminal-bright text-xs font-bold">{commit.sha}</code>
                  </div>
                  <p className="text-terminal-text text-xs leading-snug line-clamp-2">{commit.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-terminal-muted text-xs">
                      <User size={9} />{commit.author}
                    </span>
                    <span className="flex items-center gap-1 text-terminal-muted text-xs">
                      <Clock size={9} />{commit.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-terminal-muted text-xs pt-3">{'// no commits found'}</p>
        )}
      </div>
    </div>
  );
}
