"use client";

import type { ReactNode } from "react";

/* ── Individual Logo SVGs ─────────────────────────────────── */

function LogoWrap({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-50 dark:bg-transparent border border-slate-200 dark:border-slate-800 shrink-0 select-none">
      {children}
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">{label}</span>
    </div>
  );
}

function GmailLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#EA4335" opacity="0.15" stroke="#EA4335" strokeWidth="1.5"/>
      <path d="M2 6l10 7 10-7" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="fill-slate-800 dark:fill-white">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function SlackLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10" width="4" height="9" rx="2" fill="#2EB67D"/>
      <rect x="10" y="5" width="9" height="4" rx="2" fill="#36C5F0"/>
      <rect x="15" y="10" width="4" height="9" rx="2" fill="#ECB22E"/>
      <rect x="5" y="5" width="9" height="4" rx="2" fill="#E01E5A"/>
    </svg>
  );
}

function CalendarLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="3" stroke="#4285F4" strokeWidth="1.5"/>
      <line x1="3" y1="9" x2="21" y2="9" stroke="#4285F4" strokeWidth="1.5"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="7" y="12" width="3" height="3" rx="0.5" fill="#4285F4"/>
      <rect x="14" y="12" width="3" height="3" rx="0.5" fill="#4285F4" opacity="0.5"/>
      <rect x="7" y="17" width="3" height="3" rx="0.5" fill="#4285F4" opacity="0.5"/>
    </svg>
  );
}

function JiraLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 12l10 10 10-10L12 2zm0 3l7 7-7 7-7-7 7-7z" fill="#0052CC"/>
      <path d="M12 8l4 4-4 4-4-4 4-4z" fill="#2684FF"/>
    </svg>
  );
}

function LinearLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#5E6AD2" strokeWidth="1.5"/>
      <path d="M7 12.5l3.5 3.5L17 9" stroke="#5E6AD2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DiscordLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function NotionLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="2" width="18" height="20" rx="3" className="stroke-slate-800 dark:stroke-white" strokeWidth="1.5" opacity="0.8"/>
      <path d="M8 7h8M8 11h5M8 15h7" className="stroke-slate-800 dark:stroke-white" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

/* ── Logo data ─────────────────────────────────────────────── */

const integrations = [
  { name: "Gmail", Logo: GmailLogo },
  { name: "GitHub", Logo: GitHubLogo },
  { name: "Slack", Logo: SlackLogo },
  { name: "Google Calendar", Logo: CalendarLogo },
  { name: "Jira", Logo: JiraLogo },
  { name: "Linear", Logo: LinearLogo },
  { name: "Discord", Logo: DiscordLogo },
  { name: "Notion", Logo: NotionLogo },
];

/* ── Marquee export ────────────────────────────────────────── */

export function LogoMarquee() {
  const doubled = [...integrations, ...integrations];
  return (
    <div className="w-full overflow-hidden border-y border-slate-200 dark:border-slate-800 py-6 transition-colors">
      <div className="mx-auto max-w-7xl px-4">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Powering insights from
        </p>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex gap-4" style={{ animation: "marquee-scroll 30s linear infinite", width: "max-content" }}>
            {doubled.map((item, i) => (
              <LogoWrap key={`${item.name}-${i}`} label={item.name}>
                <item.Logo />
              </LogoWrap>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hub (connections section) export ──────────────────────── */

const hubPositions = [
  { name: "Gmail", Logo: GmailLogo, x: 12, y: 15 },
  { name: "GitHub", Logo: GitHubLogo, x: 82, y: 10 },
  { name: "Slack", Logo: SlackLogo, x: 8, y: 80 },
  { name: "Calendar", Logo: CalendarLogo, x: 85, y: 78 },
  { name: "Jira", Logo: JiraLogo, x: 88, y: 44 },
  { name: "Discord", Logo: DiscordLogo, x: 5, y: 48 },
];

export function IntegrationHub() {
  return (
    <div className="relative min-h-[460px] rounded-2xl bg-slate-50 dark:bg-transparent border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-colors">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {hubPositions.map((pos, i) => (
          <line
            key={i}
            x1={`${pos.x + 2}%`} y1={`${pos.y + 3}%`}
            x2="50%" y2="50%"
            stroke="url(#hub-gradient)"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.3"
            style={{ animation: `dash-flow 3s linear infinite ${i * 0.4}s` }}
          />
        ))}
        <defs>
          <linearGradient id="hub-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-slate-700 px-6 py-5 shadow-lg">
          <div className="w-3 h-3 rounded-full bg-emerald-500" style={{ animation: "pulse-dot 2s ease-in-out infinite" }} />
          <span className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">AgenticPulse</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-400">System Core</span>
        </div>
      </div>

      {hubPositions.map((pos) => (
        <div
          key={pos.name}
          className="absolute z-10 flex flex-col items-center gap-1.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-slate-700 px-3 py-2.5 shadow-sm transition-all duration-300 hover:border-red-300 dark:hover:border-red-500/30 hover:shadow-md"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          <pos.Logo />
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{pos.name}</span>
        </div>
      ))}
    </div>
  );
}
