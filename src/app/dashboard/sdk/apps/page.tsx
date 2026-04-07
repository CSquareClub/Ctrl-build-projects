"use client";

import { useEffect, useState } from "react";
import { AppWindow, Globe, Radio, RefreshCw } from "lucide-react";
import { api, type SdkConnectedApp } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_UI_MODE, demoSdkApps } from "@/lib/demo-ui-mode";

export default function SdkAppsPage() {
  const { session } = useAuth();
  const [apps, setApps] = useState<SdkConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (DEMO_UI_MODE) {
      setApps(demoSdkApps);
      setError("");
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api.sdk.apps(session.access_token);
      setApps(result.apps);
    } catch (err) {
      setError(toUserFacingError(err, "sdk-load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [session?.access_token]);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-300">
              <AppWindow className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Connected Apps
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Domains currently sending behavior intelligence through the SDK.
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </section>

      {error && !DEMO_UI_MODE ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : apps.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((app) => (
            <div key={app.domain} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {app.domain}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Last activity {new Date(app.lastActivity).toLocaleString()}
                  </p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                  app.status === "connected"
                    ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}>
                  <Radio className="h-3.5 w-3.5" />
                  {app.status === "connected" ? "Connected" : "Warning"}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Events</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{app.eventsCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Sessions</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{app.sessionsCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Feedback</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{app.feedbackCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Avg friction</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{app.avgFriction}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
          No connected app has sent SDK behavior data yet.
        </div>
      )}
    </div>
  );
}
