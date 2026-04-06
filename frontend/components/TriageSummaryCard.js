import { AlertCircle, HelpCircle, Loader2, ShieldAlert, Tags } from 'lucide-react';

function confidencePct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

export default function TriageSummaryCard({ issue, loading, error, unavailable, triage }) {
  return (
    <div className="border border-terminal-border rounded bg-terminal-surface flex flex-col h-full overflow-hidden terminal-hover">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-terminal-border flex-shrink-0">
        <span className="text-terminal-bright text-xs">$</span>
        <span className="text-terminal-text text-xs">triage analyze</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 text-xs font-mono">
        {!issue && <p className="text-terminal-muted">{'// select an issue to run backend triage'}</p>}

        {issue && loading && (
          <div className="flex items-center gap-2 text-terminal-muted">
            <Loader2 size={12} className="animate-spin" />
            running backend analysis for #{issue.number}...
          </div>
        )}

        {issue && !loading && unavailable && (
          <div className="flex items-start gap-2 text-terminal-amber">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            Backend triage endpoint is unavailable. Issue list remains functional, but analysis requires /api/analyze or /api/triage/analyze.
          </div>
        )}

        {issue && !loading && !unavailable && error && (
          <div className="flex items-start gap-2 text-terminal-red">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {issue && !loading && !error && !unavailable && triage && (
          <>
            <div className="border border-terminal-border rounded p-3 bg-terminal-bg/40">
              <div className="text-terminal-muted mb-1">issue</div>
              <p className="text-terminal-bright">#{issue.number} {issue.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="border border-terminal-border rounded p-2">
                <div className="text-terminal-muted mb-1">predicted_type</div>
                <div className="text-terminal-bright">{triage.predictedType}</div>
                <div className="text-terminal-muted mt-1">confidence: {confidencePct(triage.typeConfidence)}</div>
              </div>
              <div className="border border-terminal-border rounded p-2">
                <div className="text-terminal-muted mb-1">priority</div>
                <div className="text-terminal-bright">
                  {triage.priorityBand} ({triage.priorityScore})
                </div>
                <div className="text-terminal-muted mt-1">dup_conf: {confidencePct(triage.duplicateConfidence)}</div>
              </div>
            </div>

            <div className="border border-terminal-border rounded p-2">
              <div className="text-terminal-muted mb-1">summary</div>
              <p className="text-terminal-text leading-relaxed">{triage.summary}</p>
            </div>

            <div className="border border-terminal-border rounded p-2">
              <div className="flex items-center gap-1 text-terminal-muted mb-1">
                <ShieldAlert size={11} />
                missing_information
              </div>
              {triage.missingInformation.length > 0 ? (
                <ul className="space-y-1">
                  {triage.missingInformation.map((item) => (
                    <li key={item} className="text-terminal-text">- {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-terminal-muted">none</p>
              )}
            </div>

            <div className="border border-terminal-border rounded p-2">
              <div className="flex items-center gap-1 text-terminal-muted mb-1">
                <Tags size={11} />
                suggested_labels
              </div>
              {triage.suggestedLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {triage.suggestedLabels.map((label) => (
                    <span key={label} className="border border-terminal-border rounded px-1.5 py-0.5 text-terminal-cyan">
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-terminal-muted">none</p>
              )}
            </div>

            <div className="border border-terminal-border rounded p-2">
              <div className="flex items-center gap-1 text-terminal-muted mb-1">
                <HelpCircle size={11} />
                priority_reasons
              </div>
              {triage.priorityReasons.length > 0 ? (
                <ul className="space-y-1">
                  {triage.priorityReasons.map((item) => (
                    <li key={item} className="text-terminal-text">- {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-terminal-muted">none</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
