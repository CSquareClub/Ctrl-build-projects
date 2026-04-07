"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChartColumnBig, MousePointerClick, Sparkles } from "lucide-react";
import { api, type SdkAnalyticsResponse } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_UI_MODE, demoSdkAnalyticsResponse } from "@/lib/demo-ui-mode";

function frictionTone(score: number) {
  if (score >= 70) return "text-red-700 dark:text-red-300";
  if (score >= 40) return "text-amber-700 dark:text-amber-300";
  return "text-emerald-700 dark:text-emerald-300";
}

export default function SdkAnalyticsPage() {
  const { session } = useAuth();
  const [analytics, setAnalytics] = useState<SdkAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (DEMO_UI_MODE) {
      setAnalytics(demoSdkAnalyticsResponse);
      setError("");
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await api.sdk.analytics(session.access_token);
        setAnalytics(result);
      } catch (err) {
        setError(toUserFacingError(err, "sdk-load"));
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent text-slate-700 dark:text-slate-300">
            <ChartColumnBig className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              SDK Analytics
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Clean behavior intelligence: sessions, friction, pain points, and AI UX suggestions.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Sessions</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{analytics.behavior.sessions}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Clicks</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{analytics.behavior.clicks}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Engagement</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{analytics.behavior.engagement}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Avg friction</p>
              <p className={`mt-3 text-3xl font-semibold ${frictionTone(analytics.behavior.avgFriction)}`}>{analytics.behavior.avgFriction}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                <AlertTriangle className="h-4 w-4" />
                Friction Map
              </div>
              <div className="mt-5 space-y-3">
                {analytics.frictionMap.pages.map((page) => (
                  <div key={page.page} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{page.page}</p>
                      <span className={`text-sm font-medium ${frictionTone(page.friction)}`}>{page.friction}% friction</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Dead clicks: {page.deadClicks}</span>
                      <span>Rage clicks: {page.rageClicks}</span>
                      <span>Form struggle: {page.formStruggle}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                <MousePointerClick className="h-4 w-4" />
                Problematic Elements
              </div>
              <div className="mt-5 space-y-3">
                {analytics.frictionMap.elements.map((item) => (
                  <div key={item.target} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.target}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Dead clicks: {item.deadClicks}</span>
                      <span>Rage clicks: {item.rageClicks}</span>
                      <span>Total hits: {item.totalHits}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                <AlertTriangle className="h-4 w-4" />
                User Pain Points
              </div>
              <div className="mt-5 space-y-3">
                {analytics.painPoints.map((point) => (
                  <div key={point.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-900 dark:text-white">{point.label}</p>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{point.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                <Sparkles className="h-4 w-4" />
                AI UX Suggestions
              </div>
              <div className="mt-5 space-y-3">
                {analytics.uxSuggestions.map((item) => (
                  <div key={item} className="rounded-xl border border-emerald-200 dark:border-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/5 px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
          SDK analytics will appear once the website starts sending behavior batches.
        </div>
      )}
    </div>
  );
}
