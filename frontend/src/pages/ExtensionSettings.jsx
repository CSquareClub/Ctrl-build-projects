import { useState } from 'react';
import { Shield, LayoutGrid, Globe, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ExtensionSettings() {
  const [blockingEnabled, setBlockingEnabled] = useState(true);
  const [tabLimitEnabled, setTabLimitEnabled] = useState(true);

  return (
    <div className="flex flex-col gap-6" style={{ height: '100%' }}>
      <header>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Extension Configuration</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage declarativeNetRequest rules and browser interaction restrictions.</p>
      </header>

      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield color="var(--accent-primary)" />
          <span>Core Enforcement Rules</span>
        </h2>

        <div className="flex flex-col gap-6">
          
          <div className="flex justify-between items-center" style={{ paddingBottom: '24px', borderBottom: '1px solid var(--glass-border)' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Distraction Blocklist (declarativeNetRequest)</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
                Enables rule set <code style={{ background: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '4px' }}>distraction_blocklist</code> ID.
                Requires extension sync to apply rules locally in Chrome.
              </p>
            </div>
            <button 
              onClick={() => setBlockingEnabled(!blockingEnabled)}
              style={{ color: blockingEnabled ? 'var(--accent-success)' : 'var(--text-muted)' }}
            >
              {blockingEnabled ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
            </button>
          </div>

          <div className="flex justify-between items-center" style={{ paddingBottom: '24px', borderBottom: '1px solid var(--glass-border)' }}>
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Hard Tab Limit Enforcement</h3>
                <span style={{ fontSize: '12px', background: 'rgba(234, 67, 53, 0.2)', color: 'var(--accent-danger)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>MAX_TABS: 5</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
                When active, the extension forcefully closes any tabs opened beyond the threshold of 5 tabs to prevent context switching.
              </p>
            </div>
            <button 
              onClick={() => setTabLimitEnabled(!tabLimitEnabled)}
              style={{ color: tabLimitEnabled ? 'var(--accent-success)' : 'var(--text-muted)' }}
            >
              {tabLimitEnabled ? <ToggleRight size={48} /> : <ToggleLeft size={48} />}
            </button>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Force Auto-Block on Launch</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
                Immediately enforce blocking and point deduction the moment the study timer begins.
              </p>
            </div>
            <button style={{ color: 'var(--accent-success)' }}>
              <ToggleRight size={48} />
            </button>
          </div>

        </div>
      </div>
      
      <div className="flex gap-6 mt-4">
        <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LayoutGrid size={32} color="var(--accent-primary)" />
          <div>
            <h4 style={{ fontSize: '1.1rem' }}>Active Rule Set</h4>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>30 rules configured</span>
          </div>
        </div>
        <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Globe size={32} color="var(--accent-success)" />
          <div>
            <h4 style={{ fontSize: '1.1rem' }}>Sync Status</h4>
            <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Connected to Service Worker</span>
          </div>
        </div>
      </div>
    </div>
  );
}
