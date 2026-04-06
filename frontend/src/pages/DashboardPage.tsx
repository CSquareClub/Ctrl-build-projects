import { Tag, Shield, Compass, FileText, GitBranch, ArrowRight, CheckCircle, AlertTriangle, XCircle, TrendingUp, Activity, Cpu } from 'lucide-react';
import { MOCK_MODERATION_EVENTS, MOCK_REPOSITORIES, MOCK_TRIAGED_ISSUES } from '../data/mockData';
import type { Page } from '../types';
import { cn } from '../utils/cn';

interface DashboardPageProps {
  navigate: (page: Page) => void;
}

const CHART_DATA = [
  { day: 'Mon', issues: 8,  events: 5  },
  { day: 'Tue', issues: 14, events: 8  },
  { day: 'Wed', issues: 12, events: 11 },
  { day: 'Thu', issues: 20, events: 14 },
  { day: 'Fri', issues: 18, events: 9  },
  { day: 'Sat', issues: 6,  events: 4  },
  { day: 'Sun', issues: 9,  events: 7  },
];
const CHART_MAX = Math.max(...CHART_DATA.flatMap((d) => [d.issues, d.events]));

const HEALTH_ITEMS = [
  { label: 'AI Inference',       value: 98,   display: '98% uptime',   color: 'bg-emerald-500' },
  { label: 'Webhook Delivery',   value: 99.8, display: '99.8% success', color: 'bg-emerald-500' },
  { label: 'Avg Triage Latency', value: 12,   display: '12ms',          color: 'bg-violet-500' },
  { label: 'Queue Backlog',      value: 0,    display: 'Empty',         color: 'bg-emerald-500' },
];

