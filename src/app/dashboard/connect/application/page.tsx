"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type MobileApp, type MobileInspection } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";

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
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
        {title}
      </h2>
    </div>
  );
}

export default function ApplicationPage() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const [apps, setApps] = useState<MobileApp[]>([]);
  const [inspections, setInspections] = useState<MobileInspection[]>([]);
  const [appName, setAppName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";

  const load = async () => {
    if (!session?.access_token) {
      setApps([]);
      setInspections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.mobile.status(session.access_token);
      setApps(response.apps);
      setInspections(response.inspections);
    } catch (err) {
      setError(toUserFacingError(err, "agent-load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const latestInspectionByApp = useMemo(() => {
    const map = new Map<string, MobileInspection>();
    for (const inspection of inspections) {
      if (!map.has(inspection.appId)) {
        map.set(inspection.appId, inspection);
      }
    }
    return map;
  }, [inspections]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session?.access_token) {
      setError("Please sign in before connecting an app.");
      return;
    }
    if (!appName.trim()) {
      setError("App name is required.");
      return;
    }
    if (!file && !uploadUrl.trim()) {
      setError("Upload an APK/IPA or provide an upload URL.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("app_name", appName.trim());
      if (packageName.trim()) {
        formData.append("package_name", packageName.trim());
      }
      if (uploadUrl.trim()) {
        formData.append("upload_url", uploadUrl.trim());
      }
      if (file) {
        formData.append("apk", file);
      }

      await api.mobile.connect(session.access_token, formData);
      setAppName("");
      setPackageName("");
      setUploadUrl("");
      setFile(null);
      setMessage("Application source connected");
      await load();
    } catch (err) {
      setError(toUserFacingError(err, "github-connect"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading icon={Smartphone} title="Application Source" tone={headingTone} />
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Connect your mobile build once so AgenticPulse can launch it on cloud devices, inspect mobile flows, and store results for later review.
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

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              App Name
            </label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="AgenticPulse Android"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Package Name
            </label>
            <Input
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="com.agenticpulse.mobile"
              className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Upload APK / IPA
            </label>
            <input
              type="file"
              accept=".apk,.ipa,.aab"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:file:bg-emerald-500 dark:file:text-slate-950"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Upload URL
            </label>
            <Input
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              placeholder="https://..."
              className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {saving ? "Connecting..." : "Connect Application"}
          </Button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Connected Applications
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : apps.length > 0 ? (
          <div className="space-y-3">
            {apps.map((app) => {
              const latestInspection = latestInspectionByApp.get(app.id);
              return (
                <div
                  key={app.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-transparent"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {app.appName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {app.packageName || "Package name not provided"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Connected
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Source Type
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                        Cloud device build
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Last Inspection
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                        {latestInspection
                          ? new Date(latestInspection.createdAt).toLocaleString()
                          : "Not yet run"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Latest Status
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                        {latestInspection?.status || "Ready"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
            No mobile applications connected yet.
          </div>
        )}
      </section>
    </div>
  );
}
