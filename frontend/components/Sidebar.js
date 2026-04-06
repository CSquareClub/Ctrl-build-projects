import React from 'react';
import { BookMarked, Star, Users, Bell, Settings, TrendingUp, GraduationCap, Pin } from 'lucide-react';

export default function Sidebar({ userName }) {
  const menuItems = [
    { icon: BookMarked, label: 'Repositories', href: '#' },
    { icon: Star, label: 'Starred', href: '#' },
    { icon: Users, label: 'Followers', href: '#' },
    { icon: Bell, label: 'Notifications', href: '#' },
    { icon: Settings, label: 'Settings', href: '#' },
  ];

  const quickFilters = [
    { icon: TrendingUp, label: 'Trending' },
    { icon: GraduationCap, label: 'Learning' },
    { icon: Pin, label: 'Pinned' },
  ];

  return (
    <aside className="hidden lg:block w-64">
      <div className="bg-github-bg border border-github-border rounded-lg p-6 sticky top-20">
        <nav className="space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <a
                key={index}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-github-text hover:bg-github-border hover:text-white transition"
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="font-medium text-sm">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="mt-6 pt-6 border-t border-github-border">
          <p className="text-xs text-github-muted mb-3 uppercase tracking-wide">Quick Filters</p>
          <div className="space-y-1">
            {quickFilters.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm text-github-text hover:bg-github-border rounded transition"
                >
                  <Icon size={14} className="flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
