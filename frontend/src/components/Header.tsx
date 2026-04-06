import { LogOut, Bell, Zap } from 'lucide-react';

interface HeaderProps {
  user: { login: string; avatarUrl: string };
  onLogout: () => void;
  title: string;
}

export function Header({ user, onLogout, title }: HeaderProps) {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-zinc-100 leading-tight">{title}</h1>
        <p className="text-[10px] text-zinc-600 hidden sm:block leading-tight">GitWise AI Platform</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Demo mode badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-semibold px-2.5 py-1 rounded-full">
          <Zap className="w-2.5 h-2.5" />
          Demo mode
        </div>

        {/* Notification bell */}
        <button className="relative p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-zinc-200" title="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="w-px h-5 bg-zinc-800" />

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <img
            src={user.avatarUrl}
            alt={user.login}
            className="w-7 h-7 rounded-full border border-zinc-700 ring-1 ring-violet-500/20"
          />
          <span className="text-sm text-zinc-300 hidden sm:block font-medium">{user.login}</span>
        </div>

        <button
          onClick={onLogout}
          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
