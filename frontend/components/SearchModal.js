import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp, ArrowRight, CornerDownLeft } from 'lucide-react';

const POPULAR_REPOS = [
  { repo: 'torvalds/linux',          desc: 'Linux kernel source tree' },
  { repo: 'microsoft/vscode',        desc: 'Visual Studio Code' },
  { repo: 'facebook/react',          desc: 'The library for web and native UIs' },
  { repo: 'vercel/next.js',          desc: 'The React Framework' },
  { repo: 'openai/openai-python',    desc: 'OpenAI Python API library' },
];

const RECENT_KEY = 'gh_recent_searches';

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function saveRecent(query) {
  const next = [query, ...getRecent().filter((r) => r !== query)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function SearchModal({ open, onClose, onSearch }) {
  const [value, setValue]       = useState('');
  const [recent, setRecent]     = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setActiveIndex(-1);
      setRecent(getRecent());
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const recentFiltered  = value.trim()
    ? recent.filter((r) => r.toLowerCase().includes(value.toLowerCase()))
    : recent;

  const suggestions = value.trim()
    ? POPULAR_REPOS.filter((p) =>
        p.repo.toLowerCase().includes(value.toLowerCase()) ||
        p.desc.toLowerCase().includes(value.toLowerCase()))
    : [];

  const popularToShow = value.trim() ? suggestions : POPULAR_REPOS;

  const navItems = [
    ...recentFiltered.map((r) => ({ type: 'recent', value: r })),
    ...popularToShow.map((s) => ({ type: 'popular', value: s.repo, desc: s.desc })),
  ];

  const handleSubmit = (query) => {
    const q = (query || value).trim();
    if (!q) return;
    saveRecent(q);
    onSearch(q);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, navItems.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      activeIndex >= 0 && navItems[activeIndex]
        ? handleSubmit(navItems[activeIndex].value)
        : handleSubmit();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '10vh', background: 'rgba(0,0,0,0.85)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl mx-4 border border-terminal-text rounded overflow-hidden font-mono"
        style={{ background: '#000', boxShadow: '0 0 40px rgba(34,197,94,0.2)' }}>

        {/* title bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-terminal-border bg-terminal-surface">
          <span className="text-terminal-muted text-xs">synapse</span>
          <span className="text-terminal-border text-xs">—</span>
          <span className="text-terminal-text text-xs">search repository</span>
          <button onClick={onClose} className="ml-auto text-terminal-muted hover:text-terminal-red transition">
            <X size={13} />
          </button>
        </div>

        {/* input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-terminal-border">
          <span className="text-terminal-bright text-sm flex-shrink-0">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="owner/repo or full GitHub URL..."
            className="flex-1 bg-transparent text-terminal-text text-sm focus:outline-none placeholder-terminal-muted caret-terminal-bright"
          />
          {value && (
            <button onClick={() => { setValue(''); setActiveIndex(-1); }}
              className="text-terminal-muted hover:text-terminal-text transition">
              <X size={13} />
            </button>
          )}
        </div>

        {/* results */}
        <div className="max-h-80 overflow-y-auto">

          {recentFiltered.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-terminal-muted text-xs flex items-center gap-1.5">
                  <Clock size={10} /> recent
                </span>
                <button onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}
                  className="text-xs text-terminal-muted hover:text-terminal-red transition">clear</button>
              </div>
              {recentFiltered.map((r, i) => {
                const isActive = activeIndex === i;
                return (
                  <button key={r} onMouseEnter={() => setActiveIndex(i)} onClick={() => handleSubmit(r)}
                    className={`w-full flex items-center gap-3 px-2 py-2 text-left transition rounded ${
                      isActive ? 'bg-terminal-dim text-terminal-bright' : 'text-terminal-text hover:bg-terminal-dim'
                    }`}>
                    <Clock size={11} className="text-terminal-muted flex-shrink-0" />
                    <span className="flex-1 text-xs">{r}</span>
                    <ArrowRight size={11} className={isActive ? 'text-terminal-bright' : 'text-terminal-muted'} />
                  </button>
                );
              })}
            </div>
          )}

          {popularToShow.length > 0 && (
            <div className="px-4 pt-2 pb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={10} className="text-terminal-muted" />
                <span className="text-terminal-muted text-xs">{value.trim() ? 'suggestions' : 'popular'}</span>
              </div>
              {popularToShow.map((item, i) => {
                const navIdx = recentFiltered.length + i;
                const isActive = activeIndex === navIdx;
                return (
                  <button key={item.repo} onMouseEnter={() => setActiveIndex(navIdx)} onClick={() => handleSubmit(item.repo)}
                    className={`w-full flex items-center gap-3 px-2 py-2 text-left transition rounded ${
                      isActive ? 'bg-terminal-dim text-terminal-bright' : 'text-terminal-text hover:bg-terminal-dim'
                    }`}>
                    <TrendingUp size={11} className="text-terminal-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-terminal-bright">{item.repo}</span>
                      <span className="text-xs text-terminal-muted ml-2">{item.desc}</span>
                    </div>
                    <ArrowRight size={11} className={isActive ? 'text-terminal-bright' : 'text-terminal-muted'} />
                  </button>
                );
              })}
            </div>
          )}

          {value.trim() && navItems.length === 0 && (
            <div className="px-4 py-3">
              <button onClick={() => handleSubmit()}
                className="w-full flex items-center gap-3 px-3 py-2.5 border border-terminal-text rounded text-terminal-bright text-left hover:bg-terminal-dim transition">
                <Search size={12} className="flex-shrink-0" />
                <span className="flex-1 text-xs">{value.trim()}</span>
                <CornerDownLeft size={12} />
              </button>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-4 py-2 border-t border-terminal-border flex items-center gap-4 text-xs text-terminal-muted bg-terminal-surface">
          <span><kbd className="border border-terminal-border px-1 rounded text-xs">↑↓</kbd> navigate</span>
          <span><kbd className="border border-terminal-border px-1 rounded text-xs">↵</kbd> open</span>
          <span><kbd className="border border-terminal-border px-1 rounded text-xs">Esc</kbd> close</span>
          <span className="ml-auto">
            <kbd className="border border-terminal-border px-1 rounded text-xs">Ctrl+K</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
