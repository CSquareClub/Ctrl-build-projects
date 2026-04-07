"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  PackageSearch,
  Users,
  Factory,
  Save,
  FileText,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SystemNotice from "@/components/SystemNotice";
import { Input } from "@/components/ui/input";
import { api, type ProductSettings } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { toUserFacingError } from "@/lib/user-facing-errors";

const industryOptions = [
  "SaaS",
  "E-commerce",
  "Fintech",
  "Healthcare",
  "Education",
  "Media",
  "Developer Tools",
  "Other",
];

const teamSizeOptions = [
  "1-5",
  "6-20",
  "21-50",
  "51-200",
  "201-1000",
  "1000+",
];

const EMPTY_SETTINGS: ProductSettings = {
  productName: "",
  companyName: "",
  description: "",
  industry: "",
  teamSize: "",
  websiteUrl: "",
};

export default function SettingsProductPage() {
  const { session } = useAuth();
  const [form, setForm] = useState<ProductSettings>(EMPTY_SETTINGS);
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
        const data = await api.settings.product.get(accessToken);
        if (!cancelled) {
          setForm({
            productName: data.productName || "",
            companyName: data.companyName || "",
            description: data.description || "",
            industry: data.industry || "",
            teamSize: data.teamSize || "",
            websiteUrl: data.websiteUrl || "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, "profile-update"));
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

  const updateField = <K extends keyof ProductSettings>(
    key: K,
    value: ProductSettings[K]
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    const token = session?.access_token;
    if (!token) {
      setError("Please sign in again to update product settings.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await api.settings.product.update(token, form);
      setForm(saved);
      setMessage("Product settings updated successfully.");
    } catch (err) {
      setError(toUserFacingError(err, "profile-update"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Product / Company
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tell the AI about what you&apos;re building so it can provide better
          intelligence.
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
            <PackageSearch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Product details
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              What are you building?
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Product name
            </label>
            <Input
              value={form.productName}
              onChange={(e) => updateField("productName", e.target.value)}
              disabled={loading || saving}
              className="h-12 rounded-2xl"
              placeholder="e.g. AgenticPulse"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Building2 className="h-3.5 w-3.5" />
              Company name
            </label>
            <Input
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              disabled={loading || saving}
              className="h-12 rounded-2xl"
              placeholder="e.g. Acme Inc."
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Globe className="h-3.5 w-3.5" />
              Website URL
            </label>
            <Input
              value={form.websiteUrl}
              onChange={(e) => updateField("websiteUrl", e.target.value)}
              disabled={loading || saving}
              className="h-12 rounded-2xl"
              placeholder="https://yourproduct.com"
            />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
            <FileText className="h-3.5 w-3.5" />
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            disabled={loading || saving}
            rows={3}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-500/10 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500/30 dark:focus:ring-emerald-500/5"
            placeholder="Briefly describe what your product does..."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
            <Factory className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Industry & team
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Helps the agent calibrate its recommendations.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Factory className="h-3.5 w-3.5" />
              Industry
            </label>
            <div className="flex flex-wrap gap-2">
              {industryOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateField("industry", opt)}
                  disabled={loading || saving}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm transition-all duration-150",
                    form.industry === opt
                      ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]",
                    (loading || saving) && "cursor-not-allowed opacity-60"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Users className="h-3.5 w-3.5" />
              Team size
            </label>
            <div className="flex flex-wrap gap-2">
              {teamSizeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateField("teamSize", opt)}
                  disabled={loading || saving}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm transition-all duration-150",
                    form.teamSize === opt
                      ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]",
                    (loading || saving) && "cursor-not-allowed opacity-60"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 rounded-2xl"
      >
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save product info"}
      </Button>
    </div>
  );
}
