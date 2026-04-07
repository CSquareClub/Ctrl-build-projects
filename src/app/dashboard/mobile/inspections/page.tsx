"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  GitPullRequest,
  Loader2,
  Plus,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type InspectionActivity,
  type MobileApp,
  type MobileInspection,
  type MobileInspectionResult,
} from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { useLiveEvents } from "@/providers/LiveEventsProvider";
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
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent",
          cls
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
    </div>
  );
}

function getInspectionTone(status: MobileInspection["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
}

function normalizeStepsInput(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function mapInspectionToResult(
  inspection: MobileInspection | null,
  selectedApp: MobileApp | null
): MobileInspectionResult | null {
  if (!inspection) return null;

  const resultJson = inspection.resultJson || {};
  const rawData =
    resultJson && typeof resultJson === "object"
      ? (resultJson as Record<string, unknown>)
      : {};

  return {
    id: inspection.id,
    userId: inspection.userId,
    projectId: null,
    issueId: null,
    issue: inspection.issue,
    deviceName:
      typeof rawData.deviceName === "string" ? rawData.deviceName : "Google Pixel 6",
    platformName:
      typeof rawData.platformName === "string" ? rawData.platformName : "Android",
    platformVersion:
      typeof rawData.platformVersion === "string" ? rawData.platformVersion : "12.0",
    appUrl:
      typeof rawData.appUrl === "string" ? rawData.appUrl : selectedApp?.appUrl || null,
    observedBehavior:
      typeof rawData.observedBehavior === "string"
        ? rawData.observedBehavior
        : inspection.status === "failed"
          ? "The cloud device run failed before AgenticPulse could complete the full flow."
          : "Inspection is still running.",
    suspectedCause:
      typeof rawData.suspectedCause === "string"
        ? rawData.suspectedCause
        : inspection.status === "failed"
          ? typeof rawData.error === "string"
            ? rawData.error
      : "The cloud device session or app runtime returned a failure."
          : "AI analysis is still in progress.",
    suggestedFix:
      typeof rawData.suggestedFix === "string"
        ? rawData.suggestedFix
        : inspection.status === "failed"
      ? "Retry the run, validate the uploaded app build, and confirm the mobile flow steps."
          : "Wait for the mobile inspection to finish.",
    confidence: Number(rawData.confidence || 0),
    rawData,
    createdAt: inspection.createdAt,
  };
}

function ActivityFeed({ items }: { items: InspectionActivity[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Live Activity
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            AI is inspecting your app
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
          Agent Active
        </div>
      </div>

      <div className="max-h-[25rem] space-y-3 overflow-y-auto pr-1">
        {items.length > 0 ? (
          items.map((item) => {
            const tone =
              item.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                : item.status === "error"
                  ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";

            return (
              <div key={item.id} className={cn("rounded-xl border px-4 py-3 transition-colors", tone)}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium">{item.message}</p>
                  <span className="shrink-0 text-xs opacity-70">
                    {new Date(item.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
            Start a mobile inspection to watch the agent connect to the device, run the flow, and explain the result in real time.
          </div>
        )}
      </div>
    </div>
  );
}

function isInspectionActivity(value: unknown): value is InspectionActivity {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.timestamp === "string"
  );
}

function isMobileInspection(value: unknown): value is MobileInspection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.appId === "string" &&
    typeof candidate.issue === "string" &&
    typeof candidate.status === "string"
  );
}

function ResultPanel({
  result,
  creatingTicket,
  addingReminder,
  onCreateTicket,
  onAddReminder,
}: {
  result: MobileInspectionResult | null;
  creatingTicket: boolean;
  addingReminder: boolean;
  onCreateTicket: () => Promise<void>;
  onAddReminder: () => Promise<void>;
}) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Result Panel
        </div>
        <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
          Waiting for first inspection
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Once AgenticPulse finishes a mobile run, this panel will show observed behavior, likely cause, suggested fix, and confidence.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            Result Panel
          </div>
          <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
            {result.issue}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {new Date(result.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            • {result.deviceName || "Cloud device"}
          </p>
        </div>
        <Badge variant="success" className="rounded-full px-3 py-1.5 text-sm">
          {result.confidence}% confidence
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Observed Behavior
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{result.observedBehavior}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
            Cause
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{result.suspectedCause}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            Suggested Fix
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{result.suggestedFix}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => void onCreateTicket()}
          disabled={creatingTicket}
          className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
        >
          {creatingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Ticket
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onAddReminder()}
          disabled={addingReminder}
          className="rounded-xl border-slate-200 dark:border-slate-800"
        >
          {addingReminder ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Add Reminder
        </Button>
        <Link href="/dashboard/github" className="block">
          <Button type="button" variant="outline" className="rounded-xl border-slate-200 dark:border-slate-800">
            Fix via GitHub
            <GitPullRequest className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function MobileInspectionsPage() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const { subscribeToEvents } = useLiveEvents();
  const searchParams = useSearchParams();

  const [apps, setApps] = useState<MobileApp[]>([]);
  const [inspections, setInspections] = useState<MobileInspection[]>([]);
  const [activity, setActivity] = useState<InspectionActivity[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [issue, setIssue] = useState("App crash on login");
  const [stepsText, setStepsText] = useState("open app\nclick login");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [addingReminder, setAddingReminder] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone =
    tone === "good" ? "good" : tone === "warning" ? "warning" : "bad";

  const requestedAppId = searchParams.get("appId");

  const load = async (targetAppId?: string | null) => {
    if (!session?.access_token) {
      setApps([]);
      setInspections([]);
      setActivity([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [statusResponse, activityResponse] = await Promise.all([
        api.mobile.status(session.access_token, targetAppId || undefined),
        api.mobile.activity(session.access_token, 25),
      ]);

      setApps(statusResponse.apps);
      setInspections(statusResponse.inspections);
      setActivity(activityResponse.activity);

      if (!selectedAppId) {
        setSelectedAppId(targetAppId || statusResponse.apps[0]?.id || "");
      }
    } catch (err) {
      setError(toUserFacingError(err, "agent-load"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(requestedAppId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, requestedAppId]);

  useEffect(() => {
    if (requestedAppId) {
      setSelectedAppId(requestedAppId);
    }
  }, [requestedAppId]);

  useEffect(() => {
    if (!session?.access_token) return;

    return subscribeToEvents(
      (event) => {
        if (event.type === "mobile-inspection.activity") {
          if (isInspectionActivity(event.payload)) {
            const nextActivity: InspectionActivity = event.payload;
            setActivity((current) => [nextActivity, ...current].slice(0, 30));
          }
        }

        if (event.type === "mobile-inspection.result") {
          if (isMobileInspection(event.payload)) {
            const nextInspection: MobileInspection = event.payload;
            setInspections((current) => {
              const remaining = current.filter((item) => item.id !== nextInspection.id);
              return [nextInspection, ...remaining].slice(0, 12);
            });
            setRunning(false);
          }
        }

        if (event.type === "mobile-inspection.status") {
          const payload = event.payload as {
            appId?: string;
            state?: string;
            message?: string;
          };

          if (payload.appId && selectedAppId && payload.appId === selectedAppId && payload.message) {
            setNotice(payload.message);
          }

          if (payload.state === "completed" || payload.state === "failed") {
            setRunning(false);
          }
        }
      },
      {
        types: ["mobile-inspection.activity", "mobile-inspection.result", "mobile-inspection.status"],
      }
    );
  }, [selectedAppId, session?.access_token, subscribeToEvents]);

  const selectedApp = useMemo(() => apps.find((app) => app.id === selectedAppId) || null, [apps, selectedAppId]);
  const selectedInspection = useMemo(() => {
    const appScoped = inspections.filter((inspection) => (selectedAppId ? inspection.appId === selectedAppId : true));
    return appScoped[0] || null;
  }, [inspections, selectedAppId]);
  const selectedResult = useMemo(() => mapInspectionToResult(selectedInspection, selectedApp), [selectedApp, selectedInspection]);
  const activityForSelectedApp = useMemo(
    () =>
      activity.filter((item) => {
        const appId = typeof item.metadata?.appId === "string" ? item.metadata.appId : null;
        return selectedAppId ? appId === selectedAppId : true;
      }),
    [activity, selectedAppId]
  );

  const progressSteps = useMemo(() => {
    const status = selectedInspection?.status || (running ? "running" : "pending");
    return [
      { label: "Connecting to device", active: status === "running" || status === "completed" || status === "failed" },
      {
        label: "Launching app",
        active:
          activityForSelectedApp.some((item) => item.message.toLowerCase().includes("launching mobile app")) ||
          status === "completed" ||
          status === "failed",
      },
      {
        label: "Running flow",
        active:
          activityForSelectedApp.some((item) => item.message.toLowerCase().includes("executing mobile step")) ||
          status === "completed" ||
          status === "failed",
      },
      {
        label: "Analyzing",
        active:
          activityForSelectedApp.some((item) => item.message.toLowerCase().includes("analyzing behavior")) ||
          status === "completed" ||
          status === "failed",
      },
    ];
  }, [activityForSelectedApp, running, selectedInspection?.status]);

  const handleRunInspection = async () => {
    if (!session?.access_token) {
      setError("Please sign in before starting an inspection.");
      return;
    }
    if (!selectedAppId) {
      setError("Select an app before starting an inspection.");
      return;
    }

    setRunning(true);
    setError(null);
    setNotice("Inspection started");

    try {
      const response = await api.mobile.inspect(session.access_token, {
        app_id: selectedAppId,
        issue: issue.trim() || "Mobile inspection",
        steps: normalizeStepsInput(stepsText),
      });
      setInspections((current) => [response.inspection, ...current]);
      setNotice(response.message);
    } catch (err) {
      setRunning(false);
      setError(toUserFacingError(err, "inspection-start"));
    }
  };

  const handleCreateTicket = async () => {
    if (!session?.access_token || !selectedResult) return;
    setCreatingTicket(true);
    setNotice(null);
    try {
      await api.tickets.create(session.access_token, {
        title: selectedResult.issue,
        description: [
          `Observed behavior: ${selectedResult.observedBehavior}`,
          `Suspected cause: ${selectedResult.suspectedCause}`,
          `Suggested fix: ${selectedResult.suggestedFix}`,
          `Confidence: ${selectedResult.confidence}%`,
        ].join("\n\n"),
        priority: selectedResult.confidence >= 80 ? "high" : "medium",
      });
      setNotice("Ticket created from mobile inspection");
    } catch (err) {
      setError(toUserFacingError(err, "ticket-create"));
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleAddReminder = async () => {
    if (!session?.access_token || !selectedResult) return;
    setAddingReminder(true);
    setNotice(null);
    try {
      await api.reminders.create(session.access_token, {
        title: `Follow up mobile inspection: ${selectedResult.issue}`,
        description: selectedResult.suggestedFix,
        remind_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setNotice("Reminder added from mobile inspection");
    } catch (err) {
      setError(toUserFacingError(err, "reminder-create"));
    } finally {
      setAddingReminder(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeading icon={Bot} title="Mobile Inspections" tone={headingTone} />
        <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Trigger cloud-device inspection on demand, watch the agent work live, and turn the result into a ticket, reminder, or GitHub fix flow.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-8 py-16 text-center dark:border-slate-800 dark:bg-slate-950/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Smartphone className="h-6 w-6" />
          </div>
          <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Connect an app before you inspect
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            AgenticPulse needs a connected mobile build before it can run automated mobile inspections.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/mobile/apps" className="inline-block">
              <Button className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
                Connect App
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Inspection Control
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                    Run inspection on a real cloud device
                  </h3>
                </div>
                <Badge variant={selectedInspection ? getInspectionTone(selectedInspection.status) : "secondary"} className="rounded-full px-3 py-1.5">
                  {running ? "running" : selectedInspection?.status || "ready"}
                </Badge>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Connected App</label>
                  <select
                    value={selectedAppId}
                    onChange={(event) => setSelectedAppId(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
                  >
                    {apps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.appName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Issue</label>
                  <Input
                    value={issue}
                    onChange={(event) => setIssue(event.target.value)}
                    placeholder="App crash on login"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Steps</label>
                  <textarea
                    value={stepsText}
                    onChange={(event) => setStepsText(event.target.value)}
                    rows={5}
                    placeholder={"open app\nclick login\nenter email"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-emerald-400 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter one step per line. AgenticPulse will convert these into the guided mobile flow it runs in the cloud.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => void handleRunInspection()}
                  disabled={running}
                  className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                  {running ? "AI is inspecting your app..." : "Run Inspection"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-transparent">
              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Inspection Progress
              </div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                {running ? "AI is inspecting your app..." : "AgenticPulse is ready to inspect"}
              </h3>
              <div className="mt-5 space-y-4">
                {progressSteps.map((step, index) => (
                  <div
                    key={step.label}
                    className={cn(
                      "flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors",
                      step.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                        step.active
                          ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/20 dark:bg-slate-950 dark:text-emerald-300"
                          : "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.label}</p>
                    </div>
                    {step.active ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" /> : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <ActivityFeed items={activityForSelectedApp} />
            <ResultPanel
              result={selectedResult}
              creatingTicket={creatingTicket}
              addingReminder={addingReminder}
              onCreateTicket={handleCreateTicket}
              onAddReminder={handleAddReminder}
            />
          </section>
        </>
      )}
    </div>
  );
}
