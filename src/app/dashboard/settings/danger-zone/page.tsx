"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toUserFacingError } from "@/lib/user-facing-errors";

export default function SettingsDangerZonePage() {
  const router = useRouter();
  const { session } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleReset = async () => {
    const token = session?.access_token;
    if (!token) {
      setError("Please sign in again to reset your workspace data.");
      return;
    }

    setResetLoading(true);
    setError("");
    setMessage("");

    try {
      await api.settings.danger.resetData(token);
      setMessage("Workspace data was reset successfully.");
      setResetConfirm("");
      setResetOpen(false);
      router.refresh();
    } catch (err) {
      setError(toUserFacingError(err, "profile-update"));
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    const token = session?.access_token;
    if (!token) {
      setError("Please sign in again to delete this project.");
      return;
    }

    setDeleteLoading(true);
    setError("");
    setMessage("");

    try {
      await api.settings.danger.deleteProject(token);
      setMessage("Project deleted. Redirecting you to setup.");
      setDeleteConfirm("");
      setDeleteOpen(false);
      router.push("/setup");
      router.refresh();
    } catch (err) {
      setError(toUserFacingError(err, "profile-update"));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-red-600 dark:text-red-400">
          Danger Zone
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Irreversible actions that permanently affect your workspace and data.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 dark:border-red-500/15 dark:bg-red-500/5">
        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <ShieldAlert className="h-4 w-4" />
          <span>
            Actions in this section are <strong>permanent</strong>. Proceed with
            extreme caution.
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-500/15 dark:bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Delete project
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Permanently delete this project and all associated data including
              issues, feedback, connections, and agent history. This cannot be
              undone.
            </p>

            {!deleteOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 h-9 rounded-xl border-red-200 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                onClick={() => setDeleteOpen(true)}
              >
                I want to delete this project
              </Button>
            ) : (
              <div className="mt-4 space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-4 dark:border-red-500/15 dark:bg-red-500/5">
                <p className="text-xs text-red-700 dark:text-red-300">
                  Type <strong>DELETE</strong> to confirm:
                </p>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="h-10 rounded-xl border-red-200 bg-white text-sm dark:border-red-500/20 dark:bg-white/[0.02]"
                  placeholder="Type DELETE"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={deleteConfirm !== "DELETE" || deleteLoading}
                    onClick={handleDelete}
                    className={cn(
                      "h-9 rounded-xl text-xs",
                      deleteConfirm === "DELETE"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-slate-200 text-slate-400"
                    )}
                  >
                    <Trash2 className="mr-1.5 h-3 w-3" />
                    {deleteLoading ? "Deleting..." : "Delete permanently"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl text-xs"
                    onClick={() => {
                      setDeleteOpen(false);
                      setDeleteConfirm("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-500/15 dark:bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Reset all data
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Wipe all issues, feedback signals, agent actions, and timeline
              history. Connections and account settings are preserved.
            </p>

            {!resetOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 h-9 rounded-xl border-amber-200 text-xs text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
                onClick={() => setResetOpen(true)}
              >
                I want to reset all data
              </Button>
            ) : (
              <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Type <strong>RESET</strong> to confirm:
                </p>
                <Input
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  className="h-10 rounded-xl border-amber-200 bg-white text-sm dark:border-amber-500/20 dark:bg-white/[0.02]"
                  placeholder="Type RESET"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={resetConfirm !== "RESET" || resetLoading}
                    onClick={handleReset}
                    className={cn(
                      "h-9 rounded-xl text-xs",
                      resetConfirm === "RESET"
                        ? "bg-amber-600 text-white hover:bg-amber-700"
                        : "bg-slate-200 text-slate-400"
                    )}
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3" />
                    {resetLoading ? "Resetting..." : "Reset everything"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl text-xs"
                    onClick={() => {
                      setResetOpen(false);
                      setResetConfirm("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <span>
            Reset keeps your account, connected services, and settings. Delete
            project removes the saved project surface and sends you back through
            setup.
          </span>
        </div>
      </div>
    </div>
  );
}
