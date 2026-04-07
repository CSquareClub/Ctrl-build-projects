"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Cable } from "lucide-react";
import ImapSetupInfoSheet from "@/components/ImapSetupInfoSheet";
import SourceCard from "@/components/SourceCard";
import SystemNotice from "@/components/SystemNotice";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { api, type Connection } from "@/lib/api";
import { isDemoUser } from "@/lib/demo-mode";
import { getImapConfig } from "@/lib/imapConfig";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";

/* ─── types ─── */

type ProviderKey =
  | "gmail"
  | "github"
  | "outlook"
  | "google-calendar"
  | "instagram"
  | "app-reviews"
  | "google-play"
  | "imap"
  | "reddit"
  | "social-search";
type ConnectedProviderKey = Exclude<ProviderKey, "reddit" | "social-search" | "github">;
type SyncableProviderKey =
  | "gmail"
  | "outlook"
  | "google-calendar"
  | "app-reviews"
  | "google-play"
  | "imap";
type SourceMessageContext = ProviderKey | "connections" | "auto-sync" | "disconnect";
type MessageTone = "success" | "partial" | "error";
type FloatingMessage = {
  text: string;
  tone: MessageTone;
  id: number;
};

const REFRESH_INTERVAL_MS = 10_000;
const neutralInputClassName =
  "h-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-200 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-emerald-500/40 dark:focus-visible:ring-emerald-500/20";

/* ─── helpers (preserved from original) ─── */

function formatSyncTime(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleString();
}

