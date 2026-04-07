"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SystemNotice from "@/components/SystemNotice";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { api, type PrivacySettingsResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getPasswordRules, isStrongPassword } from "@/lib/password-rules";
import { toUserFacingError } from "@/lib/user-facing-errors";

const retentionOptions = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "forever", label: "Forever" },
];

const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsResponse = {
  dataRetention: "90",
  anonymizeFeedback: false,
};

export default function SettingsPrivacyPage() {
  const { session, updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const passwordRules = useMemo(() => getPasswordRules(password), [password]);

  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsResponse>(
    DEFAULT_PRIVACY_SETTINGS
  );
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState("");
  const [privacyError, setPrivacyError] = useState("");

  const [sdkApiKey, setSdkApiKey] = useState("");
  const [sdkLoading, setSdkLoading] = useState(false);
  const [sdkCopied, setSdkCopied] = useState(false);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) {
      setSdkApiKey("");
      setPrivacyLoading(false);
      return;
    }
    const accessToken = token;

    let cancelled = false;

    async function loadData() {
      setPrivacyLoading(true);
      setSdkLoading(true);
      try {
        const [privacy, me] = await Promise.all([
          api.settings.privacy
            .get(accessToken)
            .catch(() => DEFAULT_PRIVACY_SETTINGS),
          api.user.me(accessToken).catch(() => ({ sdkApiKey: null })),
        ]);

        if (cancelled) {
          return;
        }

        setPrivacySettings(privacy);
        setSdkApiKey(me.sdkApiKey ?? "");
      } catch (err) {
        if (!cancelled) {
          setPrivacyError(toUserFacingError(err, "sdk-load"));
        }
      } finally {
        if (!cancelled) {
          setPrivacyLoading(false);
          setSdkLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const handlePasswordSave = async () => {
    setPasswordError("");
    setPasswordMessage("");

    if (!isStrongPassword(password)) {
      setPasswordError(
        "Please choose a stronger password that matches all requirements."
      );
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);

    try {
      await updatePassword(password);
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch (err) {
      setPasswordError(toUserFacingError(err, "password-update"));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePrivacySave = async () => {
    const token = session?.access_token;
    if (!token) {
      setPrivacyError("Please sign in again to update privacy settings.");
      return;
    }

    setPrivacySaving(true);
    setPrivacyError("");
    setPrivacyMessage("");

    try {
      const saved = await api.settings.privacy.update(token, privacySettings);
      setPrivacySettings(saved);
      setPrivacyMessage("Privacy settings updated successfully.");
    } catch (err) {
      setPrivacyError(toUserFacingError(err, "password-update"));
    } finally {
      setPrivacySaving(false);
    }
  };

  const copyKey = async () => {
    if (!sdkApiKey) return;
    try {
      await navigator.clipboard.writeText(sdkApiKey);
      setSdkCopied(true);
      setTimeout(() => setSdkCopied(false), 2000);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Privacy & Security
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage passwords, API keys, and data handling policies.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Change password
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use a strong, unique password to protect your workspace.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
              New password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-2xl pr-10"
                placeholder="Create a strong password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Confirm password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-2xl"
              placeholder="Retype your new password"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Password requirements
            </p>
            <div className="space-y-1.5">
              {passwordRules.map((rule) => (
                <div
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    rule.valid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {rule.valid ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/15 dark:bg-emerald-500/10">
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              Passwords are stored securely via Supabase Auth, not in product
              tables.
            </div>
          </div>

          {passwordError && (
            <SystemNotice tone="error" message={passwordError} />
          )}
          {passwordMessage && (
            <SystemNotice tone="success" message={passwordMessage} />
          )}

          <Button
            type="button"
            onClick={handlePasswordSave}
            disabled={passwordLoading}
            className="h-11 rounded-2xl"
          >
            {passwordLoading ? "Updating..." : "Update password"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Data retention
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How long should signal data and feedback be kept?
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {retentionOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setPrivacySettings((current) => ({
                  ...current,
                  dataRetention: opt.value,
                }))
              }
              disabled={privacyLoading || privacySaving}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm transition-all duration-150",
                privacySettings.dataRetention === opt.value
                  ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:border-white/[0.1]",
                (privacyLoading || privacySaving) && "cursor-not-allowed opacity-60"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Data anonymization
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Strip personal identifiers from collected feedback before
                analysis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              setPrivacySettings((current) => ({
                ...current,
                anonymizeFeedback: !current.anonymizeFeedback,
              }))
            }
            disabled={privacyLoading || privacySaving}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
              privacySettings.anonymizeFeedback
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-slate-200 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300",
              (privacyLoading || privacySaving) && "cursor-not-allowed opacity-60"
            )}
          >
            {privacySettings.anonymizeFeedback ? (
              <ToggleRight className="h-5 w-5" />
            ) : (
              <ToggleLeft className="h-5 w-5" />
            )}
            {privacySettings.anonymizeFeedback ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              API keys
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your SDK key for embedding AgenticPulse on your website.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            SDK API key
          </label>
          <div className="flex gap-3">
            <Input
              value={sdkLoading ? "Loading..." : sdkApiKey || "No key found"}
              readOnly
              className="h-12 rounded-2xl font-mono text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={copyKey}
              disabled={!sdkApiKey || sdkLoading}
              className="h-12 rounded-2xl"
            >
              {sdkCopied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {sdkCopied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      {privacyError && (
        <SystemNotice tone="error" message={privacyError} />
      )}
      {privacyMessage && (
        <SystemNotice tone="success" message={privacyMessage} />
      )}

      <Button
        type="button"
        onClick={handlePrivacySave}
        disabled={privacyLoading || privacySaving}
        className="h-11 rounded-2xl"
      >
        <Save className="mr-2 h-4 w-4" />
        {privacySaving ? "Saving..." : "Save privacy settings"}
      </Button>
    </div>
  );
}
