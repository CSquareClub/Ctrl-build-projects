"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CircleDashed,
  Copy,
  Eye,
  EyeOff,
  MessageSquareText,
  MousePointerClick,
  Package,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";

type CopyTarget = "install" | "key" | "track" | "feedback";

type SdkStats = {
  totalSignals: number;
  eventCount: number;
  feedbackCount: number;
  errorCount: number;
  latestEventAt: string | null;
  latestUrl: string | null;
};

const EMPTY_SDK_STATS: SdkStats = {
  totalSignals: 0,
  eventCount: 0,
  feedbackCount: 0,
  errorCount: 0,
  latestEventAt: null,
  latestUrl: null,
};

const STORAGE_KEY = "product-pulse-sdk-domain";
const SDK_CDN_URL = "https://cdn.productpulse.dev/pulse.js";
const SDK_API_BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sdk`;

function maskKey(value: string) {
  if (!value) return "";
  if (value.length <= 14) return value;
  return `${value.slice(0, 10)}${"•".repeat(Math.max(6, value.length - 16))}${value.slice(-6)}`;
}

function formatLatestSignal(value: string | null) {
  if (!value) return "No events yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No events yet";
  return date.toLocaleString();
}

function buildInstallSnippet(apiKey: string) {
  return `<script src="${SDK_CDN_URL}"></script>
<script>
  ProductPulse.init({
    apiKey: "${apiKey || "YOUR_API_KEY"}"
  });
