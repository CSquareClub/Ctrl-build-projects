"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type InspectionActivity } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useLiveEvents } from "@/providers/LiveEventsProvider";
import { useSetup } from "@/providers/SetupProvider";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { cn } from "@/lib/utils";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";
import { DEMO_UI_MODE, demoInspectionActivity, demoSuccessMessage } from "@/lib/demo-ui-mode";

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
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
    </div>
  );
}

function rowTone(status: InspectionActivity["status"]) {
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  if (status === "error") {
    return "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400";
  }

  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
}

function statusLabel(status: InspectionActivity["status"]) {
  if (status === "success") return "success";
  if (status === "error") return "error";
  return "processing";
}

export default function WebsiteActivityPage() {
  const { session } = useAuth();
  const { status } = useSetup();
  const { criticalAlerts } = useDashboardLive();
  const { subscribeToEvents } = useLiveEvents();

  const [activity, setActivity] = useState<InspectionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    tone === "good" ? "good" : tone === "warning" ? "warning" : "bad";

  const load = async () => {
    if (DEMO_UI_MODE) {
      setActivity(demoInspectionActivity);
      setError(null);
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setActivity([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.inspect.activity(session.access_token, { limit: 60 });
      setActivity(response.activity);
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

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    if (DEMO_UI_MODE) {
      return;
    }

    return subscribeToEvents(
      (event) => {
        if (event.type === "inspection.activity" || event.type === "inspection.status") {
          void load();
        }
      },
      {
        types: ["inspection.activity", "inspection.status"],
      }
    );
  }, [session?.access_token, subscribeToEvents]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <SectionHeading icon={Activity} title="Website Activity" tone={headingTone} />
          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            className="rounded-xl border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          A live timeline for website inspections, AI analysis, and follow-up actions. This keeps trust high because users can see exactly what the web agent did and when.
        </p>
      </section>

      {error && !DEMO_UI_MODE ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {demoSuccessMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Agent Stream</div>
            <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">Inspections, analysis, and fix generation</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
            Live
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : !status?.websiteUrl && !DEMO_UI_MODE ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
            No website target is configured yet. Add your product URL first, then this page will show only real website-agent activity.
          </div>
        ) : activity.length > 0 ? (
          <div className="space-y-3">
            {activity.map((item) => (
              <div key={item.id} className={cn("rounded-xl border px-4 py-4", rowTone(item.status))}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full border border-current/20 p-2">
                      {item.status === "success" ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : item.status === "error" ? (
                        <Zap className="h-3.5 w-3.5" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.message}</p>
                      <p className="mt-1 text-xs opacity-80">
                        {new Date(item.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-current/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    {statusLabel(item.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
            No website activity yet. Once a website inspection runs, the system timeline will start filling in automatically.
          </div>
        )}
      </section>
    </div>
  );
}
