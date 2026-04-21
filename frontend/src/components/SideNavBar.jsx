import React from 'react';

export default function SideNavBar() {
  return (
    <aside className="bg-slate-900 dark:bg-[#181c22] fixed left-0 top-14 h-[calc(100vh-56px)] w-60 flex flex-col py-4 gap-2 border-none">
      <div className="px-6 py-2 mb-4">
        <p className="font-mono uppercase text-[10px] tracking-tighter text-slate-500">
          Navigation
        </p>
        <p className="font-mono uppercase text-xs tracking-tighter text-blue-400">
          Management
        </p>
      </div>

      <a
        className="flex items-center gap-3 px-6 py-3 text-slate-400 dark:text-slate-500 hover:bg-slate-800 dark:hover:bg-[#262a31] hover:text-slate-200 transition-all"
        href="#"
      >
        <span className="material-symbols-outlined">dashboard</span>
        <span className="font-mono uppercase text-xs tracking-tighter">Dashboard</span>
      </a>

      <a
        className="flex items-center gap-3 px-6 py-3 text-slate-400 dark:text-slate-500 hover:bg-slate-800 dark:hover:bg-[#262a31] hover:text-slate-200 transition-all"
        href="#"
      >
        <span className="material-symbols-outlined">list_alt</span>
        <span className="font-mono uppercase text-xs tracking-tighter">Issues</span>
      </a>

      <a
        className="flex items-center gap-3 px-6 py-3 text-blue-400 dark:text-[#58a6ff] border-l-2 border-blue-400 bg-blue-400/5 translate-x-1"
        href="#"
      >
        <span className="material-symbols-outlined">rule</span>
        <span className="font-mono uppercase text-xs tracking-tighter">Triage</span>
      </a>

      <a
        className="flex items-center gap-3 px-6 py-3 text-slate-400 dark:text-slate-500 hover:bg-slate-800 dark:hover:bg-[#262a31] hover:text-slate-200 transition-all"
        href="#"
      >
        <span className="material-symbols-outlined">label</span>
        <span className="font-mono uppercase text-xs tracking-tighter">Labels</span>
      </a>

      <a
        className="flex items-center gap-3 px-6 py-3 text-slate-400 dark:text-slate-500 hover:bg-slate-800 dark:hover:bg-[#262a31] hover:text-slate-200 transition-all"
        href="#"
      >
        <span className="material-symbols-outlined">settings</span>
        <span className="font-mono uppercase text-xs tracking-tighter">Settings</span>
      </a>

      <div className="mt-auto border-t border-outline-variant/10 pt-4">
        <a
          className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-slate-200"
          href="#"
        >
          <span className="material-symbols-outlined">keyboard_double_arrow_left</span>
          <span className="font-mono uppercase text-xs tracking-tighter">Collapse</span>
        </a>
      </div>
    </aside>
  );
}
