"use client";

import { useEffect, useState } from "react";
import { Plug, Mail, GitBranch, Code2, Calendar, CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { api, type Connection } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function SettingsIntegrationsPage() {
  const { session } = useAuth();
  const [gmail, setGmail] = useState(false);
  const [github, setGithub] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [sdk, setSdk] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = session?.access_token;
    if (!t) return;
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [conns, gh, cal, me] = await Promise.all([
          api.connections.list(t).catch(() => []),
          api.github.status(t).catch(() => ({ connected: false })),
          api.connections.getGoogleCalendarStatus(t).catch(() => ({ connected: false })),
          api.user.me(t).catch(() => ({ sdkApiKey: null })),
        ]);
        if (c) return;
        const list = Array.isArray(conns) ? (conns as Connection[]) : [];
        const gmailConnection = list.find((x) => x.provider === "gmail");
        const calendarConnection = list.find((x) => x.provider === "google_calendar");
        setGmail(Boolean(gmailConnection || calendarConnection));
        setGithub(!!(gh as { connected: boolean })?.connected);
        setCalendar(Boolean(calendarConnection || gmailConnection || (cal as { connected: boolean })?.connected));
        setSdk(!!(me as { sdkApiKey: string | null })?.sdkApiKey);
      } catch { /* */ } finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [session?.access_token]);

  const items = [
    { id: "gmail", name: "Gmail", desc: "Import customer emails as feedback signals.", icon: Mail, clr: "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400", on: gmail, link: "/dashboard/connect/connections", connect: async () => { const t = session?.access_token; if (!t) return; try { const { authUrl } = await api.connections.startGmail(t); window.open(authUrl, "_blank"); } catch {} } },
    { id: "github", name: "GitHub", desc: "Link repos for code insights and PR tracking.", icon: GitBranch, clr: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300", on: github, link: "/dashboard/github", connect: async () => { const t = session?.access_token; if (!t) return; try { const { authUrl } = await api.github.start(t); window.open(authUrl, "_blank"); } catch {} } },
    { id: "sdk", name: "Website SDK", desc: "Capture front-end feedback, events, and errors.", icon: Code2, clr: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400", on: sdk, link: "/dashboard/sdk" },
    { id: "calendar", name: "Google Calendar", desc: "Sync reminders and follow-ups to your calendar.", icon: Calendar, clr: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400", on: calendar, link: "/dashboard/connect/connections", connect: async () => { const t = session?.access_token; if (!t) return; try { const { authUrl } = await api.connections.startGoogleCalendar(t); window.open(authUrl, "_blank"); } catch {} } },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Integrations</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Connect external services to enrich your product intelligence pipeline.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-sm dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.1]">
            <div className="flex items-start justify-between">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", it.clr)}><it.icon className="h-5 w-5" /></div>
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : it.on ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />Connected</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400"><XCircle className="h-3 w-3" />Not connected</span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{it.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{it.desc}</p>
            </div>
            <div className="mt-4">
              {it.on ? (
                <Button variant="secondary" size="sm" className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs text-slate-700 shadow-none hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300" onClick={() => { window.location.href = it.link; }}>Manage<ExternalLink className="ml-1.5 h-3 w-3" /></Button>
              ) : it.connect ? (
                <Button size="sm" className="h-9 rounded-xl bg-emerald-600 text-xs text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400" onClick={it.connect}><Plug className="mr-1.5 h-3 w-3" />Connect</Button>
              ) : (
                <Button size="sm" variant="secondary" className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs text-slate-700 shadow-none hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300" onClick={() => { window.location.href = it.link; }}>Set up<ExternalLink className="ml-1.5 h-3 w-3" /></Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
