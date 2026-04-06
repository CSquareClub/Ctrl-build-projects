import React from "react";

const DangerZone = () => {
  return (
    <section className="mt-12">
      <div className="p-8 border border-error/30 bg-error-container/5 rounded-2xl space-y-6">
        <div className="flex items-center gap-3 text-error">
          <span className="material-symbols-outlined">warning</span>
          <h3 className="font-label text-xs uppercase tracking-widest font-bold">Danger Zone</h3>
        </div>
        <p className="text-sm text-error/60 leading-relaxed max-w-2xl">
          These actions are destructive and cannot be undone. Please ensure you have backed up your local repository data before proceeding with these operations.
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="px-6 py-2.5 rounded-lg border border-error text-error text-xs font-label uppercase tracking-widest hover:bg-error hover:text-white transition-all">
            Clear All Embeddings
          </button>
          <button className="px-6 py-2.5 rounded-lg border border-error text-error text-xs font-label uppercase tracking-widest hover:bg-error hover:text-white transition-all">
            Reset All Issues
          </button>
        </div>
      </div>
    </section>
  );
};

export default DangerZone;