import React from 'react';

export default function ActionButtonsBar() {
  return (
    <div className="fixed bottom-0 right-0 left-60 bg-surface/90 backdrop-blur-md p-4 px-8 flex justify-end items-center gap-4 border-t border-outline-variant/10 z-40">
      <button className="px-6 py-2 border border-outline-variant text-on-surface text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container-high transition-colors">
        Re-analyze
      </button>
      <button className="px-6 py-2 border border-tertiary text-tertiary text-xs font-mono font-bold uppercase tracking-widest rounded-lg hover:bg-tertiary/10 transition-colors">
        Mark Resolved
      </button>
      <button className="bg-gradient-to-br from-primary to-primary-container px-8 py-2 text-on-primary-container text-xs font-mono font-bold uppercase tracking-widest rounded-lg shadow-xl hover:scale-[1.02] transition-transform">
        Apply Labels
      </button>
    </div>
  );
}
