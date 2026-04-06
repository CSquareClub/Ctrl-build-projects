import React from 'react';

export default function AIInsights() {
  return (
    <section className="bg-[#e3b341]/5 border-l-[3px] border-[#e3b341] p-6 mb-8 rounded-r-lg">
      <div className="flex items-center gap-3 mb-4">
        <span className="material-symbols-outlined text-[#e3b341]">auto_awesome</span>
        <h3 className="font-mono text-sm font-bold tracking-widest uppercase text-[#e3b341]">
          AI Triage Insights
        </h3>
      </div>
      <div className="space-y-4 max-w-5xl">
        <p className="text-sm text-on-surface-variant leading-relaxed">
          This issue originates from the{' '}
          <code className="bg-[#e3b341]/20 text-[#e3b341] px-1 rounded">auth-provider-v2</code>{' '}
          module. The logs indicate a race condition during the cryptographic key rotation on non-leader nodes. This is
          highly likely a regression introduced in PR #8421.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest/50 p-4 rounded border border-outline-variant/10">
            <p className="text-[10px] font-mono text-outline mb-1 uppercase tracking-tighter">Root Cause</p>
            <p className="text-xs text-on-surface">
              Asynchronous state update latency between primary and secondary nodes exceeding 500ms.
            </p>
          </div>
          <div className="bg-surface-container-lowest/50 p-4 rounded border border-outline-variant/10">
            <p className="text-[10px] font-mono text-outline mb-1 uppercase tracking-tighter">Impact Scope</p>
            <p className="text-xs text-on-surface">All multi-region clusters running enterprise-tier v2.4.0-rc1.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
