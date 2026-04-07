import { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Copy,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { IssueClassification, TriagedIssue } from '../types';
import { analyzeIssue, getIssues, getRepos } from '../lib/api';
import type { ApiRepo } from '../lib/api';

interface AnalysisResult {
  classification: IssueClassification;
  priorityScore: number;
  labels: string[];
  similarIssues: { title: string; repo: string; similarity: number; url: string }[];
  explanation: string;
  isDuplicate: boolean;
}

const CLASSIFICATION_STYLES: Record<
  IssueClassification,
  { bg: string; text: string; border: string }
> = {
  BUG: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  FEATURE_REQUEST: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  DOCUMENTATION: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  QUESTION: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-600/40' },
  SPAM: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  UNCLEAR: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

const LABEL_COLORS: Record<string, string> = {
  bug: 'bg-red-500/15 text-red-400',
  enhancement: 'bg-blue-500/15 text-blue-400',
  documentation: 'bg-sky-500/15 text-sky-400',
  'good first issue': 'bg-violet-500/15 text-violet-400',
  'help wanted': 'bg-amber-500/15 text-amber-400',
  question: 'bg-zinc-500/20 text-zinc-400',
  spam: 'bg-orange-500/15 text-orange-400',
  invalid: 'bg-zinc-600/20 text-zinc-500',
  critical: 'bg-red-600/20 text-red-300',
  performance: 'bg-purple-500/15 text-purple-400',
  webhooks: 'bg-teal-500/15 text-teal-400',
  dashboard: 'bg-indigo-500/15 text-indigo-400',
};

function simulateAnalysis(_title: string, _body: string): AnalysisResult {
  // Kept as fallback shape — real data comes from API
  return { classification: 'UNCLEAR', priorityScore: 0, labels: [], similarIssues: [], explanation: '', isDuplicate: false };
}

const ALL_CLASSIFICATIONS: IssueClassification[] = [
  'BUG',
  'FEATURE_REQUEST',
  'DOCUMENTATION',
  'QUESTION',
  'SPAM',
  'UNCLEAR',
];

export function IssueTriagePage() {
  const [repoFullName, setRepoFullName] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueBody, setIssueBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzedTitle, setAnalyzedTitle] = useState('');
  const [filterClass, setFilterClass] = useState<IssueClassification | 'ALL'>('ALL');
  const [triageHistory, setTriageHistory] = useState<TriagedIssue[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [repos, setRepos] = useState<ApiRepo[]>([]);

  const loadHistory = () => {
    getIssues()
      .then((issues) => setTriageHistory(issues as unknown as TriagedIssue[]))
      .catch(() => {});
  };

  useEffect(() => {
    loadHistory();
    getRepos()
      .then((r) => setRepos(r.filter((repo: ApiRepo) => repo.isMonitored)))
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!issueTitle.trim()) return;
    setLoading(true);
    setApiError(null);
    setAnalyzedTitle(issueTitle);
    try {
      const result = await analyzeIssue({
        title: issueTitle,
        body: issueBody,
        repoFullName: repoFullName || undefined,
        issueNumber: issueNumber ? parseInt(issueNumber, 10) : undefined,
      });
      setAnalysis({
        classification: result.classification as IssueClassification,
        priorityScore: result.priorityScore,
        labels: result.labels,
        similarIssues: result.similarIssues,
        explanation: result.explanation,
        isDuplicate: result.isDuplicate,
      });
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Analysis failed');
      setAnalysis(simulateAnalysis(issueTitle, issueBody));
    } finally {
      setLoading(false);
      loadHistory();
    }
  };

  const handleReset = () => {
    setRepoFullName('');
    setIssueNumber('');
    setIssueTitle('');
    setIssueBody('');
    setAnalysis(null);
    setAnalyzedTitle('');
    setApiError(null);
  };

  const filteredIssues: TriagedIssue[] =
    filterClass === 'ALL'
      ? triageHistory
      : triageHistory.filter((i) => i.classification === filterClass);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Analyze form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Analyse a New Issue</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Repo (owner/repo)
              </label>
              {repos.length > 0 ? (
                <select
                  value={repoFullName}
                  onChange={(e) => setRepoFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-violet-500 rounded-xl px-4 py-3 text-sm outline-none text-zinc-200 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select a repo…</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.fullName}>{r.fullName}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={repoFullName}
                  onChange={(e) => setRepoFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-violet-500 rounded-xl px-4 py-3 text-sm outline-none text-zinc-200 placeholder:text-zinc-600 transition-colors"
                  placeholder="facebook/react"
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Issue #
              </label>
              <input
                type="number"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-violet-500 rounded-xl px-4 py-3 text-sm outline-none text-zinc-200 placeholder:text-zinc-600 transition-colors"
                placeholder="42"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Issue Title *
            </label>
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-violet-500 rounded-xl px-4 py-3 text-sm outline-none text-zinc-200 placeholder:text-zinc-600 transition-colors"
              placeholder="Cannot render component after state update…"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Description / Body
            </label>
            <textarea
              value={issueBody}
              onChange={(e) => setIssueBody(e.target.value)}
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-violet-500 rounded-xl px-4 py-3 text-sm outline-none text-zinc-200 resize-y placeholder:text-zinc-600 transition-colors"
              placeholder="Steps to reproduce, expected behaviour, actual behaviour…"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading || !issueTitle.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-semibold py-3 rounded-xl transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyse Issue
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-3 border border-zinc-700 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          {apiError && (
            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-3">
              AI API unavailable — showing local estimate. {apiError}
            </p>
          )}
        </div>

        {/* Result */}
        <div>
          {!analysis ? (
            <div className="h-full min-h-60 border border-dashed border-zinc-700 rounded-3xl flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-5 h-5 text-zinc-600" />
                </div>
                <div className="text-sm text-zinc-500">Analysis results will appear here</div>
                <div className="text-xs text-zinc-700 mt-1">
                  Powered by Qwen2.5 72B embedded inference
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
              {/* Result header */}
              <div className="px-6 py-4 border-b border-zinc-800 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Analysed</div>
                  <div className="text-sm font-semibold text-white truncate">{analyzedTitle}</div>
                </div>
                <ClassBadge classification={analysis.classification} />
              </div>

              <div className="p-6 space-y-5">
                {/* Duplicate warning */}
                {analysis.isDuplicate && (
                  <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-xs text-orange-300">
                      High similarity match detected — this may be a duplicate issue.
                    </span>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-zinc-500 uppercase tracking-wider">Priority Score</span>
                    <span className="text-white font-bold tabular-nums text-lg">{analysis.priorityScore}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700"
                      style={{ width: `${analysis.priorityScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                    <span>Low</span>
                    <span>Critical</span>
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Suggested Labels</div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.labels.map((label) => (
                      <span
                        key={label}
                        className={cn(
                          'text-xs px-3 py-1 rounded-full font-medium',
                          LABEL_COLORS[label] ?? 'bg-zinc-700 text-zinc-300'
                        )}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Similar issues */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Similar Issues</div>
                  <div className="space-y-2">
                    {analysis.similarIssues.map((sim, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-zinc-950 rounded-xl px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-zinc-300 truncate">{sim.title}</div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">{sim.repo}</div>
                        </div>
                        <div className="text-xs font-mono text-emerald-400 flex-shrink-0">
                          {sim.similarity}%
                        </div>
                        <a href={sim.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 text-zinc-600 hover:text-violet-400 transition-colors" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-zinc-950/60 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                  <p className="text-xs text-zinc-400 leading-relaxed">{analysis.explanation}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(analysis, null, 2))}
                    className="flex-shrink-0 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-600 hover:text-zinc-300"
                    title="Copy JSON"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Issues table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-semibold text-white">All Triaged Issues</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              {filteredIssues.length}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <FilterPill
              label="All"
              active={filterClass === 'ALL'}
              onClick={() => setFilterClass('ALL')}
            />
            {ALL_CLASSIFICATIONS.map((cls) => (
              <FilterPill
                key={cls}
                label={cls.replace('_', ' ')}
                active={filterClass === cls}
                onClick={() => setFilterClass(cls)}
              />
            ))}
          </div>
        </div>

        <div className="divide-y divide-zinc-800/50">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start gap-3 sm:gap-4 hover:bg-zinc-800/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-1.5">
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-200 hover:text-violet-400 transition-colors flex items-center gap-1 group"
                  >
                    {issue.title}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </a>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-zinc-500">{issue.repo}</span>
                  <span className="text-zinc-700">·</span>
                  <span className="text-[10px] text-zinc-600">@{issue.author}</span>
                  {issue.labels.slice(0, 3).map((label) => (
                    <span
                      key={label}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full',
                        LABEL_COLORS[label] ?? 'bg-zinc-800 text-zinc-500'
                      )}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap">
                {issue.isDuplicate && (
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
                    Duplicate
                  </span>
                )}
                <ClassBadge classification={issue.classification} />
                <div className="text-right">
                  <div className="text-sm font-bold text-white tabular-nums">{issue.priorityScore}</div>
                  <div className="text-[10px] text-zinc-600">priority</div>
                </div>
                <div>
                  {issue.state === 'open' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-zinc-600" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClassBadge({ classification }: { classification: IssueClassification }) {
  const s = CLASSIFICATION_STYLES[classification];
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-2.5 py-1 rounded-lg border',
        s.bg,
        s.text,
        s.border
      )}
    >
      {classification.replace('_', ' ')}
    </span>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-[10px] font-semibold px-3 py-1 rounded-full transition-colors uppercase tracking-wide',
        active
          ? 'bg-white text-zinc-900'
          : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
      )}
    >
      {label}
    </button>
  );
}
