"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  GitBranch,
  Loader2,
  LockKeyhole,
  Package2,
  Sparkles,
} from "lucide-react";
import GitHubRepoModal from "@/components/GitHubRepoModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type GitHubRepository } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";
import { useSetup } from "@/providers/SetupProvider";

function buildFriendlyName(owner: string | null | undefined, repo: string | null | undefined) {
  const source = String(repo || owner || "")
    .replace(/[-_]+/g, " ")
    .trim();

  if (!source) return "";

  return source.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SetupPage() {
  return (
    <ProtectedRoute requireSetup={false}>
      <SetupPageContent />
    </ProtectedRoute>
  );
}

function SetupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { status, loading, refreshSetup } = useSetup();

  const [productName, setProductName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [inspectionLoginUrl, setInspectionLoginUrl] = useState("");
  const [inspectionUsername, setInspectionUsername] = useState("");
  const [inspectionPassword, setInspectionPassword] = useState("");
  const [inspectionPostLoginSelector, setInspectionPostLoginSelector] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSaving, setRepoSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    if (!status) return;
    setProductName((current) => current || status.productName || status.suggestedProductName || "");
    setWebsiteUrl((current) => current || status.websiteUrl || "");
    setInspectionLoginUrl((current) => current || status.inspectionAccess?.loginUrl || "");
    setInspectionUsername((current) => current || status.inspectionAccess?.username || "");
    setInspectionPostLoginSelector((current) => current || status.inspectionAccess?.postLoginSelector || "");
  }, [status]);

  useEffect(() => {
    const githubState = searchParams.get("github");
    const nextMessage = searchParams.get("message");

    if (githubState === "connected") {
      setMessage(nextMessage || "GitHub connected successfully. Select your primary repository to continue.");
      void refreshSetup();
    } else if (githubState === "error") {
      setError(nextMessage || "Failed to connect GitHub.");
    }
  }, [refreshSetup, searchParams]);

  const hasAnySetupInput = Boolean(
    productName.trim() ||
      websiteUrl.trim() ||
      inspectionLoginUrl.trim() ||
      inspectionUsername.trim() ||
      inspectionPassword.trim() ||
      inspectionPostLoginSelector.trim() ||
      status?.repository?.owner ||
      status?.repository?.name
  );

  const suggestedName = useMemo(
    () =>
      status?.suggestedProductName ||
      buildFriendlyName(status?.repository?.owner, status?.repository?.name),
    [status?.repository?.name, status?.repository?.owner, status?.suggestedProductName]
  );

  const selectedRepoFullName =
    status?.repository?.owner && status?.repository?.name
      ? `${status.repository.owner}/${status.repository.name}`
      : null;

  const fetchRepos = async () => {
    if (!session?.access_token) return;
    setReposLoading(true);
    setError(null);
    try {
      const response = await api.github.repos(session.access_token);
      setRepos(response.repos);
    } catch (err) {
      setError(toUserFacingError(err, "github-connect"));
    } finally {
      setReposLoading(false);
    }
  };

  const handleConnectGitHub = async () => {
    if (!session?.access_token) return;
    setConnectLoading(true);
    setError(null);
    try {
      const { authUrl } = await api.github.start(
        session.access_token,
        `${window.location.origin}/setup`
      );
      window.location.href = authUrl;
    } catch (err) {
      setError(toUserFacingError(err, "github-connect"));
      setConnectLoading(false);
    }
  };

  const handleOpenRepoModal = async () => {
    if (!status?.githubConnected) return;
    setRepoModalOpen(true);
    if (repos.length === 0) {
      await fetchRepos();
    }
  };

  const handleSaveRepo = async (repo: GitHubRepository) => {
    if (!session?.access_token) return;
    setRepoSaving(true);
    setError(null);
    try {
      await api.github.selectRepo(session.access_token, repo.owner, repo.name);
      await refreshSetup();
      setMessage(`Primary repository set to ${repo.fullName}.`);
      setRepoModalOpen(false);
    } catch (err) {
      setError(toUserFacingError(err, "github-connect"));
    } finally {
      setRepoSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!session?.access_token) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.setup.complete(session.access_token, {
        productName: productName.trim(),
        websiteUrl: websiteUrl.trim(),
        inspectionLoginUrl: inspectionLoginUrl.trim(),
        inspectionUsername: inspectionUsername.trim(),
        inspectionPassword: inspectionPassword.trim(),
        inspectionPostLoginSelector: inspectionPostLoginSelector.trim(),
        repoOwner: status?.repository?.owner,
        repoName: status?.repository?.name,
      });
      await refreshSetup();
      router.replace("/dashboard");
    } catch (err) {
      setError(toUserFacingError(err, "github-connect"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipToDashboard = () => {
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-3">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            Quick setup
          </Badge>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Set up your product workspace</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Add product context now or skip straight into the dashboard. You can come back later to finish website, inspection, and GitHub details.
            </p>
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="rounded-[28px]">
              <CardHeader className="border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-foreground">
                    <Package2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Step 1 — Product name</CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      This becomes the product context used in insights, AI prompts, and agent responses.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-6 pt-5">
                {loading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <Input
                      value={productName}
                      onChange={(event) => setProductName(event.target.value)}
                      placeholder="Enter your product name"
                      className="h-12 rounded-2xl"
                    />
                    {suggestedName && productName.trim() !== suggestedName ? (
                      <button
                        type="button"
                        onClick={() => setProductName(suggestedName)}
                        className="text-sm text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Use suggested name: {suggestedName}
                      </button>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px]">
              <CardHeader className="border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-foreground">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Step 2 — Website URL</CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      This is the live product URL AgenticPulse should inspect during health checks, issue reproduction, and automated monitoring.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-6 pt-5">
                <Input
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://your-product.com"
                  className="h-12 rounded-2xl"
                />
              </CardContent>
            </Card>

            <Card className="rounded-[28px]">
              <CardHeader className="border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-foreground">
                    <LockKeyhole className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Step 3 — Inspection access</CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      Optional staging login for authenticated product checks. Use a staging account, not a personal admin account.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-6 pt-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={inspectionLoginUrl}
                    onChange={(event) => setInspectionLoginUrl(event.target.value)}
                    placeholder="https://your-product.com/login"
                    className="h-12 rounded-2xl"
                  />
                  <Input
                    value={inspectionUsername}
                    onChange={(event) => setInspectionUsername(event.target.value)}
                    placeholder="Staging account email or username"
                    className="h-12 rounded-2xl"
                  />
                  <Input
                    type="password"
                    value={inspectionPassword}
                    onChange={(event) => setInspectionPassword(event.target.value)}
                    placeholder={
                      status?.inspectionAccess?.passwordConfigured && !inspectionPassword
                        ? "Password already saved"
                        : "Staging account password"
                    }
                    className="h-12 rounded-2xl"
                  />
                  <Input
                    value={inspectionPostLoginSelector}
                    onChange={(event) => setInspectionPostLoginSelector(event.target.value)}
                    placeholder="Optional success selector"
                    className="h-12 rounded-2xl"
                  />
                </div>
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  These credentials stay server-side and are only used to create an authenticated inspection session before the agent checks your product.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px]">
              <CardHeader className="border-b border-border pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-muted text-foreground">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Step 4 — Primary GitHub repo</CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      Connect GitHub once, then choose the main codebase your issue routing and patch suggestions should target.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-6 pt-5">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-11 w-44" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : !status?.githubConnected ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                      GitHub is not connected yet.
                    </div>
                    <Button onClick={handleConnectGitHub} disabled={connectLoading}>
                      {connectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                      {connectLoading ? "Connecting..." : "Connect GitHub"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        GitHub connected
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {selectedRepoFullName || "No primary repository selected yet."}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={() => void handleOpenRepoModal()}>
                        <GitBranch className="h-4 w-4" />
                        {selectedRepoFullName ? "Change repository" : "Select repository"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[28px]">
            <CardHeader className="border-b border-border pb-5">
              <CardTitle className="text-white">Setup checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-6 pt-5">
              <ChecklistRow
                complete={Boolean(productName.trim())}
                title="Product name"
                description="Used across agent reasoning, summaries, and assistant replies."
              />
              <ChecklistRow
                complete={Boolean(websiteUrl.trim())}
                title="Website URL"
                description="Used for automated inspections, health checks, and live monitoring."
              />
              <ChecklistRow
                complete={Boolean(status?.inspectionAccess?.enabled)}
                title="Inspection access"
                description="Optional login profile for authenticated product inspections."
              />
              <ChecklistRow
                complete={Boolean(status?.githubConnected)}
                title="GitHub connected"
                description="Required before Product Pulse can select a codebase."
              />
              <ChecklistRow
                complete={Boolean(status?.repository?.owner && status?.repository?.name)}
                title="Primary repository selected"
                description="The default repo for code insights and patch suggestions."
              />

              <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Product Pulse will use your product name, website URL, optional inspection access profile, and selected repository as the base context for issue routing, inspections, AI prompts, insights, and chat responses.
              </div>

              <Button
                className="w-full"
                onClick={handleContinue}
                disabled={submitting || !hasAnySetupInput}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {submitting ? "Saving setup..." : "Save and Continue"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSkipToDashboard}
                disabled={submitting}
              >
                Skip to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <GitHubRepoModal
        open={repoModalOpen}
        repos={repos}
        loading={reposLoading}
        saving={repoSaving}
        selectedRepoFullName={selectedRepoFullName}
        error={error}
        onClose={() => setRepoModalOpen(false)}
        onRefresh={() => void fetchRepos()}
        onSave={(repo) => void handleSaveRepo(repo)}
      />
    </div>
  );
}

function ChecklistRow({
  complete,
  title,
  description,
}: {
  complete: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div
        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border ${
          complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-border bg-background text-muted-foreground"
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
