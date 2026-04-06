import React from "react";

const AutomationSettings = () => {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="font-label text-xs uppercase tracking-[0.2em] text-primary">Automation &amp; Logic</h2>
        <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
      </div>

      <div className="space-y-4">
        {/* Toggle 1 */}
        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-transparent hover:border-outline-variant/20 transition-all">
          <div>
            <h4 className="text-sm font-semibold text-on-background">Auto-labeling</h4>
            <p className="text-xs text-outline">AI suggests labels based on issue content</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input checked className="sr-only peer" type="checkbox" />
            <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
          </label>
        </div>

        {/* Toggle 2 */}
        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-transparent hover:border-outline-variant/20 transition-all">
          <div>
            <h4 className="text-sm font-semibold text-on-background">Spam detection</h4>
            <p className="text-xs text-outline">Filter incoming noise using semantic analysis</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input checked className="sr-only peer" type="checkbox" />
            <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
          </label>
        </div>

        {/* Toggle 3 */}
        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-transparent hover:border-outline-variant/20 transition-all">
          <div>
            <h4 className="text-sm font-semibold text-on-background">Webhook notifications</h4>
            <p className="text-xs text-outline">Forward events to external endpoints</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input className="sr-only peer" type="checkbox" />
            <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
          </label>
        </div>
      </div>
    </section>
  );
};

export default AutomationSettings;