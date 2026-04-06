import React from 'react';

export default function Navbar() {
  return (
    <nav className="bg-github-bg border-b border-github-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-white">
            <a href="/" className="hover:text-blue-400 transition">
              GitHub
            </a>
          </div>
          <div className="flex gap-6 items-center">
            <input
              type="search"
              placeholder="Search GitHub"
              className="bg-github-border bg-opacity-50 text-github-text px-3 py-2 rounded-lg text-sm placeholder-github-muted focus:outline-none focus:border-blue-500 focus:border"
            />
            <div className="flex gap-4">
              <button className="text-github-text hover:text-white transition">
                Profile
              </button>
              <button className="text-github-text hover:text-white transition">
                Settings
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
