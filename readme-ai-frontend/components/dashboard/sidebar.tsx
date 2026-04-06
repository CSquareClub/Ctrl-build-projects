"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  History,
  Settings,
  Plug,
  ChevronRight,
  Github,
  GitlabIcon,
  Star,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "#", active: true },
  { icon: History, label: "History", href: "#" },
  { icon: Settings, label: "API Settings", href: "#" },
  { icon: Plug, label: "Integration", href: "#" },
];

const recentRepos = [
  {
    name: "vercel/next.js",
    stars: "124.2k",
    time: "2h ago",
    icon: Github,
  },
  {
    name: "facebook/react",
    stars: "225.8k",
    time: "5h ago",
    icon: Github,
  },
  {
    name: "tailwindlabs/tailwindcss",
    stars: "81.3k",
    time: "1d ago",
    icon: Github,
  },
  {
    name: "gitlab-org/gitlab",
    stars: "8.4k",
    time: "3d ago",
    icon: GitlabIcon,
  },
];

export function Sidebar() {
  const [activeNav, setActiveNav] = useState("Dashboard");

  return (
    <aside className="w-72 h-screen glass-card flex flex-col border-r border-border/50 overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center gap-3">
            <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-purple" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-cyan))' }}>
              <span className="text-xl">🧠</span>
            </div>
            <div className="absolute -inset-1 rounded-xl blur-lg opacity-40 -z-10" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-cyan))' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-glow-purple" style={{ color: 'var(--neon-purple)' }}>
              ReadmeAI
            </h1>
            <p className="text-xs text-muted-foreground">Command Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
          Navigation
        </p>
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setActiveNav(item.label)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              activeNav === item.label
                ? "glow-purple"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
            style={activeNav === item.label ? {
              background: 'linear-gradient(to right, oklch(0.7 0.2 280 / 0.2), oklch(0.8 0.15 200 / 0.1))',
              color: 'var(--neon-purple)',
              border: '1px solid oklch(0.7 0.2 280 / 0.3)'
            } : undefined}
          >
            <item.icon
              className="w-5 h-5 transition-colors"
              style={{ color: activeNav === item.label ? 'var(--neon-purple)' : undefined }}
            />
            <span className="font-medium">{item.label}</span>
            <ChevronRight
              className={cn(
                "w-4 h-4 ml-auto transition-transform",
                activeNav === item.label ? "opacity-100" : "opacity-0 group-hover:opacity-50"
              )}
            />
          </button>
        ))}
      </nav>

      {/* Recent Repos */}
      <div className="p-4 border-t border-border/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
          Recent Repos
        </p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentRepos.map((repo, index) => (
            <button
              key={repo.name}
              className="w-full glass p-3 rounded-xl hover:bg-secondary/30 transition-all duration-200 group animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <repo.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium text-foreground truncate transition-colors group-hover:[color:var(--neon-cyan)]">
                    {repo.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="w-3 h-3" />
                    <span>{repo.stars}</span>
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{repo.time}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* User Status */}
      <div className="p-4 border-t border-border/30">
        <div className="glass p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-foreground" style={{ background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-blue))' }}>
              JD
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">John Doe</p>
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--neon-green)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--neon-green)' }} />
                Pro Plan Active
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
