import { AlertCircle, Loader2 } from 'lucide-react';

function scoreBadge(kind, score) {
  if (score == null) return '// n/a';
  const label = kind || 'score';
  return `${label}: ${(score * 100).toFixed(1)}%`;
}

function SectionCard({ command, title, loading, error, empty, emptyText, children }) {
  return (
    <div className="border border-terminal-border rounded bg-terminal-surface flex flex-col overflow-hidden terminal-hover min-h-[210px]">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-terminal-border flex-shrink-0">
        <span className="text-terminal-bright text-xs">$</span>
        <span className="text-terminal-text text-xs">{command}</span>
        {title && <span className="text-terminal-muted text-xs">{title}</span>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex items-center gap-2 text-terminal-muted text-xs pt-3">
            <Loader2 size={12} className="animate-spin" />
            analyzing...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-terminal-red text-xs pt-3">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        ) : empty ? (
          <p className="text-terminal-muted text-xs pt-3">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function AnalyzePanel({ issue, analysis, loading, error }) {
  if (!issue) {
    return (
      <div className="border border-terminal-border rounded bg-terminal-surface p-4 terminal-hover">
        <div className="text-terminal-muted text-xs">{'// select an issue to run analyze'}</div>
      </div>
    );
  }

  const hasAnalysis = Boolean(analysis);
  const analysisView = analysis || {
    analysisVersion: '',
    predictedType: { label: '', confidence: null, reasons: [] },
    suggestedLabels: { items: [], reasons: [] },
    priority: { score: null, band: '', reasons: [] },
    duplicateCandidates: { confidence: null, items: [] },
    missingInformation: { items: [] },
    explanation: { summary: '', priorityReasons: [] },
  };

  return (
    <div className="border border-terminal-border rounded bg-terminal-surface p-4 terminal-hover flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-terminal-border pb-2">
        <div className="flex items-center gap-2">
          <span className="text-terminal-bright text-xs">$</span>
          <span className="text-terminal-text text-xs">openissue analyze</span>
          <span className="text-terminal-muted text-xs">--issue #{issue.number}</span>
        </div>
        {analysisView.analysisVersion && (
          <span className="text-terminal-muted text-xs">{analysisView.analysisVersion}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SectionCard
          command="predicted_type"
          loading={loading}
          error={error}
          empty={!hasAnalysis || !analysisView.predictedType.label}
          emptyText="// no predicted type"
        >
          <div className="text-terminal-bright text-sm font-bold">{analysisView.predictedType.label}</div>
          <div className="text-terminal-muted text-xs mt-1">
            confidence: {analysisView.predictedType.confidence != null ? `${(analysisView.predictedType.confidence * 100).toFixed(1)}%` : 'n/a'}
          </div>
          <div className="mt-2 space-y-1">
            {analysisView.predictedType.reasons.slice(0, 4).map((reason) => (
              <p key={reason} className="text-terminal-muted text-xs">- {reason}</p>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          command="suggested_labels"
          loading={loading}
          error={error}
          empty={!hasAnalysis || analysisView.suggestedLabels.items.length === 0}
          emptyText="// no labels suggested"
        >
          <div className="flex flex-wrap gap-2">
            {analysisView.suggestedLabels.items.map((label) => (
              <span key={label} className="px-2 py-0.5 rounded border border-terminal-border text-terminal-bright text-xs">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-2 space-y-1">
            {analysisView.suggestedLabels.reasons.slice(0, 4).map((reason) => (
              <p key={reason} className="text-terminal-muted text-xs">- {reason}</p>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          command="priority"
          loading={loading}
          error={error}
          empty={!hasAnalysis || analysisView.priority.score == null}
          emptyText="// no priority score"
        >
          <div className="text-terminal-bright text-2xl font-bold glow">{analysisView.priority.score}</div>
          <div className="text-terminal-muted text-xs mt-1">band: {analysisView.priority.band || 'n/a'}</div>
          <div className="mt-2 space-y-1">
            {analysisView.priority.reasons.slice(0, 4).map((reason) => (
              <p key={reason} className="text-terminal-muted text-xs">- {reason}</p>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SectionCard
          command="duplicate_candidates"
          loading={loading}
          error={error}
          empty={!hasAnalysis || analysisView.duplicateCandidates.items.length === 0}
          emptyText="// no likely duplicates"
        >
          <div className="text-terminal-muted text-xs mb-2">
            confidence: {analysisView.duplicateCandidates.confidence != null ? `${(analysisView.duplicateCandidates.confidence * 100).toFixed(1)}%` : 'n/a'}
          </div>
          <div className="space-y-2">
            {analysisView.duplicateCandidates.items.slice(0, 5).map((candidate) => (
              <div key={candidate.issueId} className="pb-2 border-b border-terminal-border last:border-b-0">
                <div className="flex items-center gap-2">
                  <code className="text-terminal-muted text-xs">#{candidate.issueNumber ?? candidate.issueId}</code>
                  <span className="text-terminal-bright text-xs">{scoreBadge(candidate.primaryScoreKind, candidate.primaryScore)}</span>
                </div>
                <p className="text-terminal-text text-xs truncate">{candidate.title}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          command="missing_information"
          loading={loading}
          error={error}
          empty={!hasAnalysis || analysisView.missingInformation.items.length === 0}
          emptyText="// issue report looks complete"
        >
          <div className="space-y-1">
            {analysisView.missingInformation.items.map((item) => (
              <p key={item} className="text-terminal-muted text-xs">- {item}</p>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          command="explanation"
          loading={loading}
          error={error}
          empty={!hasAnalysis}
          emptyText="// no explanation"
        >
          <p className="text-terminal-text text-xs">{analysisView.explanation.summary}</p>
          <div className="mt-2 space-y-1">
            {analysisView.explanation.priorityReasons.slice(0, 3).map((reason) => (
              <p key={reason} className="text-terminal-muted text-xs">- {reason}</p>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
