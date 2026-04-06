import { Link, useLocation } from "react-router-dom";

export default function TopNavBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 bg-white/5 backdrop-blur-md border-b border-white/10 h-[52px] shadow-[0_0_20px_rgba(124,58,237,0.15)]">
      <div className="flex items-center gap-2 text-xl font-bold text-slate-50 font-headline tracking-tight">
        <span className="material-symbols-outlined text-violet-400" style={{ fontVariationSettings: "'FILL' 1" }}>
          terminal
        </span>
        OpenIssue
      </div>

      <nav className="hidden md:flex items-center gap-8 font-headline tracking-tight">
        <Link 
          to="/" 
          className={isActive("/") ? "text-violet-400 border-b-2 border-violet-500 pb-1" : "text-slate-400 hover:text-slate-100 transition-colors"}
        >
          Home
        </Link>
        <Link 
          to="/triage" 
          className={isActive("/triage") ? "text-violet-400 border-b-2 border-violet-500 pb-1" : "text-slate-400 hover:text-slate-100 transition-colors"}
        >
          Triage
        </Link>
        <a href="#" className="text-slate-400 hover:text-slate-100 transition-colors">
          Dashboard
        </a>
        <Link 
          to="/settings" 
          className={isActive("/settings") ? "text-violet-400 border-b-2 border-violet-500 pb-1" : "text-slate-400 hover:text-slate-100 transition-colors"}
        >
          Settings
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        <span className="text-xs font-label text-slate-500">v1.0.0</span>
        <img 
          alt="User Avatar" 
          className="w-7 h-7 rounded-full border border-white/10" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuACGyvDWF_mR6TFTDBUzMVmBZNKpNu4i1uPZIT4vYKyxLkpCTJtmaQ7qmReWwt18KyT4qqYZVzZFtd0rKKFSqPus0mrtC98hVMJi2GfgmagbJ9eCuh7uuvjT8l2s-fpiqBENgXwgtGfUJ6x7YTsNWlfC5jhWEZ9dV5IuiZnVAk6TPSm2addECqiMfzzW49c3AvlwH0lSfooeTYx2txe2-RmoiIW2EL7yvXZAXwtMjH1HMjWDAme4kcl5A1kA5zIt8zkLFj9cKRZ84Hu" 
        />
      </div>
    </header>
  );
}
