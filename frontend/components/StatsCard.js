import React from 'react';

export default function StatsCard({ title, count, icon }) {
  return (
    <div className="bg-github-bg border border-github-border rounded-lg p-6 github-hover cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-github-muted text-sm font-medium mb-2">
            {title}
          </h3>
          <div className="text-3xl font-bold text-white">{count}</div>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
