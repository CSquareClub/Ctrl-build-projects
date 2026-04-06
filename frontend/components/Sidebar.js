import React from 'react';

export default function Sidebar({ userName }) {
  const menuItems = [
    { icon: '📚', label: 'Repositories', href: '#' },
    { icon: '⭐', label: 'Starred', href: '#' },
    { icon: '👥', label: 'Followers', href: '#' },
    { icon: '🔔', label: 'Notifications', href: '#' },
    { icon: '⚙️', label: 'Settings', href: '#' },
  ];

  return (
    <aside className="hidden lg:block w-64">
      <div className="bg-github-bg border border-github-border rounded-lg p-6 sticky top-20">
        <nav className="space-y-2">
          {menuItems.map((item, index) => (
            <a
              key={index}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-github-text hover:bg-github-border hover:text-white transition"
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="mt-6 pt-6 border-t border-github-border">
          <p className="text-xs text-github-muted mb-3">QUICK FILTERS</p>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 text-sm text-github-text hover:bg-github-border rounded transition">
              🔥 Trending
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-github-text hover:bg-github-border rounded transition">
              🎓 Learning
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-github-text hover:bg-github-border rounded transition">
              📌 Pinned
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
