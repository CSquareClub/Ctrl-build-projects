"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Gauge,
  ToggleLeft,
  ToggleRight,
  Clock,
  Save,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SystemNotice from "@/components/SystemNotice";
import { useAgent } from "@/providers/AgentProvider";
import { useAuth } from "@/providers/AuthProvider";
import { api, type AgentSettingsResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toUserFacingError } from "@/lib/user-facing-errors";

const frequencyOptions = [
  { value: "realtime", label: "Real-time", desc: "Inspect as signals arrive" },
  { value: "hourly", label: "Hourly", desc: "Every 60 minutes" },
  { value: "daily", label: "Daily", desc: "Once per day" },
  { value: "manual", label: "Manual", desc: "Only when you ask" },
];

const DEFAULT_SETTINGS: AgentSettingsResponse = {
  enabled: true,
  aggressiveness: 65,
  inspectionFrequency: "realtime",
};

export default function SettingsAgentPage() {
  const { session } = useAuth();
  const { refreshAgent } = useAgent();
  const [settings, setSettings] =
    useState<AgentSettingsResponse>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }
    const accessToken = token;

    let cancelled = false;

    async function loadSettings() {
      setLoading(true);
      setError("");
      try {
        const data = await api.settings.agent.get(accessToken);
        if (!cancelled) {
          setSettings(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "agent-load"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const handleSave = async () => {
    const token = session?.access_token;
    if (!token) {
      setError("Please sign in again to update agent settings.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await api.settings.agent.update(token, settings);
      setSettings(saved);
      await refreshAgent({ silent: true });
      setMessage("Agent settings updated successfully.");
    } catch (err) {
      setError(toUserFacingError(err, "agent-settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Agent Settings
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Control how the AI agent behaves, reacts, and intervenes.
        </p>
      </div>

      {error && (
        <SystemNotice tone="error" message={error} />
      )}
      {message && (
        <SystemNotice tone="success" message={message} />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Autonomous actions
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Allow the agent to create tickets and reminders on its own.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Enable autonomous actions
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              The agent observes feedback, reasons over trends, and creates
              follow-up work.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setSettings((current) => ({
                ...current,
                enabled: !current.enabled,
              }))
            }
            disabled={loading || saving}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
              settings.enabled
                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]",
              (loading || saving) && "cursor-not-allowed opacity-60"
            )}
          >
            {settings.enabled ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
            {settings.enabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              AI aggressiveness
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How proactively should the agent intervene on new signals?
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Level
              </span>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                settings.aggressiveness < 35
                  ? "bg-slate-100 text-slate-700 dark:bg-white/[0.08] dark:text-slate-300"
                  : settings.aggressiveness < 70
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
              )}
            >
              {settings.aggressiveness < 35
                ? "Conservative"
                : settings.aggressiveness < 70
                  ? "Balanced"
                  : "Aggressive"}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={settings.aggressiveness}
            onChange={(e) =>
              setSettings((current) => ({
                ...current,
                aggressiveness: Number(e.target.value),
              }))
            }
            disabled={loading || saving}
            className="w-full cursor-pointer accent-emerald-500"
          />

          <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>Conservative</span>
            <span>Balanced</span>
            <span>Aggressive</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Inspection frequency
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How often should the agent run automatic inspections?
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {frequencyOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  inspectionFrequency: opt.value,
                }))
              }
              disabled={loading || saving}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all duration-150",
                settings.inspectionFrequency === opt.value
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.1]",
                (loading || saving) && "cursor-not-allowed opacity-60"
              )}
            >
              <p
                className={cn(
                  "text-sm font-medium",
                  settings.inspectionFrequency === opt.value
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-700 dark:text-slate-200"
                )}
              >
                {opt.label}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  settings.inspectionFrequency === opt.value
                    ? "text-emerald-600/70 dark:text-emerald-400/60"
                    : "text-slate-400 dark:text-slate-500"
                )}
              >
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 rounded-2xl"
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save agent settings"}
      </Button>
    </div>
  );
}
