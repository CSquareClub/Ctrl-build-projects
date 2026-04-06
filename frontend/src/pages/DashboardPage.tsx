import { useState, useEffect } from 'react';
import { Tag, Shield, Compass, FileText, GitBranch, ArrowRight, CheckCircle, AlertTriangle, XCircle, TrendingUp, Activity, Cpu, RefreshCw, Zap } from 'lucide-react';
import type { Page, Repository } from '../types';
import { cn } from '../utils/cn';
import { getDashboardStats, getDashboardFeed, getDashboardActivity, getModeration, getRepos } from '../lib/api';
import type { DashboardStats, FeedEntry, ActivityDay, ApiModerationEvent } from '../lib/api';

interface DashboardPageProps {
  navigate: (page: Page) => void;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function feedIcon(type: string, severity?: string) {
  const t = type + (severity ?? '');
  if (t.includes('block') || t.includes('BLOCK')) return { Icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' };
  if (t.includes('flag') || t.includes('FLAG')) return { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (t.includes('readme')) return { Icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (t.includes('triage') || t.includes('issue')) return { Icon: Tag, color: 'text-violet-400', bg: 'bg-violet-500/10' };
  return { Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
}

function modIcon(decision: string) {
  if (decision === 'BLOCK') return { Icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' };
  if (decision === 'FLAG') return { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  return { Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
}

export function DashboardPage({ navigate }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats>({
    issuesAnalysed: 0, prsModerated: 0, blockedPrs: 0, flaggedPrs: 0, passedPrs: 0,
    activeRepos: 0, readmesGenerated: 0, modelLatencyMs: 0, eventsToday: 0,
    allWebhooksHealthy: true, aiUptime: 0, webhookDeliveryRate: 0, queueBacklog: 0,
  });
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [recentMod, setRecentMod] = useState<ApiModerationEvent[]>([]);
  const [monitoredRepos, setMonitoredRepos] = useState<Repository[]>([]);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    getDashboardFeed(6)
      .then(setFeed)
      .catch(() => {})
      .finally(() => setFeedLoading(false));
    getDashboardActivity(7)
      .then(setActivity)
      .catch(() => {})
      .finally(() => setActivityLoading(false));
    getModeration()
      .then((events) => setRecentMod(events.slice(0, 3)))
      .catch(() => {});
    getRepos()
      .then((repos) => setMonitoredRepos(repos.filter((r: Repository) => r.isMonitored).slice(0, 4)))
      .catch(() => {});
  }, []);

  const STATS = [
    { label: 'Issues Analysed', value: stats.issuesAnalysed, trend: '+18%', up: true,  icon: Tag,      color: 'text-violet-400', bg: 'bg-violet-500/10',  page: 'triage'       as Page },
    { label: 'PRs Moderated',   value: stats.prsModerated,   trend: '+7%',  up: true,  icon: Shield,   color: 'text-blue-400',   bg: 'bg-blue-500/10',    page: 'moderation'   as Page },
    { label: 'Blocked PRs',     value: stats.blockedPrs,     trend: '+2',   up: false, icon: XCircle,  color: 'text-red-400',    bg: 'bg-red-500/10',     page: 'moderation'   as Page },
    { label: 'Active Repos',    value: stats.activeRepos,    trend: '+1',   up: true,  icon: GitBranch,color: 'text-emerald-400',bg: 'bg-emerald-500/10', page: 'repositories' as Page },
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
          <span className="text-emerald-400 font-semibold">Qwen2.5 72B online</span>
          <span className="text-zinc-700">·</span>
          <span>{stats.modelLatencyMs > 0 ? `${stats.modelLatencyMs}ms avg latency` : 'latency loading…'}</span>
          <span className="text-zinc-700">·</span>
          <span>{stats.eventsToday} events processed today</span>
          <span className="text-zinc-700 hidden md:inline">·</span>
          <span className="hidden md:inline">{stats.allWebhooksHealthy ? 'All webhooks healthy' : 'Webhook issues detected'}</span>
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

          {activityLoading ? (
            <div className="h-36 flex items-center justify-center text-zinc-600 gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading chart…
            </div>
          ) : activity.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-xs text-zinc-600">
              No activity yet — data will appear as GitHub webhooks are processed.
            </div>
          ) : (() => {
            const chartMax = Math.max(...activity.flatMap((d) => [d.issues, d.events]), 1);
            return (
              <>
                <div className="flex items-end gap-2 h-36">
                  {activity.map(({ day, issues, events }) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="flex items-end gap-0.5 w-full" style={{ height: '112px' }}>
                        <div
                          className="flex-1 bg-violet-500/60 hover:bg-violet-500 rounded-t transition-all duration-300 ease-out"
                          style={{ height: `${(issues / chartMax) * 100}%` }}
                          title={`${issues} issues`}
                        />
                        <div
                          className="flex-1 bg-blue-500/50 hover:bg-blue-500 rounded-t transition-all duration-300 ease-out"
                          style={{ height: `${(events / chartMax) * 100}%` }}
                          title={`${events} events`}
                        />
                      </div>
                      <span className="text-[9px] text-zinc-600">{day}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-zinc-700 mt-2 px-1">
                  <span>0</span>
                  <span>{Math.round(chartMax / 2)}</span>
                  <span>{chartMax}</span>
                </div>
              </>
            );
          })()}
        </div>

        {/* System health */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Cpu className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-zinc-200">System Health</h2>
          </div>

          <div className="space-y-4 flex-1">
            {[
              {
                label: 'AI Inference',
                value: stats.aiUptime,
                display: stats.aiUptime > 0 ? `${stats.aiUptime.toFixed(1)}% uptime` : '—',
                color: stats.aiUptime >= 95 ? 'bg-emerald-500' : 'bg-amber-500',
              },
              {
                label: 'Webhook Delivery',
                value: stats.webhookDeliveryRate,
                display: stats.webhookDeliveryRate > 0 ? `${stats.webhookDeliveryRate.toFixed(1)}% success` : '—',
                color: stats.webhookDeliveryRate >= 95 ? 'bg-emerald-500' : 'bg-amber-500',
              },
              {
                label: 'Avg Triage Latency',
                value: stats.modelLatencyMs > 0 ? Math.min(100, 100 - (stats.modelLatencyMs / 500) * 100) : 0,
                display: stats.modelLatencyMs > 0 ? `${stats.modelLatencyMs}ms` : '—',
                color: stats.modelLatencyMs <= 100 ? 'bg-violet-500' : 'bg-amber-500',
              },
              {
                label: 'Queue Backlog',
                value: stats.queueBacklog === 0 ? 100 : Math.max(0, 100 - stats.queueBacklog * 10),
                display: stats.queueBacklog === 0 ? 'Empty' : `${stats.queueBacklog} pending`,
                color: stats.queueBacklog === 0 ? 'bg-emerald-500' : 'bg-amber-500',
              },
            ].map(({ label, value, display, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-zinc-200 font-medium tabular-nums">{display}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', color)}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full', stats.allWebhooksHealthy ? 'bg-emerald-400' : 'bg-amber-400')} />
            <span className="text-[10px] text-zinc-500">
              {stats.allWebhooksHealthy ? 'All systems operational' : 'Some systems degraded'}
            </span>
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
          {feedLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-zinc-600 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…
            </div>
          ) : feed.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-600 px-5">
              No activity yet. Import and monitor a repository to start seeing events here.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {feed.map((item) => {
                const { Icon, color, bg } = feedIcon(item.type, item.severity);
                return (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-800/20 transition-colors">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                      <Icon className={cn('w-3.5 h-3.5', color)} />
                    </div>
                    <span className="flex-1 text-xs text-zinc-400 min-w-0 truncate">{item.message}</span>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0 whitespace-nowrap">{timeAgo(item.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
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
            {monitoredRepos.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-zinc-600">No monitored repos yet.</p>
                <button onClick={() => navigate('repositories')} className="mt-2 text-xs text-violet-400 hover:underline">Import from GitHub →</button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {monitoredRepos.map((repo) => (
                  <div key={repo.id} className="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/20 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-zinc-300 hover:text-violet-400 transition-colors truncate block"
                      >
                        {repo.fullName}
                      </a>
                      <div className="text-[10px] text-zinc-600">{repo.language} · {repo.openIssues} issues</div>
                    </div>
                    {repo.webhookActive && (
                      <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Active</span>
                    )}
                  </div>
                ))}
              </div>
            )}
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
        {recentMod.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-zinc-600">
            Moderation events will appear here as webhooks are processed.{' '}
            <button onClick={() => navigate('moderation')} className="text-violet-400 hover:underline">View all →</button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {recentMod.map((ev) => {
              const { Icon, color, bg } = modIcon(ev.decision);
              return (
                <div key={ev.id} className="px-5 py-3 flex items-center gap-3 hover:bg-zinc-800/20 transition-colors">
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{ev.title}</p>
                    <p className="text-[10px] text-zinc-600">{ev.repo} · {ev.decision}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 flex-shrink-0 whitespace-nowrap">{timeAgo(ev.timestamp)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

``