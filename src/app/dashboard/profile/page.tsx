"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Save, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { getPasswordRules, isStrongPassword } from "@/lib/password-rules";
import { toUserFacingError } from "@/lib/user-facing-errors";

export default function ProfilePage() {
  const { profile, session, updatePassword, updateProfile } = useAuth();
  const [name, setName] = useState(profile.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [sdkApiKey, setSdkApiKey] = useState("");
  const [sdkError, setSdkError] = useState("");
  const [sdkMessage, setSdkMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameMessage, setNameMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [nameError, setNameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);
  const sdkSnippet = useMemo(() => {
    if (!sdkApiKey) {
      return "";
    }

    return `<script src="${window.location.origin}/pulse.js"></script>\n<script>\n  window.ProductPulse.init({ apiKey: "${sdkApiKey}" });\n</script>`;
  }, [sdkApiKey]);

  useEffect(() => {
    const token = session?.access_token;

    if (!token) {
      setSdkApiKey("");
      return;
    }

    const safeToken = token;

    let cancelled = false;

    async function loadSdkKey() {
      setSdkLoading(true);
      setSdkError("");

      try {
        const data = await api.user.me(safeToken);
        if (!cancelled) {
          setSdkApiKey(data.sdkApiKey ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setSdkError(toUserFacingError(err, "sdk-load"));
        }
      } finally {
        if (!cancelled) {
          setSdkLoading(false);
        }
      }
    }

    void loadSdkKey();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const handleProfileSave = async () => {
    setNameError("");
    setNameMessage("");

    if (!name.trim()) {
      setNameError("Please enter your name.");
      return;
    }

    setNameLoading(true);

    try {
      await updateProfile({ fullName: name.trim() });
      setNameMessage("Profile updated successfully.");
    } catch (err) {
      setNameError(toUserFacingError(err, "profile-update"));
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordSave = async () => {
    setPasswordError("");
    setPasswordMessage("");

    if (!isStrongPassword(password)) {
      setPasswordError("Please choose a stronger password that matches all requirements.");
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

  const copyValue = async (value: string, successMessage: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setSdkMessage(successMessage);
      window.setTimeout(() => setSdkMessage(""), 2000);
    } catch {
      setSdkError("We couldn't copy that automatically. Please copy it manually.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-3xl border border-slate-800 bg-slate-900/70 text-slate-100 shadow-[0_25px_70px_rgba(15,23,42,0.4)] ring-0">
        <CardHeader className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-white">Profile details</CardTitle>
              <CardDescription className="text-slate-400">
                Keep your account identity current across the control room.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Full name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-2xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Email</label>
              <Input
                value={profile.email ?? ""}
                disabled
                className="h-12 rounded-2xl border-slate-800 bg-slate-950/40 text-slate-400"
              />
            </div>
          </div>

          {nameError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {nameError}
            </div>
          )}
          {nameMessage && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {nameMessage}
            </div>
          )}

          <Button
            type="button"
            onClick={handleProfileSave}
            disabled={nameLoading}
            className="h-11 rounded-2xl bg-white text-slate-950 hover:bg-slate-200"
          >
            <Save className="mr-2 h-4 w-4" />
            {nameLoading ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-800 bg-slate-900/70 text-slate-100 shadow-[0_25px_70px_rgba(15,23,42,0.4)] ring-0">
        <CardHeader className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-200">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-white">Security</CardTitle>
              <CardDescription className="text-slate-400">
                Update your password with stronger protection for your workspace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">New password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
              placeholder="Create a strong password"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Confirm password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-2xl border-slate-800 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
              placeholder="Retype your new password"
            />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Password requirements
            </p>
            <div className="space-y-2">
              {passwordRules.map((rule) => (
                <div
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-2 text-sm",
                    rule.valid ? "text-emerald-300" : "text-slate-400"
                  )}
                >
                  {rule.valid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/10 px-4 py-3 text-sm text-slate-300">
            <div className="flex items-center gap-2 text-indigo-200">
              <ShieldCheck className="h-4 w-4" />
              Passwords are stored securely in Supabase Auth, not in your product tables.
            </div>
          </div>

          {passwordError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {passwordError}
            </div>
          )}
          {passwordMessage && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {passwordMessage}
            </div>
          )}

          <Button
            type="button"
            onClick={handlePasswordSave}
            disabled={passwordLoading}
            className="h-11 rounded-2xl bg-[linear-gradient(90deg,#61d5da_0%,#7599f8_38%,#b04cf2_70%,#eb2ee9_100%)] text-white hover:brightness-105"
          >
            {passwordLoading ? "Updating..." : "Update password"}
          </Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 text-slate-100 shadow-[0_25px_70px_rgba(15,23,42,0.4)] ring-0">
        <CardHeader className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-white">Website SDK</CardTitle>
              <CardDescription className="text-slate-400">
                Embed Product Pulse on your website to capture events, feedback, and runtime errors.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {sdkError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {sdkError}
            </div>
          )}
          {sdkMessage && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {sdkMessage}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm text-slate-400">SDK API key</label>
            <div className="flex gap-3">
              <Input
                value={sdkLoading ? "Loading..." : sdkApiKey}
                readOnly
                className="h-12 rounded-2xl border-slate-800 bg-slate-950/60 font-mono text-slate-100"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyValue(sdkApiKey, "SDK API key copied.")}
                disabled={!sdkApiKey || sdkLoading}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">Embed snippet</label>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-300">
                <code>{sdkSnippet || "Your snippet will appear here once the SDK key loads."}</code>
              </pre>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 bg-slate-950/50 text-slate-100 hover:bg-slate-900"
              onClick={() => void copyValue(sdkSnippet, "Embed snippet copied.")}
              disabled={!sdkSnippet}
            >
              <Copy className="h-4 w-4" />
              Copy snippet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
