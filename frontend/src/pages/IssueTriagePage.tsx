import { useState } from 'react';
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
import { MOCK_TRIAGED_ISSUES } from '../data/mockData';
import type { IssueClassification, TriagedIssue } from '../types';

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

function simulateAnalysis(title: string, body: string): AnalysisResult {
  const text = (title + ' ' + body).toLowerCase();

  let classification: IssueClassification = 'FEATURE_REQUEST';
  if (text.includes('bug') || text.includes('fix') || text.includes('error') || text.includes('crash') || text.includes('fail') || text.includes('broken')) {
    classification = 'BUG';
  } else if (text.includes('doc') || text.includes('readme') || text.includes('guide') || text.includes('update')) {
    classification = 'DOCUMENTATION';
  } else if (text.includes('how') || text.includes('?') || text.includes('question') || text.includes('why')) {
    classification = 'QUESTION';
  } else if (text.length < 15 || text.includes('spam') || text.includes('crypto') || text.includes('click')) {
    classification = 'SPAM';
  } else if (text.length < 30) {
    classification = 'UNCLEAR';
  }

  const priority = Math.min(98, Math.max(15, 40 + Math.floor(Math.random() * 50) + (body.length > 100 ? 15 : 0) + (classification === 'BUG' ? 10 : 0)));

  const labels: string[] = [];
  if (classification === 'BUG') labels.push('bug', 'needs triage');
  else if (classification === 'FEATURE_REQUEST') labels.push('enhancement', 'feature');
  else if (classification === 'DOCUMENTATION') labels.push('documentation');
  else if (classification === 'QUESTION') labels.push('question');
  else if (classification === 'SPAM') labels.push('spam', 'invalid');
  else labels.push('unclear', 'needs more info');

  if (Math.random() > 0.55 && classification !== 'SPAM') labels.push('good first issue');

  const similar = [
    { title: 'Similar rendering issue in component lifecycle', repo: 'facebook/react', similarity: 84, url: 'https://github.com/facebook/react/issues/1' },
    { title: 'State update causes unexpected re-render', repo: 'vercel/next.js', similarity: 71, url: 'https://github.com/vercel/next.js/issues/2' },
    { title: 'Memory leak after unmounting component', repo: 'mui/material-ui', similarity: 65, url: 'https://github.com/mui/material-ui/issues/3' },
  ];

  const isDuplicate = similar[0].similarity > 88;

  return {
    classification,
    priorityScore: priority,
    labels,
    similarIssues: similar,
    explanation: `This issue appears to be a ${classification.toLowerCase().replace('_', ' ')}. ${classification === 'BUG' ? 'It describes unexpected behaviour with reproduction context.' : classification === 'SPAM' ? 'The content matches known spam patterns.' : 'The request is well-formed and actionable.'}`,
    isDuplicate,
  };
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
  const [issueTitle, setIssueTitle] = useState('');
  const [issueBody, setIssueBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzedTitle, setAnalyzedTitle] = useState('');
  const [filterClass, setFilterClass] = useState<IssueClassification | 'ALL'>('ALL');

  const handleAnalyze = async () => {
    if (!issueTitle.trim()) return;
    setLoading(true);
    setAnalyzedTitle(issueTitle);
    await new Promise((r) => setTimeout(r, 1200));
    setAnalysis(simulateAnalysis(issueTitle, issueBody));
    setLoading(false);
  };

  const handleReset = () => {
    setIssueTitle('');
    setIssueBody('');
    setAnalysis(null);
    setAnalyzedTitle('');
  };

  const filteredIssues: TriagedIssue[] =
    filterClass === 'ALL'
      ? MOCK_TRIAGED_ISSUES
      : MOCK_TRIAGED_ISSUES.filter((i) => i.classification === filterClass);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Analyze form */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold text-white">Analyse a New Issue</span>
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
                  Powered by gpt-oss-120B embedded inference
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
            <div key={issue.id} className="px-6 py-4 flex items-start gap-4 hover:bg-zinc-800/20 transition-colors">
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

              <div className="flex items-center gap-3 flex-shrink-0">
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
