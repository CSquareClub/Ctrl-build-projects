import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Settings from "./pages/Settings";

export default function App() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="bg-background text-on-background min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full h-14 z-50 bg-surface-container-low border-none flex justify-between items-center px-6">
        <div className="flex items-center gap-8">
          <span className="text-xl font-label font-bold text-slate-100">OpenIssue</span>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-label uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Home</Link>
            <a href="#" className="text-sm font-label uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Dashboard</a>
            <a href="#" className="text-sm font-label uppercase tracking-widest text-slate-400 hover:text-primary transition-colors">Docs</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
          <Link to="/settings" className="bg-primary-container text-on-primary-container px-4 py-1.5 text-xs font-label uppercase tracking-widest rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all">
            Settings
          </Link>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="fixed left-0 top-14 h-[calc(100vh-56px)] w-60 bg-surface-container-low flex flex-col py-4 gap-2">
        <div className="px-6 py-2 mb-4">
          <h3 className="text-[10px] font-label uppercase tracking-tighter text-slate-500">Navigation</h3>
          <p className="text-xs font-body text-slate-400">Management</p>
        </div>
        <div className="flex flex-col gap-1">
          <Link to="/" className={`flex items-center gap-3 px-6 py-2 transition-all font-label uppercase text-xs tracking-tighter ${isActive("/") ? "text-primary border-l-2 border-primary bg-primary/5 translate-x-1" : "text-slate-400 hover:bg-surface-container hover:text-slate-200"}`}>
            <span className="material-symbols-outlined text-xl">home</span>
            <span>Home</span>
          </Link>
          <Link to="/settings" className={`flex items-center gap-3 px-6 py-2 transition-all font-label uppercase text-xs tracking-tighter ${isActive("/settings") ? "text-primary border-l-2 border-primary bg-primary/5 translate-x-1" : "text-slate-400 hover:bg-surface-container hover:text-slate-200"}`}>
            <span className="material-symbols-outlined text-xl">settings</span>
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-60 pt-14 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-8 lg:p-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

      {/* Side Accent */}
      <div className="fixed left-0 top-14 w-1 h-[calc(100vh-56px)] bg-primary/20 z-40">
        <div className="h-1/4 w-full bg-primary shadow-[0_0_10px_rgba(162,201,255,0.5)]"></div>
      </div>
    </div>
  );
}