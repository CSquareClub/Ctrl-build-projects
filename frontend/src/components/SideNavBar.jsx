import { Link, useLocation } from "react-router-dom";

export default function SideNavBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-[52px] h-[calc(100vh-52px)] w-[220px] flex flex-col py-8 px-4 bg-[#0b0e14] border-r border-white/5 z-40 hidden md:flex">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-violet-500">terminal</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">Workspace</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Engineering</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-transform duration-150 ease-in-out ${
            isActive("/dashboard")
              ? "text-white bg-violet-500/10"
              : "text-slate-500 hover:text-violet-400 hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span className="font-mono text-xs uppercase tracking-widest">Dashboard</span>
        </Link>

        <Link
          to="/triage"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-transform duration-150 ease-in-out ${
            isActive("/triage")
              ? "text-white bg-violet-500/10"
              : "text-slate-500 hover:text-violet-400 hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined">rule</span>
          <span className="font-mono text-xs uppercase tracking-widest">Triage</span>
        </Link>

        <div className="mt-6">
          <Link
            to="/"
            className="block w-full py-2 px-3 bg-primary-container text-white text-xs font-mono uppercase tracking-widest rounded-md hover:shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all text-center"
          >
            New Issue
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-violet-400 hover:bg-white/5 transition-transform duration-150 ease-in-out"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-mono text-xs uppercase tracking-widest">Settings</span>
        </Link>

        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-violet-400 hover:bg-white/5 transition-transform duration-150 ease-in-out"
        >
          <span className="material-symbols-outlined">description</span>
          <span className="font-mono text-xs uppercase tracking-widest">Docs</span>
        </a>
      </div>
    </aside>
  );
}
