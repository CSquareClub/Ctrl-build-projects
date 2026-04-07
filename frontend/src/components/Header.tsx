import { useState, useRef, useEffect } from 'react';
import { LogOut, Bell, RefreshCw, CheckCircle, AlertTriangle, XCircle, Tag, FileText, ChevronDown, UserCheck, Menu } from 'lucide-react';
import { cn } from '../utils/cn';
import { getDashboardFeed, loginUrl } from '../lib/api';
import type { FeedEntry } from '../lib/api';

interface HeaderProps {
  user: { login: string; avatarUrl: string };
  onLogout: () => void;
  title: string;
  onMenuToggle?: () => void;
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function feedIcon(item: FeedEntry) {
  const t = item.type + (item.severity ?? '');
  if (t.includes('block') || t.includes('BLOCK')) return { Icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' };
  if (t.includes('flag') || t.includes('FLAG')) return { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (t.includes('readme')) return { Icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10' };
  if (t.includes('triage') || t.includes('issue')) return { Icon: Tag, color: 'text-violet-400', bg: 'bg-violet-500/10' };
  return { Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
}

export function Header({ user, onLogout, title, onMenuToggle }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch feed when bell opens
  const openNotifs = async () => {
    setNotifOpen((v) => !v);
    setUserOpen(false);
    if (feed.length === 0) {
      setFeedLoading(true);
      try {
        const data = await getDashboardFeed(8);
        setFeed(data);
        setUnread(0);
      } catch {
        // keep empty
      } finally {
        setFeedLoading(false);
      }
    } else {
      setUnread(0);
    }
  };

  const openUser = () => {
    setUserOpen((v) => !v);
    setNotifOpen(false);
  };

  const handleSwitchAccount = () => {
    window.location.href = loginUrl();
  };

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-30 relative">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-zinc-100 leading-tight">{title}</h1>
          <p className="text-[10px] text-zinc-600 hidden sm:block leading-tight">GitWise AI Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-2">

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={openNotifs}
            className={cn(
              'relative p-1.5 rounded-lg transition-colors',
              notifOpen ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
            )}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-200">Recent Activity</span>
                <span className="text-[10px] text-zinc-600">Last 8 events</span>
              </div>

              {feedLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-zinc-600 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…
                </div>
              ) : feed.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-600">
                  No activity yet. Start monitoring a repository to see events here.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
                  {feed.map((item) => {
                    const { Icon, color, bg } = feedIcon(item);
                    return (
                      <div key={item.id} className="px-4 py-3 flex items-start gap-3 hover:bg-zinc-800/30 transition-colors">
                        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', bg)}>
                          <Icon className={cn('w-3 h-3', color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 leading-snug">{item.message}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(item.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-zinc-800" />

        {/* Avatar + user dropdown */}
        <div ref={userRef} className="relative">
          <button
            onClick={openUser}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded-xl transition-colors',
              userOpen ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
            )}
          >
            <img
              src={user.avatarUrl}
              alt={user.login}
              className="w-7 h-7 rounded-full border border-zinc-700 ring-1 ring-violet-500/20"
            />
            <span className="text-sm text-zinc-300 hidden sm:block font-medium">{user.login}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-600 transition-transform hidden sm:block', userOpen && 'rotate-180')} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-xs font-semibold text-zinc-200">@{user.login}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">GitHub account connected</p>
              </div>

              {/* Actions */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={handleSwitchAccount}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors text-left"
                >
                  <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  Switch account
                </button>
                <button
                  onClick={() => { setUserOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