function formatProviderLabel(provider: ProviderKey) {
  switch (provider) {
    case "app-reviews": return "App Store Reviews";
    case "google-play": return "Google Play Reviews";
    case "social-search": return "Social Listening";
    case "imap": return "Email Inbox";
    case "google-calendar": return "Google Calendar";
    case "github": return "GitHub";
    default: return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

function getConnectionHealth(connection?: Connection) {
  if (!connection) return { label: "Ready to connect", tone: "neutral" as const };
  if (connection.last_error) return { label: "Needs attention", tone: "warning" as const };
  if (connection.expiry) return { label: "Access granted", tone: "good" as const };
  if (connection.last_synced_at) return { label: "Healthy and syncing", tone: "good" as const };
  return { label: "Connected, waiting for first sync", tone: "neutral" as const };
}

function getErrorText(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "";
}

function getFriendlySourceError(error: unknown, context: SourceMessageContext): string {
  const raw = getErrorText(error);
  const normalized = raw.toLowerCase();
  if (normalized.includes("missing or invalid authorization header") || normalized.includes("jwt") || normalized.includes("unauthorized") || normalized.includes("invalid or expired token") || normalized.includes("expired token")) return "Your session needs to be refreshed. Please sign in again and try once more.";
  if (normalized.includes("failed to fetch") || normalized.includes("networkerror") || normalized.includes("network request failed")) return "We couldn't reach the server just now. Please check your connection and try again.";
  if (context === "connections") return "We couldn't load your connected sources right now. Please refresh the page and try again.";
  if (context === "auto-sync") {
    if (normalized.includes("too many requests") || normalized.includes("rate limit") || normalized.includes("429")) return "Auto-sync is temporarily paused because a source is being rate-limited. It will work again after a short wait.";
    return "We couldn't update auto-sync settings right now. Please try again in a moment.";
  }
  if (context === "disconnect") return "We couldn't disconnect this source right now. Please try again.";
  if (context === "gmail") return "We couldn't start Gmail connection right now. Please try again in a moment.";
  if (context === "github") return "We couldn't connect GitHub right now. Please try again in a moment.";
  if (context === "outlook") return "We couldn't start Outlook connection right now. Please try again in a moment.";
  if (context === "google-calendar") return "We couldn't start Google Calendar connection right now. Please try again in a moment.";
  if (context === "imap") {
    if (normalized.includes("email, imap host, and password are required") || normalized.includes("email, imap host")) return "Add your email, IMAP host, and password to connect this inbox.";
    if (normalized.includes("outlook") && (normalized.includes("oauth") || normalized.includes("modern auth"))) return "For Outlook inboxes, use the Outlook card instead of IMAP. Microsoft usually requires OAuth for mailbox access.";
    if (normalized.includes("app password") || normalized.includes("login failed") || normalized.includes("authentication failed") || normalized.includes("invalid credentials")) return "We couldn't sign in to that inbox. Double-check your email and password, or use an app password if your provider requires one.";
    if (normalized.includes("unable to connect imap inbox") || normalized.includes("connection failed") || normalized.includes("enotfound") || normalized.includes("mailbox")) return "We couldn't reach that inbox with the current IMAP settings. Check the host, port, and security mode, then try again.";
    return "We couldn't connect that inbox right now. Please review the IMAP details and try again.";
  }
  if (context === "reddit") {
    if (normalized.includes("query is required") || normalized.includes("enter an app name or keywords")) return "Add an app name or a few keywords to start Reddit listening.";
    if (normalized.includes("no reddit posts found") || normalized.includes("no results")) return "No Reddit posts were found for this search yet. Try a broader app name or issue keyword.";
    if (normalized.includes("no relevant reddit posts matched")) return "We found Reddit posts, but none looked relevant enough after filtering. Try broader or clearer keywords.";
    if (normalized.includes("too many requests") || normalized.includes("rate limit") || normalized.includes("429")) return "Reddit listening is temporarily busy. Please wait a bit and try again.";
    return "We couldn't fetch Reddit posts right now. Please try again in a few minutes.";
  }
  if (context === "social-search") {
    if (normalized.includes("query is required") || normalized.includes("enter an app name or keywords")) return "Add an app name or a few keywords to start social listening.";
    if (normalized.includes("no social mentions found for this query") || normalized.includes("no social mentions found")) return 'No public Twitter or Threads mentions were found for this search yet. Try broader keywords like "login issue", "crash", or "review".';
    if (normalized.includes("no relevant social mentions matched")) return "We found public posts, but none looked relevant enough after filtering. Try broader or clearer keywords.";
    if (normalized.includes("rate-limited social listening") || normalized.includes("google search failed with status 429") || normalized.includes("429")) return "Social search is temporarily busy. Try again in a few minutes, or use Reddit Listening for now.";
    if (normalized.includes("captcha") || normalized.includes("blocked")) return "Social search is temporarily unavailable. Please try again later.";
    return "We couldn't fetch public social mentions right now. Please try again in a few minutes.";
  }
  if (context === "app-reviews") {
    if (normalized.includes("app not found")) return "We couldn't find that App Store app. Double-check the App ID and try again.";
    if (normalized.includes("no reviews")) return "No App Store reviews were found for that app yet.";
    return "We couldn't connect App Store Reviews right now. Please check the App ID and try again.";
  }
  if (context === "google-play") {
    if (normalized.includes("app not found")) return "We couldn't find that Google Play app. Double-check the package name and try again.";
    if (normalized.includes("no google play reviews available")) return "No recent Google Play reviews were available for that app. Try another app ID or try again later.";
    if (normalized.includes("cannot read properties of undefined")) return "We couldn't read Google Play reviews right now. Please try again in a moment.";
    return "We couldn't connect Google Play Reviews right now. Please check the app ID and try again.";
  }
  if (context === "instagram") return "We couldn't connect Instagram right now. Please try again in a moment.";
  return `We couldn't complete the ${formatProviderLabel(context)} action right now. Please try again.`;
}

function inferMessageTone(message: string): MessageTone {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("couldn't") ||
    normalized.includes("failed") ||
    normalized.includes("error") ||
    normalized.includes("sign in") ||
    normalized.includes("required") ||
    normalized.includes("invalid") ||
    normalized.includes("unauthorized")
  ) {
    return "error";
  }

  if (
    normalized.includes("skipped") ||
    normalized.includes("partial") ||
    normalized.includes("waiting") ||
    normalized.includes("paused") ||
    normalized.includes("already") ||
    normalized.includes("no ")
  ) {
    return "partial";
  }

  return "success";
}

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
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent", cls)}>
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    </div>
  );
}

/* ─── page ─── */

