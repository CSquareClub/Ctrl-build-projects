import { useState } from "react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [showPassword, setShowPassword] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(72);
  const [autoLabeling, setAutoLabeling] = useState(true);
  const [spamDetection, setSpamDetection] = useState(true);
  const [webhookIntegration, setWebhookIntegration] = useState(false);
  const [showToasts, setShowToasts] = useState(true);

  return (
    <div className="flex pt-[52px] min-h-screen">
      {/* Settings SideNavBar */}
      <aside className="fixed left-0 top-[52px] h-[calc(100vh-52px)] w-[220px] bg-[#0b0e14] border-r border-white/5 flex flex-col py-8 px-4 z-40">
        <div className="mb-8">
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-8 h-8 bg-surface-container-high rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-500">settings</span>
            </div>
            <div>
              <div className="text-white font-bold font-headline">Settings</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Workspace</div>
            </div>
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                activeTab === "general"
                  ? "text-white bg-violet-500/10 border-l-2 border-violet-500"
                  : "text-slate-500 hover:text-violet-400 hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-violet-400">tune</span>
              <span className="font-mono text-xs uppercase tracking-widest">General</span>
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                activeTab === "ai"
                  ? "text-white bg-violet-500/10 border-l-2 border-violet-500"
                  : "text-slate-500 hover:text-violet-400 hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined">psychology</span>
              <span className="font-mono text-xs uppercase tracking-widest">AI Config</span>
            </button>
            <button
              onClick={() => setActiveTab("integrations")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                activeTab === "integrations"
                  ? "text-white bg-violet-500/10 border-l-2 border-violet-500"
                  : "text-slate-500 hover:text-violet-400 hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined">hub</span>
              <span className="font-mono text-xs uppercase tracking-widest">Integrations</span>
            </button>
            <button
              onClick={() => setActiveTab("danger")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                activeTab === "danger"
                  ? "text-red-400 bg-red-500/10 border-l-2 border-red-500"
                  : "text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
              }`}
            >
              <span className="material-symbols-outlined">dangerous</span>
              <span className="font-mono text-xs uppercase tracking-widest">Danger Zone</span>
            </button>
          </nav>
        </div>
        <div className="mt-auto border-t border-white/5 pt-6 space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-violet-400 transition-all"
          >
            <span className="material-symbols-outlined">description</span>
            <span className="font-mono text-xs uppercase tracking-widest">Docs</span>
          </a>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="ml-[220px] flex-1 px-12 py-12 max-w-5xl">
        <header className="mb-12">
          <h1 className="font-headline text-4xl font-bold tracking-tight text-white mb-2">Workspace Settings</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Configure your intelligent triage environment and AI processing parameters.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-12">
          {/* General Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-xs text-violet-500 font-bold uppercase tracking-[0.2em]">01</span>
              <h2 className="font-headline text-xl font-medium text-white">General Configuration</h2>
            </div>
            <div className="glass-card rounded-xl p-8 space-y-6 border border-white/5">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">Project Name</label>
                  <input
                    className="terminal-input w-full px-4 py-3 rounded-lg text-white font-headline"
                    type="text"
                    defaultValue="OpenIssue"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">
                    Default Repository
                  </label>
                  <input
                    className="terminal-input w-full px-4 py-3 rounded-lg text-white font-headline"
                    type="text"
                    defaultValue="open-source/openissue-core"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* AI Config Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-xs text-violet-500 font-bold uppercase tracking-[0.2em]">02</span>
              <h2 className="font-headline text-xl font-medium text-white">AI Engine Parameters</h2>
            </div>
            <div className="glass-card rounded-xl p-8 space-y-10 border border-white/5">
              {/* API Key */}
              <div className="space-y-4">
                <label className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">
                  Provider API Key (Anthropic)
                </label>
                <div className="relative">
                  <input
                    className="terminal-input w-full px-4 py-3 rounded-lg text-violet-300 font-mono text-sm tracking-widest"
                    readOnly
                    type={showPassword ? "text" : "password"}
                    value="sk-ant-••••••••••••••••"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Model & Threshold */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">
                    Embedding Model
                  </label>
                  <div className="relative">
                    <select className="terminal-input w-full px-4 py-3 rounded-lg text-white appearance-none cursor-pointer">
                      <option>text-embedding-3-small</option>
                      <option>text-embedding-3-large</option>
                      <option>ada-v2</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      expand_more
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">
                      Similarity Threshold
                    </label>
                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded border border-violet-500/30">
                      {similarityThreshold}%
                    </span>
                  </div>
                  <input
                    className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-violet-500"
                    type="range"
                    min="0"
                    max="100"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(e.target.value)}
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                    <span>LOOSE</span>
                    <span>EXACT</span>
                  </div>
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="grid grid-cols-1 gap-4 pt-4">
                {/* Toggle Item */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                  <div>
                    <h4 className="text-sm font-medium text-white">Auto-labeling Engine</h4>
                    <p className="text-xs text-slate-500">
                      Automatically categorize incoming issues using vector similarity.
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoLabeling(!autoLabeling)}
                    className="relative inline-flex items-center cursor-pointer"
                  >
                    <div className={`w-10 h-5 rounded-full ${autoLabeling ? "bg-violet-600" : "bg-slate-700"}`}></div>
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                        autoLabeling ? "left-6" : "left-0.5"
                      }`}
                    ></div>
                  </button>
                </div>

                {/* Toggle Item */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                  <div>
                    <h4 className="text-sm font-medium text-white">Spam Detection</h4>
                    <p className="text-xs text-slate-500">
                      Filter out low-quality reports and duplicate bot messages.
                    </p>
                  </div>
                  <button
                    onClick={() => setSpamDetection(!spamDetection)}
                    className="relative inline-flex items-center cursor-pointer"
                  >
                    <div className={`w-10 h-5 rounded-full ${spamDetection ? "bg-violet-600" : "bg-slate-700"}`}></div>
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                        spamDetection ? "left-6" : "left-0.5"
                      }`}
                    ></div>
                  </button>
                </div>

                {/* Toggle Item (OFF) */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 opacity-80">
                  <div>
                    <h4 className="text-sm font-medium text-white">Webhook Bot Integration</h4>
                    <p className="text-xs text-slate-500">
                      Post triage results directly to configured repository webhooks.
                    </p>
                  </div>
                  <button
                    onClick={() => setWebhookIntegration(!webhookIntegration)}
                    className="relative inline-flex items-center cursor-pointer"
                  >
                    <div
                      className={`w-10 h-5 rounded-full ${webhookIntegration ? "bg-violet-600" : "bg-slate-700"}`}
                    ></div>
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                        webhookIntegration ? "left-6 bg-white" : "left-0.5 bg-slate-400"
                      }`}
                    ></div>
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowToasts(true)}
                  className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.01] active:scale-95 font-headline text-sm tracking-wider"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </section>

          {/* Danger Zone Section */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-xs text-red-500 font-bold uppercase tracking-[0.2em]">03</span>
              <h2 className="font-headline text-xl font-medium text-white">System Destructive Actions</h2>
            </div>
            <div className="bg-red-500/5 rounded-xl p-8 border border-red-500/20">
              <h3 className="font-mono text-sm text-red-500 font-bold uppercase tracking-widest mb-4">Danger Zone</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <button className="flex-1 px-6 py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg font-headline text-sm font-medium transition-all">
                  Clear Vector Embeddings
                </button>
                <button className="flex-1 px-6 py-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg font-headline text-sm font-medium transition-all">
                  Reset All Workspace Data
                </button>
              </div>
              <p className="mt-4 text-xs text-red-400/60 text-center">
                These actions are irreversible. Please proceed with extreme caution.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Floating Toasts Container */}
      {showToasts && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
          {/* Success Toast */}
          <div className="glass-card w-[320px] rounded-lg border-l-4 border-violet-500 p-4 shadow-2xl pointer-events-auto flex gap-4 animate-in slide-in-from-right duration-300">
            <span className="material-symbols-outlined text-violet-400">check_circle</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-white font-headline">Success</div>
              <div className="text-xs text-slate-400">Configuration saved successfully.</div>
            </div>
            <button onClick={() => setShowToasts(false)} className="text-slate-600 hover:text-white">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
