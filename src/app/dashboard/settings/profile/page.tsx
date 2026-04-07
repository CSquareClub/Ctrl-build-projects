"use client";

import { useState } from "react";
import { Save, UserRound, Mail, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import SystemNotice from "@/components/SystemNotice";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";
import { toUserFacingError } from "@/lib/user-facing-errors";

export default function SettingsProfilePage() {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AP";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Profile
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your personal information and account identity.
        </p>
      </div>

      {/* ── Avatar section ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="flex items-center gap-5">
          <div
            className={cn(
              "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-xl font-bold",
              "border border-emerald-200 bg-emerald-50 text-emerald-600",
              "dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
            )}
          >
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.name ?? "User avatar"}
                className="h-20 w-20 rounded-2xl object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {profile.name ?? "User"}
            </p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {profile.email ?? "No email"}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
              <BadgeCheck className="h-3 w-3" />
              Owner
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile fields ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Account details
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Keep your account identity current across the control room.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Full name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Mail className="h-3.5 w-3.5" />
              Email
            </label>
            <Input
              value={profile.email ?? ""}
              disabled
              className="h-12 rounded-2xl border-slate-200 bg-slate-100 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-500"
            />
          </div>
        </div>

        {nameError && (
          <SystemNotice tone="error" message={nameError} className="mt-4" />
        )}
        {nameMessage && (
          <SystemNotice tone="success" message={nameMessage} className="mt-4" />
        )}

        <div className="mt-5">
          <Button
            type="button"
            onClick={handleProfileSave}
            disabled={nameLoading}
            className="h-11 rounded-2xl"
          >
            <Save className="mr-2 h-4 w-4" />
            {nameLoading ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
