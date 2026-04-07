"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Loader2, Smartphone, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type MobileApp, type MobileInspection } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";

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
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent", cls)}>
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    </div>
  );
}

function ConnectMobileAppModal({
  open,
  creating,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  creating: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: { appName: string; packageName: string; file: File | null; uploadUrl: string }) => Promise<void>;
}) {
  const [appName, setAppName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!appName.trim()) {
      setLocalError("App name is required.");
      return;
    }
    if (!file && !uploadUrl.trim()) {
      setLocalError("Upload an APK/IPA or provide an upload URL.");
      return;
    }
    setLocalError(null);
    await onSubmit({
      appName: appName.trim(),
      packageName: packageName.trim(),
      file,
      uploadUrl: uploadUrl.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#161616]">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Connect your mobile app</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Upload an APK/IPA or use an existing upload URL so AgenticPulse can run cloud-device inspections for your app.
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          {(error || localError) ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {error || localError}
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">App Name</label>
            <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="AgenticPulse Android" className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Package Name</label>
            <Input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="com.agenticpulse.mobile" className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">APK / IPA</label>
            <input
              type="file"
              accept=".apk,.ipa,.aab"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:file:bg-emerald-500 dark:file:text-slate-950"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload URL (optional)</label>
            <Input value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} placeholder="https://..." className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use this if your app build already lives at a stable download URL.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-slate-200 dark:border-slate-800">
            Cancel
          </Button>
          <Button type="submit" disabled={creating} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {creating ? "Uploading app..." : "Connect App"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function MobileAppsPage() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const [apps, setApps] = useState<MobileApp[]>([]);
  const [inspections, setInspections] = useState<MobileInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    tone === "good" ? "good" : tone === "warning" ? "warning" : "bad";

  const loadStatus = async () => {
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
    void loadStatus();
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

  const handleConnect = async (data: { appName: string; packageName: string; file: File | null; uploadUrl: string }) => {
    if (!session?.access_token) {
      setError("Please sign in before connecting an app.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("app_name", data.appName);
      if (data.packageName) formData.append("package_name", data.packageName);
      if (data.file) formData.append("apk", data.file);
      if (data.uploadUrl) formData.append("upload_url", data.uploadUrl);
      await api.mobile.connect(session.access_token, formData);
      setOpen(false);
      await loadStatus();
    } catch (err) {
      setError(toUserFacingError(err, "github-connect"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <SectionHeading icon={Smartphone} title="Mobile Apps" tone={headingTone} />
        <Button onClick={() => setOpen(true)} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
          <UploadCloud className="h-4 w-4" />
          Upload APK
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-8 py-16 text-center dark:border-slate-800 dark:bg-slate-950/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Smartphone className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Connect your mobile app</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Upload an APK or IPA once, and AgenticPulse can inspect a real cloud device, detect failures, and store the report for your next login.
          </p>
          <div className="mt-6">
            <Button onClick={() => setOpen(true)} className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
              <UploadCloud className="h-4 w-4" />
              Upload APK
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((app) => {
            const latestInspection = latestInspectionByApp.get(app.id);
            return (
              <div key={app.id} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Connected App</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{app.appName}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {app.packageName || "Package name not provided"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Device</p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Cloud Device</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Last Inspection</p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      {latestInspection
                        ? new Date(latestInspection.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Not yet run"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link href={`/dashboard/mobile/inspections?appId=${encodeURIComponent(app.id)}`} className="block">
                    <Button variant="outline" className="w-full rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15">
                      Run Inspection
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href={`/dashboard/mobile/inspections?appId=${encodeURIComponent(app.id)}`} className="block">
                    <Button variant="outline" className="w-full rounded-xl border-slate-200 dark:border-slate-800">
                      View Results
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConnectMobileAppModal open={open} creating={creating} error={error} onClose={() => setOpen(false)} onSubmit={handleConnect} />
    </div>
  );
}
