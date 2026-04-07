import { useState, useEffect } from 'react';
import {
  GitPullRequest,
  GitCommit,
  MessageSquare,
  Tag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Undo2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { EventDecision, EventType, ModerationEvent, Severity } from '../types';
import { getModeration, overrideModeration } from '../lib/api';

const DECISION_CONFIG: Record<
  EventDecision,
  { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PASS: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    icon: CheckCircle,
  },
  FLAG: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    icon: AlertTriangle,
  },
  BLOCK: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    icon: XCircle,
  },
};

const SEVERITY_CONFIG: Record<Severity, { text: string; dot: string }> = {
  CRITICAL: { text: 'text-red-400', dot: 'bg-red-500' },
  HIGH: { text: 'text-orange-400', dot: 'bg-orange-500' },
  MEDIUM: { text: 'text-amber-400', dot: 'bg-amber-400' },
  LOW: { text: 'text-zinc-500', dot: 'bg-zinc-600' },
};

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pull_request: { label: 'Pull Request', icon: GitPullRequest },
  commit: { label: 'Commit', icon: GitCommit },
  issue_comment: { label: 'Issue Comment', icon: MessageSquare },
  pr_review_comment: { label: 'PR Review Comment', icon: MessageSquare },
  issue: { label: 'Issue', icon: Tag },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type DecisionFilter = EventDecision | 'ALL';
type TypeFilter = EventType | 'ALL';

