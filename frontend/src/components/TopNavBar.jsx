import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TopNavBar({ currentPage = 'HOME' }) {
  const navigate = useNavigate();

  const isActive = (page) => currentPage === page;
  const navLinkClass = (page) =>
    isActive(page)
      ? 'text-sm font-mono uppercase tracking-widest text-blue-400 dark:text-[#58a6ff] border-b-2 border-blue-400'
      : 'text-sm font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-300 dark:hover:text-[#a2c9ff] transition-colors duration-200';

  return (
    <nav className="bg-slate-950 dark:bg-[#10141a] fixed top-0 w-full h-14 z-50 flex justify-between items-center px-6 border-none">
      <div className="flex items-center gap-8">
        <span className="text-xl font-mono font-bold text-slate-100 dark:text-[#f0f6fc] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
          OpenIssue
        </span>
        <div className="hidden md:flex gap-6">
          <button
            className={navLinkClass('HOME')}
            onClick={() => navigate('/')}
          >
            Home
          </button>
          <button
            className={navLinkClass('TRIAGE')}
            onClick={() => navigate('/triage')}
          >
            Triage
          </button>
          <a
            className="text-sm font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-300 dark:hover:text-[#a2c9ff] transition-colors duration-200 cursor-pointer"
            href="#"
          >
            Dashboard
          </a>
          <a
            className="text-sm font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-300 dark:hover:text-[#a2c9ff] transition-colors duration-200 cursor-pointer"
            href="#"
          >
            Docs
          </a>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="material-symbols-outlined text-slate-400 hover:text-blue-300 dark:hover:text-[#a2c9ff] transition-colors cursor-pointer">
          terminal
        </button>
        <button className="bg-primary-container text-on-primary-container text-xs font-mono font-bold py-2 px-4 rounded-lg uppercase tracking-tight hover:opacity-90 active:scale-95 transition-all">
          Connect GitHub
        </button>
      </div>
    </nav>
  );
}
