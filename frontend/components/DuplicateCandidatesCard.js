import { AlertCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';

function scoreLabel(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

export default function DuplicateCandidatesCard({ issue, loading, error, unavailable, duplicates }) {
  return (
    <div className="border border-terminal-border rounded bg-terminal-surface flex flex-col h-full overflow-hidden terminal-hover">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-terminal-border flex-shrink-0">
        <span className="text-terminal-bright text-xs">$</span>
        <span className="text-terminal-text text-xs">duplicate candidates</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2 text-xs font-mono">
        {!issue && <p className="text-terminal-muted">{'// select an issue to inspect duplicate reports'}</p>}

        {issue && loading && (
          <div className="flex items-center gap-2 text-terminal-muted">
            <Loader2 size={12} className="animate-spin" />
            searching for similar issues...
          </div>
        )}

        {issue && !loading && unavailable && (
          <div className="flex items-start gap-2 text-terminal-amber">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            Similarity endpoint is unavailable. Expected /api/similar or /api/triage/similar.
          </div>
        )}

        {issue && !loading && !unavailable && error && (
          <div className="flex items-start gap-2 text-terminal-red">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {issue && !loading && !error && !unavailable && duplicates.length === 0 && (
          <p className="text-terminal-muted">{'// no high-confidence duplicates returned'}</p>
        )}

        {issue && !loading && !error && !unavailable && duplicates.length > 0 &&
          duplicates.map((candidate) => (
            <div key={candidate.issueId} className="border border-terminal-border rounded p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Copy size={11} className="text-terminal-muted flex-shrink-0" />
                  <span className="text-terminal-bright truncate">
                    #{candidate.issueNumber || '?'} {candidate.title}
                  </span>
                </div>
                <span className="text-terminal-cyan flex-shrink-0">{scoreLabel(candidate.finalScore || candidate.similarityScore)}</span>
              </div>

              {candidate.reasons.length > 0 && (
                <p className="text-terminal-muted mt-1">{candidate.reasons.join(' | ')}</p>
              )}

              {candidate.htmlUrl && (
                <a
                  href={candidate.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-terminal-text hover:text-terminal-bright transition"
                >
                  view issue <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