</script>`;
}

function buildTrackSnippet() {
  return `ProductPulse.track("button_clicked", {
  button: "pricing_cta"
});`;
}

function buildFeedbackSnippet() {
  return `ProductPulse.feedback({
  message: "Something is broken"
});`;
}

function CodeBlock({
  code,
  language,
  copied,
  onCopy,
}: {
  code: string;
  language: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-[0_16px_36px_rgba(2,6,23,0.35)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {language}
        </span>
        <motion.div whileTap={{ scale: 0.94 }} animate={copied ? { scale: [1, 1.08, 1] } : { scale: 1 }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl px-3 text-slate-300 hover:bg-slate-900 hover:text-white"
            onClick={onCopy}
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </motion.div>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-7 text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="rounded-2xl border border-slate-800 bg-zinc-900 p-6 shadow-lg transition hover:border-slate-700 hover:shadow-[0_20px_40px_rgba(15,23,42,0.28)]"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/12 text-indigo-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </motion.div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full border ${
          done
            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
            : "border-slate-700 bg-slate-900 text-slate-500"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
      </div>
      <span className={done ? "text-slate-100" : "text-slate-400"}>{label}</span>
    </div>
  );
}

export default function SdkPage() {
  const { session } = useAuth();
  const [sdkApiKey, setSdkApiKey] = useState("");
  const [sdkStats, setSdkStats] = useState<SdkStats>(EMPTY_SDK_STATS);
  const [loading, setLoading] = useState(true);
  const [checkingInstall, setCheckingInstall] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewSubmitting, setPreviewSubmitting] = useState(false);
  const [previewStatus, setPreviewStatus] = useState("");
  const [domain, setDomain] = useState("");
  const [hasNewSignals, setHasNewSignals] = useState(false);

  const loadSdkState = useCallback(
    async (options?: { silent?: boolean }) => {
      const token = session?.access_token;
      if (!token) {
        setSdkApiKey("");
        setLoading(false);
        return;
      }

      const safeToken = token;
      if (!options?.silent) {
        setLoading(true);
      }
      setError("");

      try {
        const data = await api.user.me(safeToken);
        const nextStats = data.sdkStats ?? EMPTY_SDK_STATS;
        setSdkApiKey(data.sdkApiKey ?? "");
        setSdkStats((current) => {
          if (nextStats.totalSignals > current.totalSignals && current.totalSignals > 0) {
            setHasNewSignals(true);
            window.setTimeout(() => setHasNewSignals(false), 2200);
          }
          return nextStats;
        });
      } catch (err) {
        setError(toUserFacingError(err, "sdk-load"));
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [session?.access_token]
  );

  useEffect(() => {
    void loadSdkState();
  }, [loadSdkState]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDomain(stored);
    }
  }, []);

  useEffect(() => {
    if (!domain) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, domain);
  }, [domain]);

  useEffect(() => {
    if (!session?.access_token || sdkStats.totalSignals > 0) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadSdkState({ silent: true });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadSdkState, sdkStats.totalSignals, session?.access_token]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const installSnippet = useMemo(() => buildInstallSnippet(sdkApiKey), [sdkApiKey]);
  const trackSnippet = useMemo(() => buildTrackSnippet(), []);
  const feedbackSnippet = useMemo(() => buildFeedbackSnippet(), []);

  const onboarding = useMemo(() => {
    const installed = sdkStats.totalSignals > 0;
    const firstEvent = sdkStats.eventCount > 0 || sdkStats.errorCount > 0;
    const feedbackSubmitted = sdkStats.feedbackCount > 0;
    return {
      installed,
      firstEvent,
      feedbackSubmitted,
      complete: installed && firstEvent && feedbackSubmitted,
    };
  }, [sdkStats]);

  const copyText = async (target: CopyTarget, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      setToast("Copied! Paste this into your website.");
      window.setTimeout(() => setCopiedTarget((current) => (current === target ? null : current)), 1600);
    } catch {
      setError("We couldn't copy that automatically. Please copy it manually.");
    }
  };

  const handleGenerateKey = async () => {
    await loadSdkState();
    if (!error) {
      setToast("Your secure website key is ready.");
    }
  };

  const handleCheckInstallation = async () => {
    setCheckingInstall(true);
    await loadSdkState({ silent: true });
    setCheckingInstall(false);
  };

  const handlePreviewSubmit = async () => {
    if (!previewMessage.trim()) {
      setPreviewStatus("Add a short message before sending.");
      return;
    }

    if (!sdkApiKey) {
      setPreviewStatus("Generate your SDK key first to test the preview.");
      return;
    }

    setPreviewSubmitting(true);
    setPreviewStatus("");

    try {
      const response = await fetch(`${SDK_API_BASE}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Product-Pulse-Key": sdkApiKey,
        },
        body: JSON.stringify({
          message: previewMessage.trim(),
          url: domain ? `https://${domain}` : "https://preview.productpulse.dev",
          userAgent: "Product Pulse SDK Preview",
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Preview request failed." }));
        throw new Error(payload.error || "Preview request failed.");
      }

      setPreviewMessage("");
      setPreviewStatus("Feedback sent to dashboard");
      setToast("Feedback sent to dashboard");
      await loadSdkState({ silent: true });
    } catch (err) {
      setPreviewStatus(toUserFacingError(err, "sdk-load"));
    } finally {
      setPreviewSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="fixed top-6 right-6 z-50 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 shadow-[0_18px_48px_rgba(16,185,129,0.18)]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.92))] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.32)]"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
              <Package className="h-3.5 w-3.5" />
              SDK Integration
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white lg:text-4xl">
              Website SDK
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
              Collect feedback, track events, and monitor issues in real-time.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "No setup required", icon: Zap },
              { label: "Works instantly", icon: ShieldCheck },
              { label: "Lightweight SDK (<20kb)", icon: Package },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4"
              >
                <div className="flex items-center gap-2 text-emerald-300">
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-slate-800 bg-zinc-900 p-6 shadow-lg"
          >
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                1. Install SDK
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Quick install</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Add this snippet just before the closing <code className="rounded bg-slate-950 px-1.5 py-0.5 text-slate-200">&lt;/body&gt;</code> tag of your website.
              </p>
            </div>

            <CodeBlock
              code={installSnippet}
              language="HTML"
              copied={copiedTarget === "install"}
              onCopy={() => void copyText("install", installSnippet)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid gap-4 md:grid-cols-3"
          >
            <FeatureCard
              icon={MessageSquareText}
              title="Feedback Widget"
              description="Launch a floating button, collect user feedback, and stream it directly into your dashboard."
            />
            <FeatureCard
              icon={MousePointerClick}
              title="Event Tracking"
              description="Track page visits, user actions, and custom events with a single lightweight call."
            />
            <FeatureCard
              icon={TriangleAlert}
              title="Error Monitoring"
              description="Capture front-end crashes and JavaScript errors automatically so issues surface faster."
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-slate-800 bg-zinc-900 p-6 shadow-lg"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Advanced usage
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Developer examples</h2>
            </div>

            <div className="space-y-5">
              <CodeBlock
                code={trackSnippet}
                language="JavaScript"
                copied={copiedTarget === "track"}
                onCopy={() => void copyText("track", trackSnippet)}
              />
              <CodeBlock
                code={feedbackSnippet}
                language="JavaScript"
                copied={copiedTarget === "feedback"}
                onCopy={() => void copyText("feedback", feedbackSnippet)}
              />
            </div>
          </motion.div>
        </section>

        <section className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-slate-800 bg-zinc-900 p-6 shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Secure Website Key
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">API key</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setRevealed((current) => !current)}
                disabled={!sdkApiKey && !loading}
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {revealed ? "Hide" : "Reveal"}
              </Button>
            </div>

            {sdkApiKey ? (
              <>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                  <p className="font-mono text-sm break-all text-slate-100">
                    {revealed ? sdkApiKey : maskKey(sdkApiKey)}
                  </p>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {revealed
                    ? "Your full SDK key is visible. Keep it private and only install it on trusted websites."
                    : "Your SDK key is hidden by default. Click Reveal to inspect it before copying."}
                </p>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  animate={copiedTarget === "key" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  className="mt-4 inline-block"
                >
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl"
                    onClick={() => void copyText("key", sdkApiKey)}
                    disabled={loading}
                  >
                    {copiedTarget === "key" ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                    {copiedTarget === "key" ? "Copied!" : "Copy key"}
                  </Button>
                </motion.div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-5">
                <p className="text-sm text-slate-400">
                  {loading ? "Loading your SDK key..." : "Waiting for your secure website key..."}
                </p>
                <Button
                  type="button"
                  className="mt-4 rounded-xl"
                  onClick={() => void handleGenerateKey()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Generate API Key
                </Button>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-slate-800 bg-zinc-900 p-6 shadow-lg"
          >
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Installation Status
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">Activation monitor</h2>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    sdkStats.totalSignals > 0 ? "bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.7)]" : "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    {sdkStats.totalSignals > 0 ? "SDK Active — Receiving data" : "Waiting for SDK installation..."}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sdkStats.totalSignals > 0
                      ? `Last signal received ${formatLatestSignal(sdkStats.latestEventAt)}`
                      : "Waiting for your first signal..."}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                onClick={() => void handleCheckInstallation()}
                disabled={checkingInstall}
              >
                <RefreshCw className={`h-4 w-4 ${checkingInstall ? "animate-spin" : ""}`} />
                Check Installation
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">Live Events</p>
                  <p className="text-xs text-slate-500">
                    {sdkStats.totalSignals > 0 ? "Event received!" : "No events yet"}
                  </p>
                </div>
                <motion.div
                  animate={
                    hasNewSignals
                      ? { scale: [1, 1.16, 1], opacity: [0.9, 1, 0.9] }
                      : { scale: 1, opacity: 1 }
                  }
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    sdkStats.totalSignals > 0
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-400/10 text-amber-300"
                  }`}
                >
                  {sdkStats.totalSignals > 0 ? "Live" : "Idle"}
                </motion.div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Signals</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{sdkStats.totalSignals}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Latest URL</p>
                  <p className="mt-2 text-sm text-slate-300 break-all">
                    {sdkStats.latestUrl || "Waiting for your first signal..."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-slate-800 bg-zinc-900 p-6 shadow-lg"
          >
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Onboarding Progress
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">Fast path to value</h2>
            </div>

            <div className="space-y-3">
              <ChecklistItem done={onboarding.installed} label="Install SDK" />
              <ChecklistItem done={onboarding.firstEvent} label="First event received" />
              <ChecklistItem done={onboarding.feedbackSubmitted} label="Feedback submitted" />
            </div>

            {onboarding.complete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-emerald-200"
              >
                🎉 You&apos;re all set! Product Pulse is live.
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-800 bg-zinc-900 p-6 shadow-lg"
          >
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Live preview
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">Preview the widget</h2>
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm text-slate-400">Website domain</span>
              <Input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="example.com"
                className="h-12 rounded-2xl border-slate-800 bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
              />
            </label>

            <div className="relative overflow-hidden rounded-[24px] border border-slate-800 bg-[linear-gradient(180deg,#111827,#0f172a)] p-6">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400/80" />
                <span className="h-3 w-3 rounded-full bg-amber-300/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-28 rounded-full bg-slate-800" />
                <div className="h-10 w-3/4 rounded-2xl bg-slate-900/90" />
                <div className="h-24 rounded-3xl border border-slate-800 bg-slate-950/80" />
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setPreviewOpen(true);
                  setPreviewStatus("");
                }}
                className="absolute right-5 bottom-5 rounded-full bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(79,70,229,0.38)]"
              >
                Feedback
              </motion.button>
            </div>

            <AnimatePresence>
              {previewOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/90 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">Share feedback</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Send a real preview submission into your Product Pulse dashboard.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
                      onClick={() => {
                        setPreviewOpen(false);
                        setPreviewStatus("");
                        setPreviewMessage("");
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <textarea
                    value={previewMessage}
                    onChange={(event) => setPreviewMessage(event.target.value)}
                    placeholder="What went wrong, what felt confusing, or what should improve?"
                    className="mt-4 min-h-[110px] w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-indigo-500/60"
                  />

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                      {sdkApiKey
                        ? "Submitted feedback is written into feedback_events and appears in your dashboard."
                        : "Generate your SDK key first to test a real submission."}
                    </p>
                    <Button
                      type="button"
                      className="rounded-xl bg-[linear-gradient(90deg,#61d5da_0%,#7599f8_38%,#b04cf2_70%,#eb2ee9_100%)] text-white hover:brightness-105"
                      onClick={() => void handlePreviewSubmit()}
                      disabled={previewSubmitting}
                    >
                      {previewSubmitting ? "Sending..." : "Submit"}
                    </Button>
                  </div>

                  {previewStatus && (
                    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      {previewStatus}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
