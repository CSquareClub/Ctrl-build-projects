import { useState } from 'react';
import {
  Star,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  ArrowRight,
  RefreshCw,
  Compass,
  MessageCircle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { RecommendedIssue } from '../types';
import { savePrefs, getRecommendations, addBookmark, removeBookmark } from '../lib/api';

const SKILL_OPTIONS = [
  'JavaScript',
  'TypeScript',
  'React',
  'Python',
  'Rust',
  'Go',
  'Node.js',
  'Tailwind CSS',
  'AI/ML',
  'FastAPI',
  'SQL',
  'GraphQL',
];

const DOMAIN_OPTIONS = ['Frontend', 'Backend', 'DevOps', 'Documentation', 'Testing', 'Security', 'Performance'];

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner', desc: '< 1 year' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years' },
];

const LABEL_COLORS: Record<string, string> = {
  'good first issue': 'bg-violet-500/15 text-violet-400',
  'help wanted': 'bg-amber-500/15 text-amber-400',
  enhancement: 'bg-blue-500/15 text-blue-400',
  bug: 'bg-red-500/15 text-red-400',
  documentation: 'bg-sky-500/15 text-sky-400',
};

const DIFFICULTY_STYLE: Record<string, string> = {
  Easy: 'text-emerald-400 bg-emerald-500/10',
  Medium: 'text-amber-400 bg-amber-500/10',
  Hard: 'text-red-400 bg-red-500/10',
};

export function RecommenderPage() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['TypeScript', 'React']);
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['Frontend']);
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [issues, setIssues] = useState<RecommendedIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const toggleBookmark = async (id: string) => {
    const isBookmarked = bookmarked.has(id);
    // optimistic
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    try {
      if (isBookmarked) await removeBookmark(id);
      else await addBookmark(id);
    } catch {
      // revert on error
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  const handleFind = async () => {
    setLoading(true);
    try {
      await savePrefs({ skills: selectedSkills, domains: selectedDomains, experience });
      const results = await getRecommendations();
      setIssues(results as unknown as RecommendedIssue[]);
    } catch {
      // fallback: empty list with error message
      setIssues([]);
    } finally {
      setHasSearched(true);
      setLoading(false);
    }
  };

  const bookmarkedIssues = issues.filter((i) => bookmarked.has(i.id));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Left panel: profile */}
        <div className="space-y-5">
          {/* Skill profile */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Skill Profile</span>
            </div>

            {/* Skills */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2">
                Technologies
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-all',
                      selectedSkills.includes(skill)
                        ? 'bg-white text-zinc-900 border-white'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                    )}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Domains */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2">
                Domains
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DOMAIN_OPTIONS.map((domain) => (
                  <button
                    key={domain}
                    onClick={() => toggleDomain(domain)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-all',
                      selectedDomains.includes(domain)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                    )}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2">
                Experience Level
              </label>
              <div className="grid grid-cols-3 gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                {LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() =>
                      setExperience(level.value as 'beginner' | 'intermediate' | 'advanced')
                    }
                    className={cn(
                      'py-2 rounded-lg text-center transition-all',
                      experience === level.value
                        ? 'bg-white text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    <div className="text-[10px] font-semibold uppercase">{level.label}</div>
                    <div className="text-[9px] opacity-60 mt-0.5">{level.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleFind}
              disabled={loading || selectedSkills.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold py-3 rounded-xl transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Finding…
                </>
              ) : (
                <>
                  Find Matching Issues <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Bookmarks */}
          {bookmarkedIssues.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookmarkCheck className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">
                  Bookmarks ({bookmarkedIssues.length})
                </span>
              </div>
              <div className="space-y-2">
                {bookmarkedIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-zinc-300 truncate">{issue.title}</div>
                      <div className="text-[10px] text-zinc-600">{issue.repo}</div>
                    </div>
                    <button
                      onClick={() => toggleBookmark(issue.id)}
                      className="text-violet-400 hover:text-zinc-500 transition-colors"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel: results */}
        <div>
          {!hasSearched ? (
            <div className="h-full min-h-80 border border-dashed border-zinc-700 rounded-3xl flex items-center justify-center">
              <div className="text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <Compass className="w-6 h-6 text-zinc-600" />
                </div>
                <div className="text-sm font-medium text-zinc-400 mb-1">
                  Your personalised recommendations will appear here
                </div>
                <div className="text-xs text-zinc-600">
                  Set your skill profile and click "Find Matching Issues"
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">
                  <span className="text-white font-semibold">{issues.length}</span> issues ranked by match
                </div>
                <div className="text-xs text-zinc-600">
                  Scoring: 40% skill · 25% difficulty · 20% labels · 10% freshness · 5% interest
                </div>
              </div>

              {issues.length === 0 && (
                <div className="border border-dashed border-zinc-700 rounded-2xl py-16 flex flex-col items-center justify-center">
                  <Compass className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">No matching issues found.</p>
                  <p className="text-xs text-zinc-600 mt-1">Try selecting different skills or domains and search again.</p>
                </div>
              )}

              {issues.map((issue, idx) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  rank={idx + 1}
                  isBookmarked={bookmarked.has(issue.id)}
                  onBookmark={() => toggleBookmark(issue.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  rank,
  isBookmarked,
  onBookmark,
}: {
  issue: RecommendedIssue;
  rank: number;
  isBookmarked: boolean;
  onBookmark: () => void;
}) {
  const scoreColor =
    issue.matchScore >= 90
      ? 'text-emerald-400'
      : issue.matchScore >= 75
      ? 'text-amber-400'
      : 'text-zinc-400';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all">
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold text-zinc-500">
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <a
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-zinc-200 hover:text-violet-400 transition-colors flex items-center gap-1 group"
            >
              {issue.title}
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </a>
            {/* Match score */}
            <div className="flex-shrink-0 text-right">
              <div className={cn('text-3xl font-bold tabular-nums', scoreColor)}>
                {issue.matchScore}
              </div>
              <div className="text-[9px] text-zinc-600 -mt-0.5">MATCH</div>
            </div>
          </div>

          {/* Repo */}
          <div className="text-xs text-zinc-500 mb-3">
            <a
              href={`https://github.com/${issue.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-violet-400 transition-colors"
            >
              {issue.repo}
            </a>
          </div>

          {/* Tags row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', DIFFICULTY_STYLE[issue.difficulty])}>
              {issue.difficulty}
            </span>
            {issue.labels.map((l) => (
              <span key={l} className={cn('text-[10px] px-2 py-0.5 rounded-full', LABEL_COLORS[l] ?? 'bg-zinc-800 text-zinc-500')}>
                {l}
              </span>
            ))}
            {issue.languages.map((lang) => (
              <span key={lang} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                {lang}
              </span>
            ))}
          </div>

          {/* Explanation */}
          <div className="text-xs text-zinc-500 leading-relaxed mb-3">{issue.explanation}</div>

          {/* Bottom row */}
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {issue.stars.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {issue.comments}
            </span>
            <div className="ml-auto">
              <button
                onClick={onBookmark}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all font-medium',
                  isBookmarked
                    ? 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30'
                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                )}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-3.5 h-3.5" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5" />
                )}
                {isBookmarked ? 'Saved' : 'Bookmark'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