export default function ConnectionsPage() {
  const { session, user } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean; email: string | null; lastSyncedAt: string | null;
  } | null>(null);
  const [appleAppId, setAppleAppId] = useState("");
  const [googlePlayAppId, setGooglePlayAppId] = useState("");
  const [redditForm, setRedditForm] = useState({ appName: "", keywords: "" });
  const [socialSearchForm, setSocialSearchForm] = useState({ appName: "", keywords: "" });
  const [socialMentions, setSocialMentions] = useState<Array<{ title: string; snippet: string; platform: string; link: string }>>([]);
  const [imapForm, setImapForm] = useState({ email: "", imap_host: "", imap_port: "993", password: "", secure: true });
  const [loading, setLoading] = useState(true);
  const [refreshingConnections, setRefreshingConnections] = useState(false);
  const [message, setMessage] = useState<FloatingMessage | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<ProviderKey | null>(null);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [connectingOutlook, setConnectingOutlook] = useState(false);
  const [connectingGoogleCalendar, setConnectingGoogleCalendar] = useState(false);
  const [connectingImap, setConnectingImap] = useState(false);
  const [fetchingReddit, setFetchingReddit] = useState(false);
  const [fetchingSocial, setFetchingSocial] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(30);
  const [savingAutoSync, setSavingAutoSync] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState<string | null>(null);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone = chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";

  const detectedImapConfig = useMemo(() => getImapConfig(imapForm.email), [imapForm.email]);

  const showMessage = useCallback((text: string, tone?: MessageTone) => {
    setMessage({
      text,
      tone: tone ?? inferMessageTone(text),
      id: Date.now(),
    });
  }, []);

  /* ─── data loading (preserved) ─── */

  const loadConnections = useCallback(async (options?: { silent?: boolean }) => {
    if (!session?.access_token) { setConnections([]); setCalendarStatus(null); setLoading(false); setRefreshingConnections(false); return; }
    if (options?.silent) setRefreshingConnections(true); else setLoading(true);
    try {
      const nextConnections = await api.connections.list(session.access_token);
      setConnections(nextConnections);
      const nextCalendarConnection = nextConnections.find((e) => e.provider === "google_calendar");
      setCalendarStatus({
        connected: Boolean(nextCalendarConnection),
        email: (nextCalendarConnection?.metadata?.email as string | null | undefined) ?? null,
        lastSyncedAt: (nextCalendarConnection?.last_synced_at as string | null | undefined) ?? null,
      });
    } catch (err) { showMessage(getFriendlySourceError(err, "connections"), "error"); }
    finally { if (options?.silent) setRefreshingConnections(false); else setLoading(false); }
  }, [session?.access_token, showMessage]);

  const loadCalendarStatus = useCallback(async () => {
    if (!session?.access_token) { setCalendarStatus(null); return; }
    try { const s = await api.connections.getGoogleCalendarStatus(session.access_token); setCalendarStatus(s); } catch { setCalendarStatus(null); }
  }, [session?.access_token]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 4800);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success"); const error = params.get("error"); const nextMessage = params.get("message");
    if (success === "calendar") showMessage("Google Calendar connected successfully", "success");
    else if (error === "calendar") showMessage(nextMessage || "Failed to connect Google Calendar", "error");
    else if (nextMessage) { showMessage(nextMessage); params.delete("message"); }
    params.delete("message"); params.delete("gmail"); params.delete("google_calendar"); params.delete("outlook"); params.delete("success"); params.delete("error");
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [showMessage]);

  useEffect(() => { void loadConnections(); }, [loadConnections]);
  useEffect(() => { void loadCalendarStatus(); }, [loadCalendarStatus]);
  useEffect(() => {
    if (!session?.access_token) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void loadConnections({ silent: true }); }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadConnections, session?.access_token]);

  const connectionMap = useMemo(() => ({
    gmail: connections.find((e) => e.provider === "gmail"),
    "google-calendar": connections.find((e) => e.provider === "google_calendar"),
    outlook: connections.find((e) => e.provider === "outlook"),
    instagram: connections.find((e) => e.provider === "instagram"),
    imap: connections.find((e) => e.provider === "imap"),
    "google-play": connections.find((e) => e.provider === "google-play"),
    "app-reviews": connections.find((e) => e.provider === "app-reviews"),
  }), [connections]);

  const effectiveGmailConnected = Boolean(connectionMap.gmail || connectionMap["google-calendar"]);
  const effectiveGmailEmail = (connectionMap.gmail?.metadata?.email as string | undefined) ?? (connectionMap["google-calendar"]?.metadata?.email as string | undefined) ?? user?.email ?? null;
  const effectiveGmailLastSync = (connectionMap.gmail?.last_synced_at as string | undefined) ?? (connectionMap.gmail?.metadata?.lastSyncedAt as string | undefined) ?? undefined;

  useEffect(() => {
    const caid = connectionMap["app-reviews"]?.metadata?.appId;
    if (typeof caid === "string" && caid && caid !== appleAppId) setAppleAppId(caid);
    const cgid = connectionMap["google-play"]?.metadata?.appId;
    if (typeof cgid === "string" && cgid && cgid !== googlePlayAppId) setGooglePlayAppId(cgid);
  }, [connectionMap, appleAppId, googlePlayAppId]);

  const syncableConnections = useMemo(() => connections.filter((e): e is Connection & { provider: SyncableProviderKey } => ["gmail", "outlook", "google_calendar", "app-reviews", "google-play", "imap"].includes(e.provider)), [connections]);

  const effectiveCalendarConnected = Boolean(connectionMap["google-calendar"] || connectionMap.gmail || calendarStatus?.connected);
  const effectiveCalendarEmail = (connectionMap["google-calendar"]?.metadata?.email as string | undefined) ?? (connectionMap.gmail?.metadata?.email as string | undefined) ?? calendarStatus?.email ?? null;
  const effectiveCalendarLastSync = (connectionMap["google-calendar"]?.last_synced_at as string | undefined) ?? (connectionMap["google-calendar"]?.metadata?.lastSyncedAt as string | undefined) ?? (connectionMap.gmail?.metadata?.lastSyncedAt as string | undefined) ?? calendarStatus?.lastSyncedAt ?? undefined;

  useEffect(() => {
    const first = syncableConnections[0];
    if (!first) { setAutoSyncEnabled(false); setAutoSyncIntervalMinutes(30); return; }
    const m = first.metadata ?? {};
    setAutoSyncEnabled(Boolean(m.autoSyncEnabled));
    setAutoSyncIntervalMinutes(typeof m.autoSyncIntervalMinutes === "number" ? Number(m.autoSyncIntervalMinutes) : 30);
    setAutoSyncStatus("Background sync is handled server-side. This page refreshes connection state quietly every 10 seconds.");
  }, [syncableConnections]);

  /* ─── actions (all preserved) ─── */

  const connect = async (provider: ProviderKey) => {
    if (!session?.access_token) { showMessage("Please sign in before connecting a source.", "error"); return; }
    setMessage(null);
    try {
      const appId = provider === "google-play" ? googlePlayAppId.trim() : provider === "app-reviews" ? appleAppId.trim() : "";
      if ((provider === "google-play" || provider === "app-reviews") && !appId) { showMessage(provider === "google-play" ? "Enter a Google Play package name before connecting reviews." : "Enter an Apple App ID before connecting reviews.", "error"); return; }
      await api.connections.connect(session.access_token, provider, { access_token: `demo-${provider}-token`, metadata: provider === "instagram" ? { accountName: "@productpulse" } : { appId } });
      await loadConnections({ silent: true });
      showMessage(`${formatProviderLabel(provider)} connected successfully.`, "success");
    } catch (err) { showMessage(getFriendlySourceError(err, provider), "error"); }
  };

  const connectGmail = async () => {
    if (!session?.access_token) { showMessage("Please sign in before connecting Gmail.", "error"); return; }
    setConnectingGmail(true); setMessage(null);
    try { const { authUrl } = await api.connections.startGmail(session.access_token); window.location.href = authUrl; }
    catch (err) { showMessage(getFriendlySourceError(err, "gmail"), "error"); setConnectingGmail(false); }
  };

  const connectOutlook = async () => {
    if (!session?.access_token) { showMessage("Please sign in before connecting Outlook.", "error"); return; }
    setConnectingOutlook(true); setMessage(null);
    try { const { authUrl } = await api.connections.startOutlook(session.access_token); window.location.href = authUrl; }
    catch (err) { showMessage(getFriendlySourceError(err, "outlook"), "error"); setConnectingOutlook(false); }
  };

  const connectGoogleCalendar = async () => {
    if (!session?.access_token) { showMessage("Please sign in before connecting Google Calendar.", "error"); return; }
    setConnectingGoogleCalendar(true); setMessage(null);
    try { const { authUrl } = await api.connections.startGoogleCalendar(session.access_token); window.location.href = authUrl; }
    catch (err) { showMessage(getFriendlySourceError(err, "google-calendar"), "error"); setConnectingGoogleCalendar(false); }
  };

  const connectImap = async () => {
    if (!session?.access_token) { showMessage("Please sign in before connecting an inbox.", "error"); return; }
    if (!imapForm.email.trim() || !imapForm.imap_host.trim() || !imapForm.password.trim()) { showMessage("Email, IMAP host, and password are required.", "error"); return; }
    setConnectingImap(true); setMessage(null);
    try {
      await api.connections.connectImap(session.access_token, { email: imapForm.email.trim(), imap_host: imapForm.imap_host.trim(), imap_port: Number(imapForm.imap_port || "993"), password: imapForm.password, secure: imapForm.secure });
      setImapForm((c) => ({ ...c, password: "" }));
      await loadConnections({ silent: true });
      showMessage(`Connected IMAP inbox for ${imapForm.email.trim()}.`, "success");
    } catch (err) { showMessage(getFriendlySourceError(err, "imap"), "error"); }
    finally { setConnectingImap(false); }
  };

  const fetchReddit = async () => {
    if (!session?.access_token) { showMessage("Please sign in before fetching Reddit posts.", "error"); return; }
    const query = [redditForm.appName.trim(), redditForm.keywords.trim()].filter(Boolean).join(" ");
    if (!query) { showMessage("Enter an app name or keywords for Reddit listening.", "error"); return; }
    setFetchingReddit(true); setMessage(null);
    try {
      const result = await api.social.reddit(session.access_token, { query, count: 20 });
      showMessage(
        `Reddit listening completed. Imported ${result.count} post${result.count === 1 ? "" : "s"} and skipped ${result.duplicatesSkipped} duplicate${result.duplicatesSkipped === 1 ? "" : "s"}.`,
        result.duplicatesSkipped > 0 ? "partial" : "success"
      );
    } catch (err) { showMessage(getFriendlySourceError(err, "reddit"), "error"); }
    finally { setFetchingReddit(false); }
  };

  const fetchSocialMentions = async () => {
    if (!session?.access_token) { showMessage("Please sign in before fetching social mentions.", "error"); return; }
    const query = [socialSearchForm.appName.trim(), socialSearchForm.keywords.trim()].filter(Boolean).join(" ");
    if (!query) { showMessage("Enter an app name or keywords for social listening.", "error"); return; }
    setFetchingSocial(true); setMessage(null);
    try {
      const result = await api.social.search(session.access_token, { query });
      setSocialMentions(result.mentions);
      showMessage(
        `${result.count} social mention${result.count === 1 ? "" : "s"} fetched. Data integrated into insights.`,
        result.count > 0 ? "success" : "partial"
      );
    } catch (err) { setSocialMentions([]); showMessage(getFriendlySourceError(err, "social-search"), "error"); }
    finally { setFetchingSocial(false); }
  };

  const updateImapEmail = (value: string) => {
    setImapForm((current) => {
      const prev = getImapConfig(current.email); const next = getImapConfig(value);
      const sh = !current.imap_host || current.imap_host === prev.host;
      const sp = !current.imap_port || current.imap_port === String(prev.port);
      const ss = current.secure === prev.secure;
      return { ...current, email: value, imap_host: sh ? next.host : current.imap_host, imap_port: sp ? String(next.port) : current.imap_port, secure: ss ? next.secure : current.secure };
    });
  };

  const syncProvider = useCallback(async (provider: ProviderKey, options?: { silent?: boolean }) => {
    if (!session?.access_token) { showMessage("Please sign in before syncing.", "error"); return; }
    setSyncingProvider(provider); setMessage(null);
    try {
      const syncPayload = provider === "app-reviews" ? { appId: appleAppId.trim() } : provider === "google-play" ? { appId: googlePlayAppId.trim() } : undefined;
      if ((provider === "app-reviews" || provider === "google-play") && !syncPayload?.appId) throw new Error(provider === "app-reviews" ? "Enter an Apple App ID before syncing reviews." : "Enter a Google Play package name before syncing reviews.");
      const result = provider === "imap" ? await api.connections.syncImap(session.access_token) : await api.connections.sync(session.access_token, provider, syncPayload);
      await loadConnections({ silent: true }); await loadCalendarStatus();
      if (!options?.silent) {
        const skipped = typeof result.skipped === "number" ? result.skipped : 0;
        const tone: MessageTone =
          provider === "google-calendar"
            ? "success"
            : skipped > 0 || result.imported === 0
              ? "partial"
              : "success";
        showMessage(
          `${formatProviderLabel(provider)} synced successfully.${provider === "google-calendar" ? "" : ` Imported ${result.imported} feedback item${result.imported === 1 ? "" : "s"}${typeof result.skipped === "number" ? ` and skipped ${result.skipped} non-product message${result.skipped === 1 ? "" : "s"}` : ""}`}.`,
          tone
        );
      }
    } catch (err) {
      let nextMessage: string;
      if (provider === "gmail") nextMessage = "We couldn't sync Gmail right now. Please try again in a moment.";
      else if (provider === "outlook") nextMessage = "We couldn't sync Outlook right now. Please try again in a moment.";
      else if (provider === "google-calendar") nextMessage = "We couldn't sync Google Calendar right now. Please try again in a moment.";
      else nextMessage = getFriendlySourceError(err, provider);
      if (options?.silent) setAutoSyncStatus(nextMessage); else showMessage(nextMessage, "error");
    } finally { setSyncingProvider(null); }
  }, [appleAppId, googlePlayAppId, loadCalendarStatus, loadConnections, session?.access_token, showMessage]);

  const saveAutoSyncSettings = useCallback(async (enabled: boolean, intervalMinutes: number) => {
    if (!session?.access_token || syncableConnections.length === 0) { setAutoSyncEnabled(enabled); setAutoSyncIntervalMinutes(intervalMinutes); return; }
    setSavingAutoSync(true);
    try {
      await Promise.all(syncableConnections.map((c) => api.connections.update(session.access_token, c.id, { metadata: { autoSyncEnabled: enabled, autoSyncIntervalMinutes: intervalMinutes } })));
      setAutoSyncEnabled(enabled); setAutoSyncIntervalMinutes(intervalMinutes);
      await loadConnections({ silent: true });
      setAutoSyncStatus(enabled ? `Auto-sync is on. Connected sources will refresh about every ${intervalMinutes} minutes while this page is open.` : "Auto-sync is off.");
    } catch (err) { showMessage(getFriendlySourceError(err, "auto-sync"), "error"); }
    finally { setSavingAutoSync(false); }
  }, [loadConnections, session?.access_token, showMessage, syncableConnections]);

  const disconnect = async (provider: ConnectedProviderKey) => {
    if (!session?.access_token) return;
    const connection = connectionMap[provider]; if (!connection) return;
    setMessage(null);
    try { await api.connections.disconnect(session.access_token, connection.id); await loadConnections({ silent: true }); showMessage(`${formatProviderLabel(provider)} disconnected.`, "success"); }
    catch (err) { showMessage(getFriendlySourceError(err, "disconnect"), "error"); }
  };

  /* ─── render ─── */

  return (
    <div className="space-y-10">
      {message ? (
        <SystemNotice
          floating
          dismissible
          onDismiss={() => setMessage(null)}
          tone={message.tone === "partial" ? "warning" : message.tone}
          title={message.tone === "partial" ? "Partial" : undefined}
          message={message.text}
          timerKey={message.id}
        />
      ) : null}

      <section className="space-y-5">
        <SectionHeading icon={Cable} title="Connections" tone={headingTone} />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Connect real customer channels, sync feedback into the database, and let AgenticPulse turn it into actionable issue intelligence.
        </p>

        {/* Auto-sync */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Auto-sync</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Background syncing runs server-side. These controls keep your saved preference.
              </p>
              {autoSyncStatus && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{autoSyncStatus}</p>}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-1">
                <button type="button" className={`rounded-lg px-4 py-2 text-sm font-medium transition ${autoSyncEnabled ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950" : "text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"}`} onClick={() => void saveAutoSyncSettings(true, autoSyncIntervalMinutes)} disabled={savingAutoSync || syncableConnections.length === 0}>On</button>
                <button type="button" className={`rounded-lg px-4 py-2 text-sm font-medium transition ${!autoSyncEnabled ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"}`} onClick={() => void saveAutoSyncSettings(false, autoSyncIntervalMinutes)} disabled={savingAutoSync || syncableConnections.length === 0}>Off</button>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                Interval
                <select value={String(autoSyncIntervalMinutes)} onChange={(e) => { const n = Number(e.target.value); setAutoSyncIntervalMinutes(n); void saveAutoSyncSettings(autoSyncEnabled, n); }} disabled={savingAutoSync || syncableConnections.length === 0} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none">
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Source cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SourceCard name="Google Calendar" icon="google-calendar" connected={effectiveCalendarConnected} accountName={effectiveCalendarConnected ? `Connected as ${effectiveCalendarEmail ?? "your Google account"}` : "Allow AgenticPulse to schedule events, reminders, and follow-ups automatically."} lastSync={formatSyncTime(effectiveCalendarLastSync)} healthLabel={effectiveCalendarConnected ? "Connected and ready" : "Not connected"} healthTone={effectiveCalendarConnected ? "good" : "neutral"} onConnect={connectGoogleCalendar} onSync={() => syncProvider("google-calendar")} syncing={connectingGoogleCalendar || syncingProvider === "google-calendar"} connectLabel="Connect Calendar" reconnectLabel="Reconnect" workingLabel="Connecting..." onDisconnect={() => disconnect("google-calendar")} helperText="Used by the agent to schedule tasks automatically." />

        <SourceCard name="Gmail" icon="gmail" connected={effectiveGmailConnected} accountName={effectiveGmailEmail ?? "Connect your Gmail inbox"} lastSync={formatSyncTime(effectiveGmailLastSync)} healthLabel={effectiveGmailConnected ? getConnectionHealth(connectionMap.gmail).label : "Ready to connect"} healthTone={effectiveGmailConnected ? getConnectionHealth(connectionMap.gmail).tone : "neutral"} onConnect={connectGmail} onSync={() => syncProvider("gmail")} syncing={syncingProvider === "gmail" || connectingGmail} onDisconnect={() => disconnect("gmail")} />

        <SourceCard name="Outlook" icon="outlook" connected={Boolean(connectionMap.outlook)} accountName={(connectionMap.outlook?.metadata?.email as string | undefined) ?? "Connect your Outlook inbox"} lastSync={formatSyncTime((connectionMap.outlook?.last_synced_at as string | undefined) ?? (connectionMap.outlook?.metadata?.lastSyncedAt as string | undefined) ?? undefined)} healthLabel={getConnectionHealth(connectionMap.outlook).label} healthTone={getConnectionHealth(connectionMap.outlook).tone} onConnect={connectOutlook} onSync={() => syncProvider("outlook")} syncing={syncingProvider === "outlook" || connectingOutlook} onDisconnect={() => disconnect("outlook")} />

        <SourceCard name="Email Inbox" icon="imap" connected={Boolean(connectionMap.imap)} accountName={(connectionMap.imap?.metadata?.email as string | undefined) ?? "Connect any IMAP inbox"} lastSync={formatSyncTime((connectionMap.imap?.last_synced_at as string | undefined) ?? (connectionMap.imap?.metadata?.lastSyncedAt as string | undefined) ?? undefined)} healthLabel={getConnectionHealth(connectionMap.imap).label} healthTone={getConnectionHealth(connectionMap.imap).tone} onConnect={connectImap} onSync={() => syncProvider("imap")} syncing={syncingProvider === "imap" || connectingImap} onDisconnect={() => disconnect("imap")} collapsible collapsedLabel="Show IMAP setup">
          {!connectionMap.imap && (
            <div className="grid gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label><ImapSetupInfoSheet /></div>
                <Input placeholder="Email address" value={imapForm.email} onChange={(e) => updateImapEmail(e.target.value)} className={neutralInputClassName} />
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">IMAP Host</label>
                  <Input placeholder="IMAP host (e.g. imap.gmail.com)" value={imapForm.imap_host} onChange={(e) => setImapForm((c) => ({ ...c, imap_host: e.target.value }))} className={neutralInputClassName} />
                  <p className="text-xs text-slate-500">{detectedImapConfig.host ? `Auto-detected based on your email provider${detectedImapConfig.providerLabel ? ` (${detectedImapConfig.providerLabel})` : ""}.` : "We use common IMAP defaults and you can override them if needed."}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Port</label>
                  <Input placeholder="Port" value={imapForm.imap_port} onChange={(e) => setImapForm((c) => ({ ...c, imap_port: e.target.value }))} className={neutralInputClassName} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
                <Input type="password" placeholder="App password or mailbox password" value={imapForm.password} onChange={(e) => setImapForm((c) => ({ ...c, password: e.target.value }))} className={neutralInputClassName} />
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                <input type="checkbox" checked={imapForm.secure} onChange={(e) => setImapForm((c) => ({ ...c, secure: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
                Use secure IMAP (SSL/TLS)
              </label>
            </div>
          )}
        </SourceCard>

        <SourceCard name="Reddit Listening" icon="reddit" connected={false} accountName="Search public Reddit posts for product signals" healthLabel="On-demand discovery" healthTone="neutral" onConnect={fetchReddit} syncing={fetchingReddit} connectLabel="Fetch Posts">
          <div className="grid gap-3">
            <Input placeholder="App name (e.g. Product Pulse)" value={redditForm.appName} onChange={(e) => setRedditForm((c) => ({ ...c, appName: e.target.value }))} className={neutralInputClassName} />
            <Input placeholder="Keywords (e.g. crashing billing slow login)" value={redditForm.keywords} onChange={(e) => setRedditForm((c) => ({ ...c, keywords: e.target.value }))} className={neutralInputClassName} />
            <p className="text-xs text-slate-500">Product Pulse searches public Reddit posts only and sends matching posts into your feedback pipeline.</p>
          </div>
        </SourceCard>

        <SourceCard name="Social Listening" icon="social-search" connected={false} accountName="Search Google results for Twitter and Threads mentions" healthLabel="Low-frequency MVP search" healthTone="neutral" onConnect={fetchSocialMentions} syncing={fetchingSocial} connectLabel="Fetch Social Mentions">
          <div className="grid gap-3">
            <Input placeholder="App name (e.g. Product Pulse)" value={socialSearchForm.appName} onChange={(e) => setSocialSearchForm((c) => ({ ...c, appName: e.target.value }))} className={neutralInputClassName} />
            <Input placeholder="Keywords (e.g. crashing login billing)" value={socialSearchForm.keywords} onChange={(e) => setSocialSearchForm((c) => ({ ...c, keywords: e.target.value }))} className={neutralInputClassName} />
            <p className="text-xs text-slate-500">Searches lightweight Google results for Twitter and Threads mentions, then feeds relevant mentions into Product Pulse.</p>
            {socialMentions.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Latest Mentions</p>
                <div className="space-y-2">
                  {socialMentions.slice(0, 5).map((mention) => (
                    <a key={mention.link} href={mention.link} target="_blank" rel="noreferrer" className="block rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-950/80">
                      <div className="flex items-center justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-medium text-slate-900 dark:text-white">{mention.title}</p>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{mention.platform}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{mention.snippet}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SourceCard>

        <SourceCard name="App Store Reviews" icon="app-reviews" connected={Boolean(connectionMap["app-reviews"])} accountName={connectionMap["app-reviews"]?.metadata?.appId ? `App ID: ${String(connectionMap["app-reviews"]?.metadata?.appId)}` : "Track Apple App Store feedback"} lastSync={formatSyncTime((connectionMap["app-reviews"]?.last_synced_at as string | undefined) ?? (connectionMap["app-reviews"]?.metadata?.lastSyncedAt as string | undefined) ?? undefined)} healthLabel={getConnectionHealth(connectionMap["app-reviews"]).label} healthTone={getConnectionHealth(connectionMap["app-reviews"]).tone} onSync={() => syncProvider("app-reviews")} syncing={syncingProvider === "app-reviews"} onConnect={() => connect("app-reviews")} onDisconnect={() => disconnect("app-reviews")} alwaysShowChildren>
          <div className="grid gap-2">
            <Input placeholder="Enter Apple App ID" value={appleAppId} onChange={(e) => setAppleAppId(e.target.value)} className={neutralInputClassName} />
            <p className="text-xs text-slate-500">{connectionMap["app-reviews"] ? "You can update the App ID here before syncing again." : "Paste the Apple App Store ID you want Product Pulse to monitor."}</p>
          </div>
        </SourceCard>

        <SourceCard name="Google Play Reviews" icon="google-play" connected={Boolean(connectionMap["google-play"])} accountName={connectionMap["google-play"]?.metadata?.appId ? `App ID: ${String(connectionMap["google-play"]?.metadata?.appId)}` : "Track Google Play Store feedback"} lastSync={formatSyncTime((connectionMap["google-play"]?.last_synced_at as string | undefined) ?? (connectionMap["google-play"]?.metadata?.lastSyncedAt as string | undefined) ?? undefined)} healthLabel={getConnectionHealth(connectionMap["google-play"]).label} healthTone={getConnectionHealth(connectionMap["google-play"]).tone} onSync={() => syncProvider("google-play")} syncing={syncingProvider === "google-play"} onConnect={() => connect("google-play")} onDisconnect={() => disconnect("google-play")} alwaysShowChildren>
          <div className="grid gap-2">
            <Input placeholder="Enter Play Store App ID (e.g. com.instagram.android)" value={googlePlayAppId} onChange={(e) => setGooglePlayAppId(e.target.value)} className={neutralInputClassName} />
            <p className="text-xs text-slate-500">{connectionMap["google-play"] ? "Update the package name here if you want to switch apps before the next sync." : "Use the package name from Google Play, like com.instagram.android."}</p>
          </div>
        </SourceCard>

        <SourceCard name="Instagram" icon="instagram" connected={Boolean(connectionMap.instagram)} accountName={(connectionMap.instagram?.metadata?.accountName as string | undefined) ?? "@yourbrand"} lastSync={formatSyncTime((connectionMap.instagram?.last_synced_at as string | undefined) ?? (connectionMap.instagram?.metadata?.lastSyncedAt as string | undefined) ?? undefined)} healthLabel={getConnectionHealth(connectionMap.instagram).label} healthTone={getConnectionHealth(connectionMap.instagram).tone} onConnect={() => connect("instagram")} onDisconnect={() => disconnect("instagram")} />
      </div>

      {(loading || refreshingConnections) && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {loading ? "Loading connected sources..." : "Syncing changes without reloading the page..."}
        </p>
      )}
    </div>
  );
}
