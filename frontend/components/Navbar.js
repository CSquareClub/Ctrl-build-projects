import React from 'react';

export default function Navbar() {
  const menuItems = [
    { icon: '📚', label: 'Repositories' },
    { icon: '⭐', label: 'Starred' },
    { icon: '👥', label: 'Followers' },
    { icon: '🔔', label: 'Notifications' },
    { icon: '⚙️', label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-github-bg border-r border-github-border flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-github-border">
        <h1 className="text-xl font-bold text-white">GitHub</h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item, index) => (
          <a
            key={index}
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-github-text hover:bg-github-border hover:text-white transition"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-github-border">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition font-medium">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
