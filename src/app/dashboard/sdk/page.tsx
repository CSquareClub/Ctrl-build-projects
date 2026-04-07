"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Package, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SystemNotice from "@/components/SystemNotice";
import DemoAnalyticsPanel from "@/components/DemoAnalyticsPanel";
import {
  DEMO_UI_MODE,
  PRIMARY_WEBSITE_DOMAIN,
  demoSdkAnalytics,
} from "@/lib/demo-ui-mode";

const STORAGE_KEY = "agenticpulse-sdk-domain";
const DEMO_SDK_API_KEY = "sdk_live_auditflow_01";

function getSdkScriptOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://agenticpulse.vercel.app";
}

export default function SdkGuidePage() {
  const [sdkApiKey, setSdkApiKey] = useState(DEMO_SDK_API_KEY);
  const [domain, setDomain] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setDomain(stored || PRIMARY_WEBSITE_DOMAIN);
  }, []);

  useEffect(() => {
    if (domain) {
      window.localStorage.setItem(STORAGE_KEY, domain);
    }
  }, [domain]);

  useEffect(() => {
    if (DEMO_UI_MODE) {
      setSdkApiKey(DEMO_SDK_API_KEY);
      setError("");
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const installSnippet = useMemo(
    () => `<script async src="${getSdkScriptOrigin()}/agenticpulse.js"></script>
<script>
  window.AgenticPulse.init({
    projectId: "${sdkApiKey || "YOUR_PROJECT_ID"}",
    userId: "optional_user",
    autoTrack: true
  });
</script>`,
    [sdkApiKey]
  );

  const manualSnippet = useMemo(
    () => `window.AgenticPulse.track("checkout_clicked", {
  step: "pricing",
  plan: "pro"
});

window.AgenticPulse.feedback({
  message: "I could not complete checkout",
  intent: "purchase",
  severity: "high"
});`,
    []
  );

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setToast("Copied");
  };

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="fixed right-6 top-6 z-50 w-full max-w-sm">
          <SystemNotice tone="success" message={toast} timerKey={toast} />
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              <Package className="h-3.5 w-3.5" />
              Behavior Intelligence SDK
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-4xl">
              Install the production SDK
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              AgenticPulse tracks friction, captures behavior, triggers smart feedback, and streams structured intelligence back into your product dashboard.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "Async + non-blocking" },
              { icon: ShieldCheck, label: "Sensitive fields masked" },
              { icon: Check, label: "Real-time friction signals" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/[0.03] px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SystemNotice tone="success" message={error || "Data loaded successfully"} />

      <DemoAnalyticsPanel
        title="SDK analytics snapshot"
        description="SDK analytics mirrors the exact website signal pattern so product, engineering, and support are all reading the same incident shape."
        primaryLabel="Events"
        primaryValue={demoSdkAnalytics.events}
        secondaryLabel="Friction"
        secondaryValue={demoSdkAnalytics.friction}
      />

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Step 1
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              Drop in the SDK
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Paste this before your closing <code className="rounded bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5">&lt;/body&gt;</code> tag.
            </p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
                  HTML
                </span>
                <Button variant="ghost" size="sm" onClick={() => void copyText(installSnippet)} className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-900 dark:text-slate-200">
                <code>{installSnippet}</code>
              </pre>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Step 2
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              Optional manual tracking
            </h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
                  JavaScript
                </span>
                <Button variant="ghost" size="sm" onClick={() => void copyText(manualSnippet)} className="text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
              </div>
              <pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-900 dark:text-slate-200">
                <code>{manualSnippet}</code>
              </pre>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Project ID
            </p>
            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 py-4 font-mono text-sm text-slate-900 dark:text-slate-100 break-all">
              {sdkApiKey || "Loading..."}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Verification
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
              Check your live domain
            </h2>
            <Input
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder={PRIMARY_WEBSITE_DOMAIN}
              className="mt-4 h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/[0.03]"
            />
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>1. Open your site and click around normally.</p>
              <p>2. Force a friction moment like repeated clicking or form struggle.</p>
              <p>3. Analytics completed and the same audit-form spike will appear in the dashboard.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              What the SDK captures
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>Clicks, navigation, scroll depth, time on page, and session duration.</p>
              <p>Rage clicks, dead clicks, error loops, hesitation, drop-off, and form struggle.</p>
              <p>Chat-like feedback only when friction is high or the user explicitly opens the widget.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
