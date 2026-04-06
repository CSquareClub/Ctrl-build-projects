import { LayoutDashboard, GitBranch, Tag, Shield, Compass, FileText, Zap } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Page } from '../types';

const NAV_ITEMS: { page: Page; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'repositories', label: 'Repositories', icon: GitBranch, badge: '4' },
  { page: 'triage', label: 'Issue Triage', icon: Tag, badge: '6' },
  { page: 'moderation', label: 'Moderation', icon: Shield, badge: '2' },
  { page: 'recommender', label: 'Recommender', icon: Compass },
  { page: 'readme', label: 'README Gen', icon: FileText },
];

interface SidebarProps {
  currentPage: Page;
  navigate: (page: Page) => void;
}

export function Sidebar({ currentPage, navigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-zinc-950 border-r border-zinc-800 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <div className="font-bold text-white text-sm tracking-tight leading-tight">GitWise AI</div>
          <div className="text-[9px] text-zinc-600 leading-tight">Open-source · gpt-oss-120B</div>
        </div>
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
              {/* Active left border */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 rounded-r-full" />
              )}
              <Icon className={cn('w-4 h-4 flex-shrink-0 transition-colors', active ? 'text-violet-400' : 'text-zinc-600 group-hover:text-zinc-400')} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
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
            <span className="text-zinc-300 font-medium">gpt-oss-120B</span>
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
      </div>
    </aside>
  );
}
