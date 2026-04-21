import React from 'react';

export default function DuplicatesList() {
  const duplicates = [
    {
      id: 7732,
      title: 'OIDC secret rotation fails under high load',
      similarity: 88,
      status: 'Open',
      description:
        'The secret rotation process seems to hang when the cluster is under heavy write load. Specifically, the secondaries don\'t seem to receive the heartbeat update fast enough...',
      expanded: true,
    },
    {
      id: 7801,
      title: 'Node synchronization delay in multi-region setups',
      similarity: 62,
      status: 'Closed',
      expanded: false,
    },
    {
      id: 7644,
      title: 'Cluster node failure during cert-manager upgrade',
      similarity: 45,
      status: 'Closed',
      expanded: false,
    },
  ];

  return (
    <section className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-headline text-lg font-bold">Possible Duplicates</h2>
        <span className="bg-surface-container-high text-primary font-mono text-xs px-2 py-0.5 rounded-sm">
          {duplicates.length}
        </span>
      </div>
      <div className="space-y-4">
        {duplicates.map((duplicate) => (
          <div
            key={duplicate.id}
            className={`rounded-lg overflow-hidden border ${
              duplicate.expanded
                ? 'bg-surface-container border-primary/20'
                : 'bg-surface-container hover:bg-surface-container-high transition-colors'
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-primary font-bold hover:underline cursor-pointer mb-2">
                    #{duplicate.id}: {duplicate.title}
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-48">
                      <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full"
                          style={{ width: `${duplicate.similarity}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono text-outline">{duplicate.similarity}%</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                        duplicate.status === 'Open'
                          ? 'bg-tertiary-container/20 text-tertiary border-tertiary/20'
                          : 'bg-secondary-container/20 text-secondary border-outline-variant/30'
                      }`}
                    >
                      {duplicate.status}
                    </span>
                  </div>
                </div>
                <button className="text-[10px] font-mono font-bold text-primary tracking-widest flex items-center gap-1 hover:translate-x-1 transition-transform">
                  VIEW ISSUE <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
                </button>
              </div>

              {duplicate.expanded && duplicate.description && (
                <div className="bg-surface-container-lowest p-4 rounded-lg mt-4 border-l-[2px] border-[#58a6ff]">
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-4">{duplicate.description}</p>
                  <div className="h-1 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-primary/40 w-1/3"></div>
                  </div>
                  <p className="text-[9px] font-mono text-outline mt-2 uppercase">Cross-referencing telemetry logs...</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