export function ModerationPage() {
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchEvents = () => {
    setLoading(true);
    getModeration()
      .then((data) => setEvents(data as unknown as ModerationEvent[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  const handleOverride = async (id: string) => {
    try {
      await overrideModeration(id, 'Manual override by maintainer');
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, overridden: true, overriddenBy: 'maintainer' } : e
        )
      );
    } catch {
      // optimistic update anyway
      setEvents((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, overridden: true, overriddenBy: 'maintainer' } : e
        )
      );
    }
  };

  const filtered = events.filter((e) => {
    if (decisionFilter !== 'ALL' && e.decision !== decisionFilter) return false;
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
    return true;
  });

  const blockCount = events.filter((e) => e.decision === 'BLOCK').length;
  const flagCount = events.filter((e) => e.decision === 'FLAG').length;
  const passCount = events.filter((e) => e.decision === 'PASS').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-600 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading moderation events…
        </div>
      )}
      {!loading && (<>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1">
        {[
          { label: 'Blocked', count: blockCount, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-800/30', icon: XCircle },
          { label: 'Flagged', count: flagCount, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-800/30', icon: AlertTriangle },
          { label: 'Passed', count: passCount, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-800/30', icon: CheckCircle },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-2xl p-4 border flex items-center gap-4', s.bg, s.border)}>
            <s.icon className={cn('w-5 h-5', s.color)} />
            <div>
              <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.count}</div>
              <div className="text-xs text-zinc-500">{s.label}</div>
            </div>
          </div>
        ))}
        </div>
        <button onClick={fetchEvents} className="ml-4 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex-shrink-0" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
        <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0 hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Decision:</span>
          {(['ALL', 'BLOCK', 'FLAG', 'PASS'] as DecisionFilter[]).map((d) => (
            <button
              key={d}
              onClick={() => setDecisionFilter(d)}
              className={cn(
                'text-[10px] font-semibold px-3 py-1 rounded-full transition-colors uppercase',
                decisionFilter === d
                  ? 'bg-white text-zinc-900'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-zinc-700" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Type:</span>
          {(['ALL', 'pull_request', 'commit', 'issue_comment', 'issue'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'text-[10px] font-semibold px-3 py-1 rounded-full transition-colors',
                typeFilter === t
                  ? 'bg-white text-zinc-900'
                  : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
              )}
            >
              {t === 'ALL' ? 'All' : EVENT_TYPE_CONFIG[t as EventType].label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-zinc-600">{filtered.length} events</div>
      </div>

      {/* Event feed */}
      <div className="space-y-3">
        {filtered.map((evt) => {
          const decCfg = DECISION_CONFIG[evt.decision];
          const sevCfg = SEVERITY_CONFIG[evt.severity];
          const typeCfg = EVENT_TYPE_CONFIG[evt.type];
          const TypeIcon = typeCfg.icon;
          const DecIcon = decCfg.icon;
          const isOpen = expanded === evt.id;

          return (
            <div
              key={evt.id}
              className={cn(
                'bg-zinc-900 border rounded-2xl overflow-hidden transition-all',
                isOpen ? 'border-zinc-600' : 'border-zinc-800 hover:border-zinc-700'
              )}
            >
              {/* Card header */}
              <button
                onClick={() => toggleExpand(evt.id)}
                className="w-full px-3 sm:px-5 py-3 sm:py-4 flex items-start gap-3 sm:gap-4 text-left"
              >
                {/* Type icon */}
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TypeIcon className="w-4 h-4 text-zinc-400" />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{evt.title}</span>
                    {evt.overridden && (
                      <span className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                        Overridden by @{evt.overriddenBy}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                    <span>{evt.repo}</span>
                    <span>·</span>
                    <span>@{evt.author}</span>
                    <span>·</span>
                    <span>{timeAgo(evt.timestamp)}</span>
                    {evt.prNumber && (
                      <>
                        <span>·</span>
                        <span>PR #{evt.prNumber}</span>
                      </>
                    )}
                    {evt.commitHash && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{evt.commitHash}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Severity */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full', sevCfg.dot)} />
                    <span className={cn('text-[10px] font-semibold', sevCfg.text)}>
                      {evt.severity}
                    </span>
                  </div>

                  {/* Decision */}
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border',
                      decCfg.bg,
                      decCfg.text,
                      decCfg.border
                    )}
                  >
                    <DecIcon className="w-3 h-3" />
                    {evt.decision}
                  </div>

                  {/* Chevron */}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-zinc-800 px-5 py-5 space-y-4">
                  {/* Reason */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                      Moderation Reason
                    </div>
                    <div className={cn('text-sm font-medium', decCfg.text)}>{evt.reason}</div>
                  </div>

                  {/* AI explanation */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                      AI Explanation
                    </div>
                    <div className="bg-zinc-950 rounded-xl px-4 py-3 text-sm text-zinc-300 leading-relaxed">
                      {evt.aiExplanation}
                    </div>
                  </div>

                  {/* File + line link */}
                  {evt.file && evt.commitSha && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                        Faulty Location
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-950 rounded-xl px-4 py-3">
                        <div className="flex-1">
                          <div className="text-xs font-mono text-zinc-300">{evt.file}</div>
                          {evt.lineStart && (
                            <div className="text-[10px] text-zinc-600 mt-0.5">
                              {evt.lineStart === evt.lineEnd
                                ? `Line ${evt.lineStart}`
                                : `Lines ${evt.lineStart}–${evt.lineEnd}`}
                            </div>
                          )}
                        </div>
                        <a
                          href={`https://github.com/${evt.repo}/blob/${evt.commitSha}/${evt.file}#L${evt.lineStart}${evt.lineEnd && evt.lineEnd !== evt.lineStart ? `-L${evt.lineEnd}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View on GitHub
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex items-center gap-3 pt-1">
                    {evt.githubUrl && (
                      <a
                        href={evt.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open on GitHub
                      </a>
                    )}

                    {evt.decision === 'BLOCK' && !evt.overridden && (
                      <button
                        onClick={() => handleOverride(evt.id)}
                        className="ml-auto flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-4 py-2 rounded-xl transition-all font-medium"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Override Block
                      </button>
                    )}

                    {evt.decision !== 'BLOCK' && (
                      <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-600">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        No action required
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="text-sm">{events.length === 0 ? 'No moderation events yet — data will appear as webhooks are processed.' : 'No events match the current filters'}</div>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}