const LIVE_FEED = [
  { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-500/10',     text: 'PR #4401 blocked — hardcoded API key detected',          time: '2m ago'  },
  { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: 'Issue triaged as BUG · priority score 93',                time: '8m ago'  },
  { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10',   text: 'Commit flagged — possible SQL injection risk',             time: '15m ago' },
  { icon: FileText,      color: 'text-amber-400',   bg: 'bg-amber-500/10',   text: 'README generated for vitejs/vite',                        time: '32m ago' },
  { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', text: 'PR #881 passed — docs-only change, zero risk',            time: '1h ago'  },
  { icon: Tag,           color: 'text-violet-400',  bg: 'bg-violet-500/10',  text: '6 issues batch-triaged in facebook/react',                time: '2h ago'  },
];

const DECISION_ICON  = { PASS: CheckCircle, FLAG: AlertTriangle, BLOCK: XCircle } as const;
const DECISION_COLOR = { PASS: 'text-emerald-400', FLAG: 'text-amber-400',   BLOCK: 'text-red-400' } as const;

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function DashboardPage({ navigate }: DashboardPageProps) {
  const monitoredRepos = MOCK_REPOSITORIES.filter((r) => r.isMonitored);
  const blockedCount  = MOCK_MODERATION_EVENTS.filter((e) => e.decision === 'BLOCK').length;

  const STATS = [
    { label: 'Issues Analysed', value: MOCK_TRIAGED_ISSUES.length,    trend: '+18%', up: true,  icon: Tag,      color: 'text-violet-400', bg: 'bg-violet-500/10',  page: 'triage'       as Page },
    { label: 'PRs Moderated',   value: MOCK_MODERATION_EVENTS.length, trend: '+7%',  up: true,  icon: Shield,   color: 'text-blue-400',   bg: 'bg-blue-500/10',    page: 'moderation'   as Page },
    { label: 'Blocked PRs',     value: blockedCount,                  trend: '+2',   up: false, icon: XCircle,  color: 'text-red-400',    bg: 'bg-red-500/10',     page: 'moderation'   as Page },
    { label: 'Active Repos',    value: monitoredRepos.length,         trend: '+1',   up: true,  icon: GitBranch,color: 'text-emerald-400',bg: 'bg-emerald-500/10', page: 'repositories' as Page },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">

      {/* ── AI status banner ─────────────────────────────── */}
      <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-xl px-5 py-2.5">
        <div className="relative flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 flex-1 flex-wrap">
          <span className="text-emerald-400 font-semibold">gpt-oss-120B online</span>
          <span className="text-zinc-700">·</span>
          <span>12ms avg latency</span>
          <span className="text-zinc-700">·</span>
          <span>1,247 events processed today</span>
          <span className="text-zinc-700 hidden md:inline">·</span>
          <span className="hidden md:inline">All webhooks healthy</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-600 flex-shrink-0">
          <Activity className="w-3 h-3" />
          Live
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ label, value, trend, up, icon: Icon, color, bg, page }) => (
          <button
            key={label}
            onClick={() => navigate(page)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-600 hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <span className={cn('text-[10px] font-semibold flex items-center gap-0.5', up ? 'text-emerald-400' : 'text-red-400')}>
                <TrendingUp className={cn('w-3 h-3', !up && 'rotate-180')} />
                {trend}
              </span>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* ── Activity chart + System health ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart — 7-day */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Activity — Last 7 Days</h2>
              <p className="text-[10px] text-zinc-600 mt-0.5">Issues triaged vs moderation events</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />Issues</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Events</span>
            </div>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-2 h-36">
            {CHART_DATA.map(({ day, issues, events }) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="flex items-end gap-0.5 w-full" style={{ height: '112px' }}>
                  <div
                    className="flex-1 bg-violet-500/60 hover:bg-violet-500 rounded-t transition-all duration-300 ease-out"
                    style={{ height: `${(issues / CHART_MAX) * 100}%` }}
                    title={`${issues} issues`}
                  />
                  <div
                    className="flex-1 bg-blue-500/50 hover:bg-blue-500 rounded-t transition-all duration-300 ease-out"
                    style={{ height: `${(events / CHART_MAX) * 100}%` }}
                    title={`${events} events`}
                  />
                </div>
                <span className="text-[9px] text-zinc-600">{day}</span>
              </div>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="flex justify-between text-[9px] text-zinc-700 mt-2 px-1">
            <span>0</span>
            <span>{Math.round(CHART_MAX / 2)}</span>
            <span>{CHART_MAX}</span>
          </div>
        </div>

        {/* System health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Cpu className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-zinc-200">System Health</h2>
          </div>

          <div className="space-y-4 flex-1">
            {HEALTH_ITEMS.map(({ label, value, display, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-zinc-200 font-medium tabular-nums">{display}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', color)}
                    style={{ width: value > 1 ? `${Math.min(100, value)}%` : '100%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-zinc-500">All systems operational</span>
          </div>
        </div>
      </div>

      {/* ── Live feed + Quick actions + Repos ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Live activity feed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-200">Live Activity Feed</h2>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Real-time
            </span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {LIVE_FEED.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-800/20 transition-colors">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', item.bg)}>
                    <Icon className={cn('w-3.5 h-3.5', item.color)} />
                  </div>
                  <span className="flex-1 text-xs text-zinc-400 min-w-0 truncate">{item.text}</span>
                  <span className="text-[10px] text-zinc-600 flex-shrink-0 whitespace-nowrap">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: quick actions + monitored repos */}
        <div className="space-y-4">

          {/* Quick actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="space-y-1">
              {([
                { page: 'triage'       as Page, label: 'Triage an Issue',    desc: 'Classify & prioritise with AI',       color: 'text-violet-400', bg: 'bg-violet-500/10',  icon: Tag      },
                { page: 'readme'       as Page, label: 'Generate README',     desc: 'Point at any repo, get a full README', color: 'text-amber-400',  bg: 'bg-amber-500/10',   icon: FileText },
                { page: 'recommender' as Page, label: 'Find First Issues',   desc: 'Issues matched to your skills',        color: 'text-emerald-400',bg: 'bg-emerald-500/10', icon: Compass  },
              ]).map(({ page, label, desc, color, bg, icon: Icon }) => (
                <button
                  key={page}
                  onClick={() => navigate(page)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/70 transition-colors text-left group"
                >
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-200 group-hover:text-white transition-colors">{label}</div>
                    <div className="text-[10px] text-zinc-600">{desc}</div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Monitored repos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Monitored Repos</h2>
              <button
                onClick={() => navigate('repositories')}
                className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition-colors"
              >
                Manage <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {monitoredRepos.map((repo) => {
                const Icon = DECISION_ICON.PASS;
                return (
                  <div key={repo.id} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-300 truncate">{repo.fullName}</p>
                      <p className="text-[10px] text-zinc-600">{repo.openIssues} open issues · {repo.language}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {repo.webhookActive && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Webhook active</span>
                      )}
                      <Icon className={cn('w-3.5 h-3.5', repo.webhookActive ? DECISION_COLOR.PASS : 'text-zinc-700')} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── Recent moderation events ──────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Recent Moderation Events</h2>
          <button
            onClick={() => navigate('moderation')}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-zinc-800/40">
          {MOCK_MODERATION_EVENTS.slice(0, 4).map((event) => {
            const Icon = DECISION_ICON[event.decision];
            return (
              <div key={event.id} className="px-5 py-3 flex items-center gap-4 hover:bg-zinc-800/20 transition-colors">
                <Icon className={cn('w-4 h-4 flex-shrink-0', DECISION_COLOR[event.decision])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{event.title}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{event.repo} · {event.reason}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    event.decision === 'BLOCK' ? 'bg-red-500/10 text-red-400' :
                    event.decision === 'FLAG'  ? 'bg-amber-500/10 text-amber-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  )}>
                    {event.decision}
                  </span>
                  <span className="text-[10px] text-zinc-600">{timeAgo(event.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

