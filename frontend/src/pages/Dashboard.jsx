import { useState } from "react";

export default function Dashboard() {
  const [selectedIssue, setSelectedIssue] = useState(null);

  const issues = [
    {
      id: 1284,
      title: "Authentication middleware failing on edge nodes",
      reporter: "AI Agent #4",
      time: "12m ago",
      type: "BUG",
      priority: "CRITICAL",
      duplicates: 4,
      status: "Triaging",
      statusColor: "violet",
    },
    {
      id: 1283,
      title: "Memory leak in websocket pool manager",
      reporter: "internal-monitor",
      time: "45m ago",
      type: "BUG",
      priority: "HIGH",
      duplicates: null,
      status: "Open",
      statusColor: "slate",
    },
  ];

  return (
    <>
      <main className="md:ml-[220px] pt-[80px] px-8 pb-12 bg-dot-grid min-h-screen">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-headline font-bold tracking-tighter text-white mb-1">
              Issue Intelligence
            </h1>
            <p className="text-slate-500 text-sm">
              Real-time triage overview and automated prioritization engine.
            </p>
          </div>
          <button className="bg-primary-container text-white px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all">
            <span className="material-symbols-outlined !text-[16px]">north</span>
            New Issue
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/5 p-5 rounded-xl group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-white/20"></div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Total Issues</p>
            <p className="text-3xl font-headline font-bold text-white">1,284</p>
          </div>
          <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/5 p-5 rounded-xl group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-orange-500"></div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Duplicates</p>
            <p className="text-3xl font-headline font-bold text-white">14</p>
          </div>
          <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/5 p-5 rounded-xl group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-error"></div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Critical</p>
            <p className="text-3xl font-headline font-bold text-white">7</p>
          </div>
          <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/5 p-5 rounded-xl group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-tertiary"></div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1">Resolved</p>
            <p className="text-3xl font-headline font-bold text-white">23</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group flex-1 md:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors">
                search
              </span>
              <input
                className="w-full bg-surface-container-lowest border-outline-variant/20 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-slate-600 outline-none"
                placeholder="Search issues, logs, or tags..."
                type="text"
              />
            </div>
            <div className="flex items-center bg-surface-container-low p-1 rounded-lg">
              <button className="p-1.5 bg-surface-container-high rounded text-white">
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button className="p-1.5 text-slate-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">list</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select className="bg-surface-container-lowest border-outline-variant/20 rounded-lg px-4 py-2 text-xs font-mono text-slate-300 focus:ring-0 outline-none appearance-none cursor-pointer hover:bg-surface-container-low transition-colors">
              <option>STATUS: ALL</option>
              <option>STATUS: OPEN</option>
              <option>STATUS: TRIAGED</option>
            </select>
            <select className="bg-surface-container-lowest border-outline-variant/20 rounded-lg px-4 py-2 text-xs font-mono text-slate-300 focus:ring-0 outline-none appearance-none cursor-pointer hover:bg-surface-container-low transition-colors">
              <option>SORT: NEWEST</option>
              <option>SORT: PRIORITY</option>
              <option>SORT: RECENT</option>
            </select>
          </div>
        </div>

        {/* Issues Table */}
        <div className="bg-surface-container-low rounded-xl overflow-hidden border border-white/5">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/50 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">#</th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Issue</th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Duplicates</th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="group hover:bg-violet-500/5 transition-colors cursor-pointer border-l-2 border-transparent hover:border-violet-500"
                >
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{issue.id}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-white mb-0.5">{issue.title}</p>
                    <p className="text-xs text-slate-500">Reported {issue.time} by {issue.reporter}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {issue.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono ${
                      issue.priority === "CRITICAL"
                        ? "bg-error/10 text-error border border-error/20"
                        : "bg-secondary/10 text-secondary border border-secondary/20"
                    }`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {issue.duplicates ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        {issue.duplicates} DUPLICATES
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        issue.statusColor === "violet" ? "bg-violet-500 animate-pulse" : "bg-slate-600"
                      }`}></div>
                      <span className="text-xs text-slate-300">{issue.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-500 hover:text-white transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </td>
                </tr>
              ))}

              {/* Skeleton Rows */}
              {[1, 2].map((i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-6 py-6">
                    <div className="h-2 w-8 bg-surface-container-highest rounded shimmer"></div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="h-3 w-48 bg-surface-container-highest rounded shimmer mb-2"></div>
                    <div className="h-2 w-32 bg-surface-container-highest rounded shimmer"></div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="h-4 w-12 bg-surface-container-highest rounded shimmer"></div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="h-4 w-16 bg-surface-container-highest rounded shimmer"></div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="h-4 w-20 bg-surface-container-highest rounded shimmer"></div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="h-2 w-16 bg-surface-container-highest rounded shimmer"></div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="h-4 w-4 bg-surface-container-highest rounded shimmer ml-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Right Drawer */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] flex justify-end">
          <aside className="w-full max-w-[400px] h-full bg-surface-container border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden">
            {/* Glass Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">dock_to_right</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Issue Detail #{selectedIssue.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-xl font-headline font-bold text-white mb-4">{selectedIssue.title}</h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500 text-white">BUG</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-error text-white">CRITICAL</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/10">
                    EDGE-LOC-SFO
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">AI Intelligence Summary</p>
                <div className="bg-surface-container-lowest p-4 rounded-lg border border-white/5 relative group overflow-hidden">
                  <div className="absolute inset-0 bg-violet-500/5 opacity-50"></div>
                  <p className="text-sm text-slate-300 leading-relaxed relative z-10">
                    Detection of recurring <code className="text-violet-400 bg-violet-400/10 px-1 rounded">502 Bad Gateway</code> errors
                    across 14 edge clusters. Patterns suggest a race condition in the JWT validation handshake during peak ingress.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Stack Trace / Log Preview</p>
                <pre className="bg-surface-container-lowest p-4 rounded-lg border border-white/5 font-mono text-[11px] text-slate-400 overflow-x-auto">
{`[ERROR] 2023-11-20 14:02:11.902
Context: edge-proxy-04
Trace: auth.middleware.go:214
Msg: "Failed to resolve signature key"
Details: {
  "provider": "auth0",
  "retry_count": 3,
  "status": "timeout"
}`}
                </pre>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Suggested Labels</p>
                <div className="flex gap-2">
                  <button className="bg-surface-container-high hover:bg-surface-bright text-[10px] font-mono px-3 py-1 rounded border border-white/10 transition-colors text-slate-300">
                    + INFRASTRUCTURE
                  </button>
                  <button className="bg-surface-container-high hover:bg-surface-bright text-[10px] font-mono px-3 py-1 rounded border border-white/10 transition-colors text-slate-300">
                    + SECURITY
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Footer Actions */}
            <div className="p-6 border-t border-white/5 bg-surface-container-high/50 backdrop-blur-md flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button className="w-full py-2.5 bg-surface-container-highest text-white text-xs font-medium rounded-lg border border-white/10 hover:bg-surface-bright transition-colors">
                  Apply Labels
                </button>
                <button className="w-full py-2.5 bg-tertiary-container text-tertiary text-xs font-medium rounded-lg hover:brightness-110 transition-all">
                  Resolve
                </button>
              </div>
              <button className="w-full py-2.5 bg-white/5 text-slate-300 text-xs font-medium rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 transition-colors">
                View on GitHub
                <span className="material-symbols-outlined !text-[14px]">open_in_new</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
