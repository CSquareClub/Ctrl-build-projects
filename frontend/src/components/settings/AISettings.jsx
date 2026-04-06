import React from "react";

const AISettings = () => {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="font-label text-xs uppercase tracking-[0.2em] text-primary">AI Configuration</h2>
        <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
      </div>

      <div className="space-y-8">
        {/* API Key */}
        <div className="space-y-2">
          <label className="block font-label text-[10px] uppercase text-outline">API Key</label>
          <div className="relative">
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-mono"
              type="password"
              value="sk-proj-492k1l0934812039841029384"
            />
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-lg">visibility</span>
            </button>
          </div>
        </div>

        {/* Model & Max Duplicates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block font-label text-[10px] uppercase text-outline">Model Selector</label>
            <div className="relative">
              <select className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background appearance-none terminal-glow outline-none transition-all font-body">
                <option>GPT-4o (Omni)</option>
                <option>Claude 3.5 Sonnet</option>
                <option>Llama 3 70B</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-label text-[10px] uppercase text-outline">Max Duplicates</label>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-background terminal-glow outline-none transition-all font-body"
              type="number"
              value="5"
            />
          </div>
        </div>

        {/* Similarity Slider */}
        <div className="space-y-4 bg-surface-container-low p-6 rounded-xl">
          <div className="flex justify-between items-center">
            <label className="block font-label text-[10px] uppercase text-outline">Similarity Threshold</label>
            <span className="bg-primary-container/20 text-primary-container text-[10px] font-bold px-2 py-0.5 rounded font-label border border-primary-container/30">85%</span>
          </div>
          <input
            className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary-container"
            max="100"
            min="0"
            type="range"
            value="85"
          />
          <div className="flex justify-between text-[10px] font-label text-outline/50">
            <span>LOOSE (0%)</span>
            <span>STRICT (100%)</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISettings;