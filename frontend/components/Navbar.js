import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BookMarked, Star, Users, Bell, Settings, GitBranch, KeyRound, Eye, EyeOff, Check, X, Radar } from 'lucide-react';

export default function Navbar({ onTokenChange }) {
  const router = useRouter();

  const menuItems = [
    { icon: BookMarked, label: 'repositories', href: '/' },
    { icon: Radar,      label: 'repo_analysis', href: '/repo-analysis' },
    { icon: Star,       label: 'starred', href: '#' },
    { icon: Users,      label: 'followers', href: '#' },
    { icon: Bell,       label: 'notifications', href: '#' },
    { icon: Settings,   label: 'settings', href: '#' },
  ];

  const [token, setToken]         = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('gh_token') || '';
    setSavedToken(stored);
    setToken(stored);
    if (onTokenChange) onTokenChange(stored);
  }, [onTokenChange]);

  const handleSave = () => {
    const trimmed = token.trim();
    localStorage.setItem('gh_token', trimmed);
    setSavedToken(trimmed);
    if (onTokenChange) onTokenChange(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem('gh_token');
    setToken('');
    setSavedToken('');
    if (onTokenChange) onTokenChange('');
  };

  return (
    <aside className="w-64 bg-terminal-bg border-r border-terminal-border flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-5 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-terminal-text" />
          <span className="text-terminal-bright font-bold text-base tracking-widest uppercase cursor-blink">
            Synapse
          </span>
        </div>
        <div className="text-terminal-muted text-xs mt-1">~/github-viewer</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.href !== '#' && router.pathname === item.href;

          return (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded transition group ${
                isActive
                  ? 'text-terminal-bright bg-terminal-dim border border-terminal-border'
                  : 'text-terminal-muted hover:text-terminal-bright hover:bg-terminal-dim'
              }`}
            >
              <span className={`group-hover:text-terminal-text ${isActive ? 'text-terminal-text' : 'text-terminal-muted'}`}>
                <Icon size={13} className="flex-shrink-0" />
              </span>
              <span className="text-xs">
                <span className="text-terminal-muted">~/</span>{item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Token Section */}
      <div className="px-3 pb-3 border-t border-terminal-border pt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <KeyRound size={11} className="text-terminal-muted" />
          <span className="text-xs text-terminal-muted uppercase tracking-widest">auth_token</span>
          {savedToken && (
            <span className="ml-auto text-xs text-terminal-bright flex items-center gap-0.5">
              <Check size={10} /> active
            </span>
          )}
        </div>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="ghp_xxxxxxxxxxxx"
            className="w-full bg-terminal-surface border border-terminal-border text-terminal-text text-xs px-2.5 py-1.5 pr-8 rounded focus:outline-none focus:border-terminal-text placeholder-terminal-muted font-mono"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text transition"
          >
            {showToken ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        </div>
        <div className="flex gap-2 mt-1.5">
          <button
            onClick={handleSave}
            className={`flex-1 text-xs py-1 rounded font-mono transition border ${
              saved
                ? 'border-terminal-text text-terminal-bright'
                : 'border-terminal-border text-terminal-muted hover:border-terminal-text hover:text-terminal-text'
            }`}
          >
            {saved ? '[ saved ]' : '[ save ]'}
          </button>
          {savedToken && (
            <button
              onClick={handleClear}
              className="px-2 py-1 rounded border border-terminal-border text-terminal-muted hover:border-terminal-red hover:text-terminal-red transition"
            >
              <X size={11} />
            </button>
          )}
        </div>
        <p className="text-terminal-muted text-xs mt-2 leading-relaxed">
          5k req/hr with token.{' '}
          <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer"
            className="text-terminal-text hover:text-terminal-bright underline">
            generate
          </a>
        </p>
      </div>

    </aside>
  );
}
