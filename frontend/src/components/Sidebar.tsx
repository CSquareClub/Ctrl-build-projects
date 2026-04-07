import { useState, useEffect } from 'react';
import { LayoutDashboard, GitBranch, Tag, Shield, Compass, FileText, Zap, Settings, X } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Page } from '../types';
import { getDashboardStats } from '../lib/api';

interface SidebarProps {
  currentPage: Page;
  navigate: (page: Page) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentPage, navigate, mobileOpen, onClose }: SidebarProps) {
  const [counts, setCounts] = useState({ triage: 0, moderation: 0, repositories: 0 });

  useEffect(() => {
    getDashboardStats()
      .then((s) => setCounts({ triage: s.issuesAnalysed, moderation: s.prsModerated, repositories: s.activeRepos }))
      .catch(() => {});
  }, []);

  const NAV_ITEMS: { page: Page; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { page: 'dashboard',   label: 'Dashboard',            icon: LayoutDashboard },
    { page: 'repositories',label: 'Repositories',         icon: GitBranch,  badge: counts.repositories || undefined },
    { page: 'triage',      label: 'Issue Triage',         icon: Tag,        badge: counts.triage || undefined },
    { page: 'moderation',  label: 'Moderation',           icon: Shield,     badge: counts.moderation || undefined },
    { page: 'recommender', label: 'Recommender',          icon: Compass },
    { page: 'readme',      label: 'README Gen',           icon: FileText },
    { page: 'settings',    label: 'Settings',             icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col flex-shrink-0 transition-transform duration-200 ease-in-out',
        // Mobile: fixed overlay, hidden by default
        'fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm tracking-tight leading-tight">GitWise AI</div>
          <div className="text-[9px] text-zinc-600 leading-tight">Open-source · Qwen2.5 72B</div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section label */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600">Navigation</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {NAV_ITEMS.map(({ page, label, icon: Icon, badge }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => navigate(page)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left relative group',
                active
                  ? 'bg-violet-600/15 text-violet-300 font-medium'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-r-full" />
              )}
              <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', active ? 'text-violet-400' : 'text-zinc-600 group-hover:text-zinc-400')} />
              <span className="flex-1">{label}</span>
              {badge !== undefined && (
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums',
                  active ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-500'
                )}>{badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* AI Status footer */}
      <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </div>
          <div className="text-[10px] text-zinc-500 leading-tight flex-1 min-w-0">
            <span className="text-zinc-300 font-medium">Qwen2.5 72B</span>
            <span className="text-zinc-700"> · model online</span>
          </div>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full" style={{ width: '72%' }} />
        </div>
        <div className="flex justify-between text-[9px] text-zinc-700">
          <span>GPU load</span>
          <span>72%</span>
        </div>
        <div className="pt-2 border-t border-zinc-800 mt-2">
          <p className="text-[8px] text-zinc-600 text-center leading-tight">Created with ❤️ by Team Krypthos</p>
          <p className="text-[7px] text-zinc-700 text-center mt-0.5">Arindam · Shivansh · Aishpreet</p>
        </div>
      </div>
    </aside>
  );
}
