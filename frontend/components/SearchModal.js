import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp, ArrowRight, CornerDownLeft } from 'lucide-react';

const POPULAR_REPOS = [
  { repo: 'torvalds/linux', desc: 'Linux kernel source tree' },
  { repo: 'microsoft/vscode', desc: 'Visual Studio Code' },
  { repo: 'facebook/react', desc: 'The library for web and native UIs' },
  { repo: 'vercel/next.js', desc: 'The React Framework' },
  { repo: 'openai/openai-python', desc: 'OpenAI Python API library' },
];

const RECENT_KEY = 'gh_recent_searches';

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(query) {
  const prev = getRecent().filter((r) => r !== query);
  const next = [query, ...prev].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function SearchModal({ open, onClose, onSearch }) {
  const [value, setValue] = useState('');
  const [recent, setRecent] = useState([]);
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

  // Ctrl+K / Cmd+K to open, Escape to close
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onSearch && onClose(); // let parent toggle
      }
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const suggestions = value.trim()
    ? POPULAR_REPOS.filter((p) =>
        p.repo.toLowerCase().includes(value.toLowerCase()) ||
        p.desc.toLowerCase().includes(value.toLowerCase())
      )
    : [];

  const recentFiltered = value.trim()
    ? recent.filter((r) => r.toLowerCase().includes(value.toLowerCase()))
    : recent;

  // Flat list of navigable items
  const navItems = [
    ...recentFiltered.map((r) => ({ type: 'recent', value: r })),
    ...suggestions.map((s) => ({ type: 'popular', value: s.repo, desc: s.desc })),
  ];

  const handleSubmit = (query) => {
    const q = (query || value).trim();
    if (!q) return;
    saveRecent(q);
    setRecent(getRecent());
    onSearch(q);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && navItems[activeIndex]) {
        handleSubmit(navItems[activeIndex].value);
      } else {
        handleSubmit();
      }
    }
  };

  const clearRecent = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  };

  if (!open) return null;

  const showRecent = recentFiltered.length > 0;
  const showPopular = suggestions.length > 0 || !value.trim();
  const popularToShow = value.trim() ? suggestions : POPULAR_REPOS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '12vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl mx-4 rounded-xl overflow-hidden shadow-2xl border border-github-border"
        style={{ background: '#161b22' }}>

        {/* Input row */}
        <div className="flex items-center px-4 py-3.5 gap-3 border-b border-github-border">
          <Search size={17} className="text-github-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setActiveIndex(-1); }}
            onKeyDown={handleKeyDown}
            placeholder="Search by owner/repo or paste a GitHub URL..."
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-github-muted"
          />
          {value && (
            <button onClick={() => { setValue(''); setActiveIndex(-1); }}
              className="text-github-muted hover:text-white transition flex-shrink-0">
              <X size={15} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-github-muted border border-github-border font-mono ml-1">
            Esc
          </kbd>
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto">

          {/* Recent searches */}
          {showRecent && (
            <div className="px-3 pt-3">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-xs text-github-muted uppercase tracking-wide flex items-center gap-1.5">
                  <Clock size={11} /> Recent
                </span>
                <button onClick={clearRecent}
                  className="text-xs text-github-muted hover:text-red-400 transition">
                  Clear
                </button>
              </div>
              {recentFiltered.map((r, i) => {
                const navIdx = i;
                const isActive = activeIndex === navIdx;
                return (
                  <button
                    key={r}
                    onMouseEnter={() => setActiveIndex(navIdx)}
                    onClick={() => handleSubmit(r)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                      isActive ? 'bg-blue-600 bg-opacity-20 text-white' : 'text-github-text hover:bg-github-border hover:bg-opacity-50'
                    }`}
                  >
                    <Clock size={13} className="text-github-muted flex-shrink-0" />
                    <span className="text-sm font-mono flex-1">{r}</span>
                    <ArrowRight size={13} className={isActive ? 'text-blue-400' : 'text-github-muted opacity-0 group-hover:opacity-100'} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Popular / Suggestions */}
          {popularToShow.length > 0 && (
            <div className={`px-3 ${showRecent ? 'pt-2' : 'pt-3'} pb-3`}>
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <TrendingUp size={11} className="text-github-muted" />
                <span className="text-xs text-github-muted uppercase tracking-wide">
                  {value.trim() ? 'Suggestions' : 'Popular'}
                </span>
              </div>
              {popularToShow.map((item, i) => {
                const navIdx = recentFiltered.length + i;
                const isActive = activeIndex === navIdx;
                return (
                  <button
                    key={item.repo}
                    onMouseEnter={() => setActiveIndex(navIdx)}
                    onClick={() => handleSubmit(item.repo)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                      isActive ? 'bg-blue-600 bg-opacity-20 text-white' : 'text-github-text hover:bg-github-border hover:bg-opacity-50'
                    }`}
                  >
                    <TrendingUp size={13} className="text-github-muted flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-mono text-white">{item.repo}</span>
                      <span className="text-xs text-github-muted ml-2">{item.desc}</span>
                    </div>
                    <ArrowRight size={13} className={isActive ? 'text-blue-400' : 'text-github-muted'} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state when typing something not in list */}
          {value.trim() && navItems.length === 0 && (
            <div className="px-3 py-3">
              <button
                onClick={() => handleSubmit()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 bg-opacity-10 hover:bg-opacity-20 text-blue-400 border border-blue-800 border-opacity-40 transition"
              >
                <Search size={13} className="flex-shrink-0" />
                <span className="text-sm font-mono flex-1 text-left">{value.trim()}</span>
                <CornerDownLeft size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-github-border flex items-center gap-4 text-xs text-github-muted">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded border border-github-border font-mono text-xs">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded border border-github-border font-mono text-xs">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded border border-github-border font-mono text-xs">Esc</kbd>
            close
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 rounded border border-github-border font-mono text-xs">Ctrl</kbd>
            +
            <kbd className="px-1 py-0.5 rounded border border-github-border font-mono text-xs">K</kbd>
            to open
          </span>
        </div>
      </div>
    </div>
  );
}
