import { useState, useEffect } from 'react';
import { Cpu, Bell, Shield, Tag, Webhook, LogOut, Save, Check, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

interface SettingsPageProps {
  onLogout: () => void;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-800">
        <Icon className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0">
        <div className="text-sm text-zinc-200">{label}</div>
        {description && <div className="text-xs text-zinc-600 mt-0.5">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0',
        checked ? 'bg-violet-600' : 'bg-zinc-700'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-violet-500 transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
    </div>
  );
}

export function SettingsPage({ onLogout }: SettingsPageProps) {
  // AI / Model settings
  const [model, setModel] = useState('qwen2.5-72b');
  const [temperature, setTemperature] = useState('0.2');
  const [maxTokens, setMaxTokens] = useState('1024');

  // Triage settings
  const [autoLabel, setAutoLabel] = useState(true);
  const [autoDuplicate, setAutoDuplicate] = useState(true);
  const [priorityThreshold, setPriorityThreshold] = useState('70');
  const [triageModel, setTriageModel] = useState('full');

  // Moderation settings
  const [autoBlock, setAutoBlock] = useState(true);
  const [secretScan, setSecretScan] = useState(true);
  const [toxicityDetect, setToxicityDetect] = useState(true);
  const [moderationSensitivity, setModerationSensitivity] = useState('medium');

  // Notification settings
  const [notifyBlock, setNotifyBlock] = useState(true);
  const [notifyFlag, setNotifyFlag] = useState(true);
  const [notifyTriage, setNotifyTriage] = useState(false);
  const [notifyReadme, setNotifyReadme] = useState(false);

  // Webhook settings
  const [webhookEvents, setWebhookEvents] = useState('all');
  const [retryFailed, setRetryFailed] = useState(true);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gitwise_settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.model) setModel(s.model);
        if (s.temperature) setTemperature(s.temperature);
        if (s.maxTokens) setMaxTokens(s.maxTokens);
        if (s.autoLabel !== undefined) setAutoLabel(s.autoLabel);
        if (s.autoDuplicate !== undefined) setAutoDuplicate(s.autoDuplicate);
        if (s.priorityThreshold) setPriorityThreshold(s.priorityThreshold);
        if (s.triageModel) setTriageModel(s.triageModel);
        if (s.autoBlock !== undefined) setAutoBlock(s.autoBlock);
        if (s.secretScan !== undefined) setSecretScan(s.secretScan);
        if (s.toxicityDetect !== undefined) setToxicityDetect(s.toxicityDetect);
        if (s.moderationSensitivity) setModerationSensitivity(s.moderationSensitivity);
        if (s.notifyBlock !== undefined) setNotifyBlock(s.notifyBlock);
        if (s.notifyFlag !== undefined) setNotifyFlag(s.notifyFlag);
        if (s.notifyTriage !== undefined) setNotifyTriage(s.notifyTriage);
        if (s.notifyReadme !== undefined) setNotifyReadme(s.notifyReadme);
        if (s.webhookEvents) setWebhookEvents(s.webhookEvents);
        if (s.retryFailed !== undefined) setRetryFailed(s.retryFailed);
      }
    } catch { /* ignore parse errors */ }
  }, []);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Persist settings to localStorage so they survive page reloads
    try {
      localStorage.setItem('gitwise_settings', JSON.stringify({
        model, temperature, maxTokens, autoLabel, autoDuplicate,
        priorityThreshold, triageModel, autoBlock, secretScan,
        toxicityDetect, moderationSensitivity, notifyBlock, notifyFlag,
        notifyTriage, notifyReadme, webhookEvents, retryFailed,
      }));
    } catch { /* ignore quota errors */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">

      {/* AI Model */}
      <Section title="AI Model" icon={Cpu}>
        <Row label="Model" description="Open-source model used for all inference tasks">
          <Select
            value={model}
            onChange={setModel}
            options={[
              { value: 'qwen2.5-72b', label: 'Qwen2.5 72B (default)' },
              { value: 'llama-3-8b', label: 'Llama 3 8B (faster)' },
              { value: 'llama3-70b', label: 'Llama 3 70B' },
              { value: 'codellama-34b', label: 'CodeLlama 34B' },
            ]}
          />
        </Row>
        <Row label="Temperature" description="Lower = more deterministic. Recommended: 0.1–0.3 for triage">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-28 accent-violet-500"
            />
            <span className="text-xs text-zinc-300 tabular-nums w-6">{temperature}</span>
          </div>
        </Row>
        <Row label="Max output tokens" description="Maximum tokens per AI response">
          <Select
            value={maxTokens}
            onChange={setMaxTokens}
            options={[
              { value: '512', label: '512' },
              { value: '1024', label: '1024 (default)' },
              { value: '2048', label: '2048' },
              { value: '4096', label: '4096' },
            ]}
          />
        </Row>
      </Section>

      {/* Issue Triage */}
      <Section title="Issue Triage" icon={Tag}>
        <Row label="Auto-apply labels" description="Automatically push AI-suggested labels to GitHub issues">
          <Toggle checked={autoLabel} onChange={setAutoLabel} />
        </Row>
        <Row label="Duplicate detection" description="Check every new issue against existing ones using semantic search">
          <Toggle checked={autoDuplicate} onChange={setAutoDuplicate} />
        </Row>
        <Row label="Priority threshold" description="Issues scored above this are highlighted as high-priority">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={priorityThreshold}
              onChange={(e) => setPriorityThreshold(e.target.value)}
              className="w-28 accent-violet-500"
            />
            <span className="text-xs text-zinc-300 tabular-nums w-6">{priorityThreshold}</span>
          </div>
        </Row>
        <Row label="Triage depth" description="How thoroughly the model analyses each issue">
          <Select
            value={triageModel}
            onChange={setTriageModel}
            options={[
              { value: 'fast', label: 'Fast (classification only)' },
              { value: 'full', label: 'Full (default)' },
              { value: 'deep', label: 'Deep (slower, more detail)' },
            ]}
          />
        </Row>
      </Section>

      {/* Moderation */}
      <Section title="PR Moderation" icon={Shield}>
        <Row label="Auto-block PRs" description="Automatically close PRs when a BLOCK decision is issued">
          <Toggle checked={autoBlock} onChange={setAutoBlock} />
        </Row>
        <Row label="Secret scanning" description="Detect hardcoded API keys, tokens, and credentials in diffs">
          <Toggle checked={secretScan} onChange={setSecretScan} />
        </Row>
        <Row label="Toxicity detection" description="Flag toxic or harassing language in PR descriptions and comments">
          <Toggle checked={toxicityDetect} onChange={setToxicityDetect} />
        </Row>
        <Row label="Sensitivity" description="Controls how aggressively the model flags borderline content">
          <Select
            value={moderationSensitivity}
            onChange={setModerationSensitivity}
            options={[
              { value: 'low', label: 'Low (fewer flags)' },
              { value: 'medium', label: 'Medium (default)' },
              { value: 'high', label: 'High (stricter)' },
            ]}
          />
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <Row label="PR blocked" description="Notify when a pull request is automatically blocked">
          <Toggle checked={notifyBlock} onChange={setNotifyBlock} />
        </Row>
        <Row label="PR flagged" description="Notify when a pull request is flagged for review">
          <Toggle checked={notifyFlag} onChange={setNotifyFlag} />
        </Row>
        <Row label="Issue triaged" description="Notify when an issue is classified and labelled">
          <Toggle checked={notifyTriage} onChange={setNotifyTriage} />
        </Row>
        <Row label="README generated" description="Notify when a README generation job completes">
          <Toggle checked={notifyReadme} onChange={setNotifyReadme} />
        </Row>
      </Section>

      {/* Webhooks */}
      <Section title="Webhooks" icon={Webhook}>
        <Row label="Event scope" description="Which GitHub events trigger processing">
          <Select
            value={webhookEvents}
            onChange={setWebhookEvents}
            options={[
              { value: 'all', label: 'All events (default)' },
              { value: 'prs', label: 'Pull requests only' },
              { value: 'issues', label: 'Issues only' },
              { value: 'comments', label: 'Comments only' },
            ]}
          />
        </Row>
        <Row label="Retry failed deliveries" description="Automatically retry webhook deliveries that time out">
          <Toggle checked={retryFailed} onChange={setRetryFailed} />
        </Row>
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 pb-4">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all',
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          )}
        >
          {saved ? (
            <><Check className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save settings</>
          )}
        </button>
      </div>
    </div>
  );
}
