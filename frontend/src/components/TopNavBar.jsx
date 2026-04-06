import React from 'react';

export default function TopNavBar() {
  return (
    <nav className="bg-slate-950 dark:bg-[#10141a] fixed top-0 w-full h-14 z-50 flex justify-between items-center px-6 bg-[#181c22] border-none">
      <div className="flex items-center gap-8">
        <span className="text-xl font-mono font-bold text-slate-100 dark:text-[#f0f6fc]">
          OpenIssue
        </span>
        <div className="hidden md:flex gap-6">
          <a
            className="text-sm font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-300 transition-colors duration-200"
            href="#"
          >
            Home
          </a>
          <a
            className="text-sm font-mono uppercase tracking-widest text-blue-400 dark:text-[#58a6ff] border-b-2 border-blue-400"
            href="#"
          >
            Triage
          </a>
          <a
            className="text-sm font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-300 transition-colors duration-200"
            href="#"
          >
            Dashboard
          </a>
          <a
            className="text-sm font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-blue-300 transition-colors duration-200"
            href="#"
          >
            Docs
          </a>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-slate-400">terminal</span>
        <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container text-xs font-mono font-bold py-2 px-4 rounded-lg uppercase tracking-tight">
          Connect GitHub
        </button>
      </div>
    </nav>
  );
}
