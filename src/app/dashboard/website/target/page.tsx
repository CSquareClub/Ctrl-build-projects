"use client";

import { FormEvent, useEffect, useState } from "react";
import { Globe2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { useSetup } from "@/providers/SetupProvider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";
import { PRIMARY_WEBSITE_URL } from "@/lib/demo-ui-mode";
import { toUserFacingError } from "@/lib/user-facing-errors";

function SectionHeading({
  icon: Icon,
  title,
  tone = "bad",
}: {
  icon: React.ElementType;
  title: string;
  tone?: SystemHealthTone;
}) {
  const cls =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent",
          cls
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    </div>
  );
}

export default function WebsiteTargetPage() {
  const { session } = useAuth();
  const { status, refreshSetup } = useSetup();
  const { criticalAlerts } = useDashboardLive();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [inspectionLoginUrl, setInspectionLoginUrl] = useState("");
  const [inspectionUsername, setInspectionUsername] = useState("");
  const [inspectionPassword, setInspectionPassword] = useState("");
  const [inspectionPostLoginSelector, setInspectionPostLoginSelector] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";

  useEffect(() => {
    setWebsiteUrl(status?.websiteUrl || PRIMARY_WEBSITE_URL);
    setProductName(status?.productName || status?.suggestedProductName || "");
    setInspectionLoginUrl(status?.inspectionAccess?.loginUrl || "");
    setInspectionUsername(status?.inspectionAccess?.username || "");
    setInspectionPostLoginSelector(status?.inspectionAccess?.postLoginSelector || "");
  }, [status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.access_token) {
      setError("Please sign in before updating the website target.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.setup.complete(session.access_token, {
        productName,
        websiteUrl,
        inspectionLoginUrl,
        inspectionUsername,
        inspectionPassword,
        inspectionPostLoginSelector,
        repoOwner: status?.repository?.owner || undefined,
        repoName: status?.repository?.name || undefined,
      });
      setInspectionPassword("");
      await refreshSetup();
      setMessage("Website target updated");
    } catch (err) {
      setError(toUserFacingError(err, "profile-update"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading icon={Globe2} title="Website Target" tone={headingTone} />
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Set the website AgenticPulse should inspect and, if needed, add a dedicated test login so the web agent can safely reproduce authenticated flows.
        </p>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Product Name</label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="AgenticPulse"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Website URL</label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder={PRIMARY_WEBSITE_URL}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Source Status</p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                {status?.websiteUrl ? "Connected" : "Waiting for URL"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Inspection Auth</p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                {status?.inspectionAccess?.enabled ? "Configured" : "Optional"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Inspection Target</p>
              <p className="mt-2 truncate text-sm font-medium text-slate-900 dark:text-white">
                {status?.websiteUrl || PRIMARY_WEBSITE_URL}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Inspection Access</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Optional test credentials for authenticated website inspection.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Login URL</label>
              <Input
                value={inspectionLoginUrl}
                onChange={(e) => setInspectionLoginUrl(e.target.value)}
                placeholder={`${PRIMARY_WEBSITE_URL}/login`}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Username / Email</label>
              <Input
                value={inspectionUsername}
                onChange={(e) => setInspectionUsername(e.target.value)}
                placeholder="ops@company.com"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
              <Input
                type="password"
                value={inspectionPassword}
                onChange={(e) => setInspectionPassword(e.target.value)}
                placeholder={status?.inspectionAccess?.passwordConfigured ? "Saved on server" : "Enter password"}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Post-login Selector</label>
              <Input
                value={inspectionPostLoginSelector}
                onChange={(e) => setInspectionPostLoginSelector(e.target.value)}
                placeholder="[data-dashboard-ready]"
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save Website Target"}
          </Button>
        </div>
      </form>
    </div>
  );
}
