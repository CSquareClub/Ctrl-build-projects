import React from 'react';

export default function ResultCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Classification Card */}
      <div className="bg-surface-container p-6 rounded-lg flex flex-col gap-4">
        <p className="font-mono uppercase text-xs tracking-widest text-outline">Classification</p>
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-error-container/20 text-error font-mono text-sm font-bold border border-error/20 rounded-sm">
            BUG
          </span>
          <span className="text-tertiary font-mono text-sm">94% confidence</span>
        </div>
      </div>

      {/* Priority Card */}
      <div className="bg-surface-container p-6 rounded-lg flex flex-col gap-4">
        <p className="font-mono uppercase text-xs tracking-widest text-outline">Priority</p>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-error-container text-on-error-container font-mono text-sm font-bold rounded-sm flex items-center gap-2">
            <span
              className="material-symbols-outlined text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            CRITICAL
          </span>
        </div>
      </div>

      {/* Suggested Labels Card */}
      <div className="bg-surface-container p-6 rounded-lg flex flex-col gap-4">
        <p className="font-mono uppercase text-xs tracking-widest text-outline">Suggested Labels</p>
        <div className="flex flex-wrap gap-2">
          {['bug', 'authentication', 'cluster', 'oidc', 'critical'].map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-sm text-[10px] font-mono text-on-surface-variant border border-outline-variant/30"
            >
              {label} <span className="material-symbols-outlined text-[12px] cursor-pointer">close</span>
            </span>
          ))}
          <button className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-sm text-[10px] font-mono text-primary border border-primary/20 hover:bg-primary/20">
            + ADD LABEL
          </button>
        </div>
      </div>
    </div>
  );
}
