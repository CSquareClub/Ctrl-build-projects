"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImapSetupInfoSheet from "@/components/ImapSetupInfoSheet";
import SourceCard from "@/components/SourceCard";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";
import {
  api,
  type Connection,
} from "@/lib/api";
import { isDemoUser } from "@/lib/demo-mode";
import { getImapConfig } from "@/lib/imapConfig";
import { DASHBOARD_DEMO_MODE } from "@/lib/dashboard-demo";

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
type ConnectedProviderKey = Exclude<
  ProviderKey,
  "reddit" | "social-search" | "github"
>;
type SyncableProviderKey =
  | "gmail"
  | "outlook"
  | "google-calendar"
  | "app-reviews"
  | "google-play"
  | "imap";

type SourceMessageContext =
  | ProviderKey
  | "connections"
  | "auto-sync"
  | "disconnect";

function formatSyncTime(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toLocaleString();
}

function formatProviderLabel(provider: ProviderKey) {
  switch (provider) {
    case "app-reviews":
      return "App Store Reviews";
    case "google-play":
      return "Google Play Reviews";
    case "social-search":
      return "Social Listening";
    case "imap":
      return "Email Inbox";
    case "google-calendar":
      return "Google Calendar";
    case "github":
      return "GitHub";
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

function getConnectionHealth(connection?: Connection) {
  if (!connection) {
    return {
      label: "Ready to connect",
      tone: "neutral" as const,
    };
  }

  if (connection.last_error) {
    return {
      label: "Needs attention",
      tone: "warning" as const,
    };
  }

  if (connection.expiry) {
    return {
      label: "Access granted",
      tone: "good" as const,
    };
  }

  if (connection.last_synced_at) {
    return {
      label: "Healthy and syncing",
      tone: "good" as const,
    };
  }

  return {
    label: "Connected, waiting for first sync",
    tone: "neutral" as const,
  };
}

function getErrorText(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
}

function getFriendlySourceError(
  error: unknown,
  context: SourceMessageContext
): string {
  const raw = getErrorText(error);
  const normalized = raw.toLowerCase();

  if (
    normalized.includes("missing or invalid authorization header") ||
    normalized.includes("jwt") ||
    normalized.includes("unauthorized") ||
    normalized.includes("invalid or expired token") ||
    normalized.includes("expired token")
  ) {
    return "Your session needs to be refreshed. Please sign in again and try once more.";
  }

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed")
  ) {
    return "We couldn't reach the server just now. Please check your connection and try again.";
  }

  if (context === "connections") {
    return "We couldn't load your connected sources right now. Please refresh the page and try again.";
  }

  if (context === "auto-sync") {
    if (
      normalized.includes("too many requests") ||
      normalized.includes("rate limit") ||
      normalized.includes("429")
    ) {
      return "Auto-sync is temporarily paused because a source is being rate-limited. It will work again after a short wait.";
    }

    return "We couldn't update auto-sync settings right now. Please try again in a moment.";
  }

  if (context === "disconnect") {
    return "We couldn't disconnect this source right now. Please try again.";
  }

  if (context === "gmail") {
    return "We couldn't start Gmail connection right now. Please try again in a moment.";
  }

  if (context === "github") {
    return "We couldn't connect GitHub right now. Please try again in a moment.";
  }

  if (context === "outlook") {
    return "We couldn't start Outlook connection right now. Please try again in a moment.";
  }

  if (context === "google-calendar") {
    return "We couldn't start Google Calendar connection right now. Please try again in a moment.";
  }

  if (context === "imap") {
    if (
      normalized.includes("email, imap host, and password are required") ||
      normalized.includes("email, imap host")
    ) {
      return "Add your email, IMAP host, and password to connect this inbox.";
    }

    if (
      normalized.includes("outlook") &&
      (normalized.includes("oauth") || normalized.includes("modern auth"))
    ) {
      return "For Outlook inboxes, use the Outlook card instead of IMAP. Microsoft usually requires OAuth for mailbox access.";
    }

    if (
      normalized.includes("app password") ||
      normalized.includes("login failed") ||
      normalized.includes("authentication failed") ||
      normalized.includes("invalid credentials")
    ) {
      return "We couldn't sign in to that inbox. Double-check your email and password, or use an app password if your provider requires one.";
    }

    if (
      normalized.includes("unable to connect imap inbox") ||
      normalized.includes("connection failed") ||
      normalized.includes("enotfound") ||
      normalized.includes("mailbox")
    ) {
      return "We couldn't reach that inbox with the current IMAP settings. Check the host, port, and security mode, then try again.";
    }

    return "We couldn't connect that inbox right now. Please review the IMAP details and try again.";
  }

  if (context === "reddit") {
    if (
      normalized.includes("query is required") ||
      normalized.includes("enter an app name or keywords")
    ) {
      return "Add an app name or a few keywords to start Reddit listening.";
    }

    if (
      normalized.includes("no reddit posts found") ||
      normalized.includes("no results")
    ) {
      return "No Reddit posts were found for this search yet. Try a broader app name or issue keyword.";
    }

    if (normalized.includes("no relevant reddit posts matched")) {
      return "We found Reddit posts, but none looked relevant enough after filtering. Try broader or clearer keywords.";
    }

    if (
      normalized.includes("too many requests") ||
      normalized.includes("rate limit") ||
      normalized.includes("429")
    ) {
      return "Reddit listening is temporarily busy. Please wait a bit and try again.";
    }

    return "We couldn't fetch Reddit posts right now. Please try again in a few minutes.";
  }

  if (context === "social-search") {
    if (
      normalized.includes("query is required") ||
      normalized.includes("enter an app name or keywords")
    ) {
      return "Add an app name or a few keywords to start social listening.";
    }

    if (
      normalized.includes("no social mentions found for this query") ||
      normalized.includes("no social mentions found")
    ) {
      return 'No public Twitter or Threads mentions were found for this search yet. Try broader keywords like "login issue", "crash", or "review".';
    }

    if (normalized.includes("no relevant social mentions matched")) {
      return "We found public posts, but none looked relevant enough after filtering. Try broader or clearer keywords.";
    }

    if (
      normalized.includes("rate-limited social listening") ||
      normalized.includes("google search failed with status 429") ||
      normalized.includes("429")
    ) {
      return "Social search is temporarily busy. Try again in a few minutes, or use Reddit Listening for now.";
    }

    if (normalized.includes("captcha") || normalized.includes("blocked")) {
      return "Social search is temporarily unavailable. Please try again later.";
    }

    return "We couldn't fetch public social mentions right now. Please try again in a few minutes.";
  }

  if (context === "app-reviews") {
    if (normalized.includes("app not found")) {
      return "We couldn't find that App Store app. Double-check the App ID and try again.";
    }

    if (normalized.includes("no reviews")) {
      return "No App Store reviews were found for that app yet.";
    }

    return "We couldn't connect App Store Reviews right now. Please check the App ID and try again.";
  }

  if (context === "google-play") {
    if (normalized.includes("app not found")) {
      return "We couldn't find that Google Play app. Double-check the package name and try again.";
    }

    if (normalized.includes("no google play reviews available")) {
      return "No recent Google Play reviews were available for that app. Try another app ID or try again later.";
    }

    if (normalized.includes("cannot read properties of undefined")) {
      return "We couldn't read Google Play reviews right now. Please try again in a moment.";
    }

    return "We couldn't connect Google Play Reviews right now. Please check the app ID and try again.";
  }

  if (context === "instagram") {
    return "We couldn't connect Instagram right now. Please try again in a moment.";
  }

  return `We couldn't complete the ${formatProviderLabel(context)} action right now. Please try again.`;
}

export default function ConnectPage() {
  const { session, user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean;
    email: string | null;
    lastSyncedAt: string | null;
  } | null>(null);
  const [appleAppId, setAppleAppId] = useState("");
  const [googlePlayAppId, setGooglePlayAppId] = useState("");
  const [redditForm, setRedditForm] = useState({
    appName: "",
    keywords: "",
  });
  const [socialSearchForm, setSocialSearchForm] = useState({
    appName: "",
    keywords: "",
  });
  const [socialMentions, setSocialMentions] = useState<
    Array<{
      title: string;
      snippet: string;
      platform: string;
      link: string;
    }>
  >([]);
  const [imapForm, setImapForm] = useState({
    email: "",
    imap_host: "",
    imap_port: "993",
    password: "",
    secure: true,
  });
  const [loading, setLoading] = useState(true);
  const [refreshingConnections, setRefreshingConnections] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
  const autoSyncInFlight = useRef(false);

  const detectedImapConfig = useMemo(
    () => getImapConfig(imapForm.email),
    [imapForm.email]
  );

  const loadConnections = useCallback(async (options?: { silent?: boolean }) => {
    if (!session?.access_token) {
      setConnections([]);
      setCalendarStatus(null);
      setLoading(false);
      setRefreshingConnections(false);
      return;
    }

    if (options?.silent) {
      setRefreshingConnections(true);
    } else {
      setLoading(true);
    }

    try {
      const nextConnections = await api.connections.list(session.access_token);
      setConnections(nextConnections);
      const nextCalendarConnection = nextConnections.find(
        (entry) => entry.provider === "google_calendar"
      );
      setCalendarStatus({
        connected: Boolean(nextCalendarConnection),
        email:
          (nextCalendarConnection?.metadata?.email as string | null | undefined) ??
          null,
        lastSyncedAt:
          (nextCalendarConnection?.last_synced_at as string | null | undefined) ??
          null,
      });
    } catch (err) {
      setMessage(getFriendlySourceError(err, "connections"));
    } finally {
      if (options?.silent) {
        setRefreshingConnections(false);
      } else {
        setLoading(false);
      }
    }
  }, [session?.access_token]);

  const loadCalendarStatus = useCallback(async () => {
    if (!session?.access_token) {
      setCalendarStatus(null);
      return;
    }

    try {
      const nextStatus = await api.connections.getGoogleCalendarStatus(
        session.access_token
      );
      setCalendarStatus(nextStatus);
    } catch {
      setCalendarStatus(null);
    }
  }, [session?.access_token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const nextMessage = params.get("message");
    if (success === "calendar") {
      setMessage("Google Calendar connected successfully");
    } else if (error === "calendar") {
      setMessage(nextMessage || "Failed to connect Google Calendar");
    } else if (nextMessage) {
      setMessage(nextMessage);
      params.delete("message");
    }
    params.delete("message");
    params.delete("gmail");
    params.delete("google_calendar");
    params.delete("outlook");
    params.delete("success");
    params.delete("error");
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    void loadCalendarStatus();
  }, [loadCalendarStatus]);

  const connectionMap = useMemo(
    () => ({
      gmail: connections.find((entry) => entry.provider === "gmail"),
      "google-calendar": connections.find(
        (entry) => entry.provider === "google_calendar"
      ),
      outlook: connections.find((entry) => entry.provider === "outlook"),
      instagram: connections.find((entry) => entry.provider === "instagram"),
      imap: connections.find((entry) => entry.provider === "imap"),
      "google-play": connections.find((entry) => entry.provider === "google-play"),
      "app-reviews": connections.find(
        (entry) => entry.provider === "app-reviews"
      ),
    }),
    [connections]
  );

  const effectiveGmailConnected = Boolean(
    connectionMap.gmail || connectionMap["google-calendar"]
  );
  const effectiveGmailEmail =
    (connectionMap.gmail?.metadata?.email as string | undefined) ??
    (connectionMap["google-calendar"]?.metadata?.email as string | undefined) ??
    user?.email ??
    null;
  const effectiveGmailLastSync =
    (connectionMap.gmail?.last_synced_at as string | undefined) ??
    (connectionMap.gmail?.metadata?.lastSyncedAt as string | undefined) ??
    undefined;

  useEffect(() => {
    const connectedAppleAppId = connectionMap["app-reviews"]?.metadata?.appId;
    if (
      typeof connectedAppleAppId === "string" &&
      connectedAppleAppId &&
      connectedAppleAppId !== appleAppId
    ) {
      setAppleAppId(connectedAppleAppId);
    }

    const connectedGooglePlayAppId = connectionMap["google-play"]?.metadata?.appId;
    if (
      typeof connectedGooglePlayAppId === "string" &&
      connectedGooglePlayAppId &&
      connectedGooglePlayAppId !== googlePlayAppId
    ) {
      setGooglePlayAppId(connectedGooglePlayAppId);
    }
  }, [connectionMap, appleAppId, googlePlayAppId]);

  const syncableConnections = useMemo(
    () =>
      connections.filter(
        (
          entry
        ): entry is Connection & {
          provider: SyncableProviderKey;
        } =>
          entry.provider === "gmail" ||
          entry.provider === "outlook" ||
          entry.provider === "google_calendar" ||
          entry.provider === "app-reviews" ||
          entry.provider === "google-play" ||
          entry.provider === "imap"
      ),
    [connections]
  );

  const effectiveCalendarConnected = Boolean(
    connectionMap["google-calendar"] || connectionMap.gmail || calendarStatus?.connected
  );
  const effectiveCalendarEmail =
    (connectionMap["google-calendar"]?.metadata?.email as string | undefined) ??
    (connectionMap.gmail?.metadata?.email as string | undefined) ??
    calendarStatus?.email ??
    null;
  const effectiveCalendarLastSync =
    (connectionMap["google-calendar"]?.last_synced_at as string | undefined) ??
    (connectionMap["google-calendar"]?.metadata?.lastSyncedAt as
      | string
      | undefined) ??
    (connectionMap.gmail?.metadata?.lastSyncedAt as string | undefined) ??
    calendarStatus?.lastSyncedAt ??
    undefined;

  const demoModeActive = isDemoUser(user?.email ?? null);
  const hasFirstLiveSignal = syncableConnections.some(
    (connection) => Boolean(connection.last_synced_at)
  );
  const hasConnectedSources = syncableConnections.length > 0;
  const normalizedMessage = String(message || "").toLowerCase();
  const messageTone = normalizedMessage.includes("couldn't") ||
    normalizedMessage.includes("failed") ||
    normalizedMessage.includes("required") ||
    normalizedMessage.includes("try again")
      ? "error"
      : normalizedMessage.includes("paused") ||
          normalizedMessage.includes("skipped")
        ? "warning"
        : "success";

  useEffect(() => {
    const firstConfigured = syncableConnections[0];

    if (!firstConfigured) {
      setAutoSyncEnabled(false);
      setAutoSyncIntervalMinutes(30);
      return;
    }

    const metadata = firstConfigured.metadata ?? {};
    setAutoSyncEnabled(Boolean(metadata.autoSyncEnabled));
    setAutoSyncIntervalMinutes(
      typeof metadata.autoSyncIntervalMinutes === "number"
        ? Number(metadata.autoSyncIntervalMinutes)
        : 30
    );
  }, [syncableConnections]);

  const connect = async (provider: ProviderKey) => {
    if (!session?.access_token) {
      setMessage("Please sign in before connecting a source.");
      return;
    }

    setMessage(null);

    try {
      const appId =
        provider === "google-play"
          ? googlePlayAppId.trim()
          : provider === "app-reviews"
            ? appleAppId.trim()
            : "";

      if (
        (provider === "google-play" || provider === "app-reviews") &&
        !appId
      ) {
        setMessage(
          provider === "google-play"
            ? "Enter a Google Play package name before connecting reviews."
            : "Enter an Apple App ID before connecting reviews."
        );
        return;
      }

      await api.connections.connect(session.access_token, provider, {
        access_token: `demo-${provider}-token`,
        metadata:
          provider === "instagram"
            ? { accountName: "@productpulse" }
            : {
                appId,
              },
      });

      await loadConnections({ silent: true });
      setMessage(`${formatProviderLabel(provider)} connected successfully.`);
    } catch (err) {
      setMessage(getFriendlySourceError(err, provider));
    }
  };

  const connectGmail = async () => {
    if (!session?.access_token) {
      setMessage("Please sign in before connecting Gmail.");
      return;
    }

    setConnectingGmail(true);
    setMessage(null);

    try {
      const { authUrl } = await api.connections.startGmail(session.access_token);
      window.location.href = authUrl;
    } catch (err) {
      setMessage(getFriendlySourceError(err, "gmail"));
      setConnectingGmail(false);
    }
  };

  const connectOutlook = async () => {
    if (!session?.access_token) {
      setMessage("Please sign in before connecting Outlook.");
      return;
    }

    setConnectingOutlook(true);
    setMessage(null);

    try {
      const { authUrl } = await api.connections.startOutlook(session.access_token);
      window.location.href = authUrl;
    } catch (err) {
      setMessage(getFriendlySourceError(err, "outlook"));
      setConnectingOutlook(false);
    }
  };

  const connectGoogleCalendar = async () => {
    if (!session?.access_token) {
      setMessage("Please sign in before connecting Google Calendar.");
      return;
    }

    setConnectingGoogleCalendar(true);
    setMessage(null);

    try {
      const { authUrl } = await api.connections.startGoogleCalendar(
        session.access_token
      );
      window.location.href = authUrl;
    } catch (err) {
      setMessage(getFriendlySourceError(err, "google-calendar"));
      setConnectingGoogleCalendar(false);
    }
  };

  const connectImap = async () => {
    if (!session?.access_token) {
      setMessage("Please sign in before connecting an inbox.");
      return;
    }

    if (!imapForm.email.trim() || !imapForm.imap_host.trim() || !imapForm.password.trim()) {
      setMessage("Email, IMAP host, and password are required.");
      return;
    }

    setConnectingImap(true);
    setMessage(null);

    try {
      await api.connections.connectImap(session.access_token, {
        email: imapForm.email.trim(),
        imap_host: imapForm.imap_host.trim(),
        imap_port: Number(imapForm.imap_port || "993"),
        password: imapForm.password,
        secure: imapForm.secure,
      });
      setImapForm((current) => ({ ...current, password: "" }));
      await loadConnections({ silent: true });
      setMessage(`Connected IMAP inbox for ${imapForm.email.trim()}.`);
    } catch (err) {
      setMessage(getFriendlySourceError(err, "imap"));
    } finally {
      setConnectingImap(false);
    }
  };

  const fetchReddit = async () => {
    if (!session?.access_token) {
      setMessage("Please sign in before fetching Reddit posts.");
      return;
    }

    const appName = redditForm.appName.trim();
    const keywords = redditForm.keywords.trim();
    const query = [appName, keywords].filter(Boolean).join(" ");

    if (!query) {
      setMessage("Enter an app name or keywords for Reddit listening.");
      return;
    }

    setFetchingReddit(true);
    setMessage(null);

    try {
      const result = await api.social.reddit(session.access_token, {
        query,
        count: 20,
      });
      setMessage(
        `Reddit listening completed. Imported ${result.count} post${result.count === 1 ? "" : "s"} and skipped ${result.duplicatesSkipped} duplicate${result.duplicatesSkipped === 1 ? "" : "s"}.`
      );
    } catch (err) {
      setMessage(getFriendlySourceError(err, "reddit"));
    } finally {
      setFetchingReddit(false);
    }
  };

  const fetchSocialMentions = async () => {
    if (!session?.access_token) {
      setMessage("Please sign in before fetching social mentions.");
      return;
    }

    const appName = socialSearchForm.appName.trim();
    const keywords = socialSearchForm.keywords.trim();
    const query = [appName, keywords].filter(Boolean).join(" ");

    if (!query) {
      setMessage("Enter an app name or keywords for social listening.");
      return;
    }

    setFetchingSocial(true);
    setMessage(null);

    try {
      const result = await api.social.search(session.access_token, { query });
      setSocialMentions(result.mentions);
      setMessage(
        `${result.count} social mention${result.count === 1 ? "" : "s"} fetched. Data integrated into insights.`
      );
    } catch (err) {
      setSocialMentions([]);
      setMessage(getFriendlySourceError(err, "social-search"));
    } finally {
      setFetchingSocial(false);
    }
  };

  const updateImapEmail = (value: string) => {
    setImapForm((current) => {
      const previousDetected = getImapConfig(current.email);
      const nextDetected = getImapConfig(value);

      const shouldUpdateHost =
        !current.imap_host || current.imap_host === previousDetected.host;
      const shouldUpdatePort =
        !current.imap_port || current.imap_port === String(previousDetected.port);
      const shouldUpdateSecure = current.secure === previousDetected.secure;

      return {
        ...current,
        email: value,
        imap_host: shouldUpdateHost ? nextDetected.host : current.imap_host,
        imap_port: shouldUpdatePort ? String(nextDetected.port) : current.imap_port,
        secure: shouldUpdateSecure ? nextDetected.secure : current.secure,
      };
    });
  };

  const syncProvider = useCallback(
    async (provider: ProviderKey, options?: { silent?: boolean }) => {
      if (!session?.access_token) {
        setMessage("Please sign in before syncing.");
        return;
      }

      setSyncingProvider(provider);
      setMessage(null);

      try {
        if (DASHBOARD_DEMO_MODE) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          if (!options?.silent) {
            setMessage(
              provider === "gmail"
                ? "Gmail synced successfully. Imported 25 feedback items and flagged the audit submission spike."
                : `${formatProviderLabel(provider)} synced successfully.`
            );
          }
          window.localStorage.setItem("dashboard-demo-synced", "1");
          return;
        }

        const syncPayload =
          provider === "app-reviews"
            ? { appId: appleAppId.trim() }
            : provider === "google-play"
              ? { appId: googlePlayAppId.trim() }
              : undefined;

        if (
          (provider === "app-reviews" || provider === "google-play") &&
          !syncPayload?.appId
        ) {
          throw new Error(
            provider === "app-reviews"
              ? "Enter an Apple App ID before syncing reviews."
              : "Enter a Google Play package name before syncing reviews."
          );
        }

        const result =
          provider === "imap"
            ? await api.connections.syncImap(session.access_token)
            : await api.connections.sync(session.access_token, provider, syncPayload);
        await loadConnections({ silent: true });
        await loadCalendarStatus();
        if (!options?.silent) {
          setMessage(
            `${formatProviderLabel(provider)} synced successfully.${provider === "google-calendar" ? "" : ` Imported ${result.imported} feedback item${result.imported === 1 ? "" : "s"}${typeof result.skipped === "number" ? ` and skipped ${result.skipped} non-product message${result.skipped === 1 ? "" : "s"}` : ""}`}.`
          );
        }
      } catch (err) {
        let nextMessage: string;

        if (provider === "gmail") {
          nextMessage =
            "We couldn't sync Gmail right now. Please try again in a moment.";
        } else if (provider === "outlook") {
          nextMessage =
            "We couldn't sync Outlook right now. Please try again in a moment.";
        } else if (provider === "google-calendar") {
          nextMessage =
            "We couldn't sync Google Calendar right now. Please try again in a moment.";
        } else {
          nextMessage = getFriendlySourceError(err, provider);
        }

        if (options?.silent) {
          setAutoSyncStatus(nextMessage);
        } else {
          setMessage(nextMessage);
        }
      } finally {
        setSyncingProvider(null);
      }
    },
    [
      appleAppId,
      googlePlayAppId,
      loadCalendarStatus,
      loadConnections,
      session?.access_token,
    ]
  );

  const saveAutoSyncSettings = useCallback(
    async (enabled: boolean, intervalMinutes: number) => {
      if (!session?.access_token || syncableConnections.length === 0) {
        setAutoSyncEnabled(enabled);
        setAutoSyncIntervalMinutes(intervalMinutes);
        return;
      }

      setSavingAutoSync(true);

      try {
        await Promise.all(
          syncableConnections.map((connection) =>
            api.connections.update(session.access_token, connection.id, {
              metadata: {
                autoSyncEnabled: enabled,
                autoSyncIntervalMinutes: intervalMinutes,
              },
            })
          )
        );

        setAutoSyncEnabled(enabled);
        setAutoSyncIntervalMinutes(intervalMinutes);
        await loadConnections({ silent: true });
        setAutoSyncStatus(
          enabled
            ? `Auto-sync is on. Connected sources will refresh about every ${intervalMinutes} minutes while this page is open.`
            : "Auto-sync is off."
        );
      } catch (err) {
        setMessage(getFriendlySourceError(err, "auto-sync"));
      } finally {
        setSavingAutoSync(false);
      }
    },
    [loadConnections, session?.access_token, syncableConnections]
  );

  useEffect(() => {
    if (!session?.access_token || !autoSyncEnabled || syncableConnections.length === 0) {
      return;
    }

    const maybeRunAutoSync = async () => {
      if (autoSyncInFlight.current) {
        return;
      }

      const now = Date.now();
      const dueConnections = syncableConnections.filter((connection) => {
        const lastValue =
          connection.last_synced_at ??
          (connection.metadata?.lastSyncedAt as string | undefined) ??
          null;

        if (!lastValue) {
          return true;
        }

        const lastTime = new Date(lastValue).getTime();
        if (Number.isNaN(lastTime)) {
          return true;
        }

        return now - lastTime >= autoSyncIntervalMinutes * 60 * 1000;
      });

      if (dueConnections.length === 0) {
        return;
      }

      autoSyncInFlight.current = true;
      setAutoSyncStatus("Auto-sync is refreshing connected sources in the background.");

      try {
        for (const connection of dueConnections) {
          await syncProvider(connection.provider, { silent: true });
        }

        setAutoSyncStatus(
          `Auto-sync completed. Next refresh will happen after about ${autoSyncIntervalMinutes} minutes.`
        );
      } finally {
        autoSyncInFlight.current = false;
      }
    };

    void maybeRunAutoSync();
    const timer = window.setInterval(() => {
      void maybeRunAutoSync();
    }, 60000);

    return () => window.clearInterval(timer);
  }, [
    autoSyncEnabled,
    autoSyncIntervalMinutes,
    session?.access_token,
    syncProvider,
    syncableConnections,
  ]);

  const disconnect = async (provider: ConnectedProviderKey) => {
    if (!session?.access_token) {
      return;
    }

    const connection = connectionMap[provider];
    if (!connection) {
      return;
    }

    setMessage(null);

    try {
      await api.connections.disconnect(session.access_token, connection.id);
      await loadConnections({ silent: true });
      setMessage(`${formatProviderLabel(provider)} disconnected.`);
    } catch (err) {
      setMessage(getFriendlySourceError(err, "disconnect"));
    }
  };

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3 pt-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Data Sources</h1>
          {demoModeActive ? null : null}
        </div>
        <p className="max-w-2xl text-lg text-slate-500 dark:text-slate-400">
          Connect real customer channels, sync feedback into the database, and let
          Product Pulse turn it into actionable issue intelligence.
        </p>
      </div>

      {hasFirstLiveSignal ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-sm text-emerald-800 shadow-[0_16px_40px_rgba(16,185,129,0.08)] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100 dark:shadow-[0_16px_40px_rgba(5,150,105,0.12)]">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">Product Pulse is live.</p>
          <p className="mt-1 text-emerald-700 dark:text-emerald-100/80">
            Your first real signal has already landed. Keep syncing your sources to deepen the issue map and weekly reports.
          </p>
        </div>
      ) : !hasConnectedSources ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">Start with one real source.</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Connect Gmail, Outlook, IMAP, or app reviews first. Once the first sync completes, Product Pulse will begin filling your dashboard, timeline, and weekly report automatically.
          </p>
        </div>
      ) : null}

      {message && (
        <div
          className={`mb-6 mt-6 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
            messageTone === "success"
              ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
              : messageTone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          }`}
        >
          {message}
        </div>
      )}

      {demoModeActive ? null : null}

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-[0_12px_40px_rgba(15,23,42,0.2)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Auto-sync</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Keep connected sources fresh while this page is open. Product Pulse only syncs sources whose last sync is older than your chosen interval.
          </p>
          {autoSyncStatus && (
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{autoSyncStatus}</p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950/80">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                autoSyncEnabled
                  ? "bg-slate-900 text-white shadow-sm dark:bg-emerald-500 dark:text-slate-950"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
              onClick={() => void saveAutoSyncSettings(true, autoSyncIntervalMinutes)}
              disabled={savingAutoSync || syncableConnections.length === 0}
            >
              On
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                !autoSyncEnabled
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              }`}
              onClick={() => void saveAutoSyncSettings(false, autoSyncIntervalMinutes)}
              disabled={savingAutoSync || syncableConnections.length === 0}
            >
              Off
            </button>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
            Interval
            <select
              value={String(autoSyncIntervalMinutes)}
              onChange={(event) => {
                const nextInterval = Number(event.target.value);
                setAutoSyncIntervalMinutes(nextInterval);
                void saveAutoSyncSettings(autoSyncEnabled, nextInterval);
              }}
              disabled={savingAutoSync || syncableConnections.length === 0}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">60 min</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SourceCard
          name="Gmail"
          icon="gmail"
          connected={effectiveGmailConnected}
          accountName={
            effectiveGmailEmail ??
            "Connect your Gmail inbox"
          }
          lastSync={
            formatSyncTime(effectiveGmailLastSync)
          }
          healthLabel={
            effectiveGmailConnected
              ? getConnectionHealth(connectionMap.gmail).label
              : "Ready to connect"
          }
          healthTone={
            effectiveGmailConnected
              ? getConnectionHealth(connectionMap.gmail).tone
              : "neutral"
          }
          onConnect={connectGmail}
          onSync={() => syncProvider("gmail")}
          syncing={syncingProvider === "gmail" || connectingGmail}
          onDisconnect={() => disconnect("gmail")}
        />

        <SourceCard
          name="Google Calendar"
          icon="google-calendar"
          connected={effectiveCalendarConnected}
          accountName={
            effectiveCalendarConnected
              ? `Connected as ${effectiveCalendarEmail ?? "your Google account"}`
              : "Allow Product Pulse to schedule events, reminders, and follow-ups automatically."
          }
          lastSync={
            formatSyncTime(effectiveCalendarLastSync)
          }
          healthLabel={
            effectiveCalendarConnected ? "Connected and ready" : "Not connected"
          }
          healthTone={effectiveCalendarConnected ? "good" : "neutral"}
          onConnect={connectGoogleCalendar}
          onSync={() => syncProvider("google-calendar")}
          syncing={
            connectingGoogleCalendar || syncingProvider === "google-calendar"
          }
          connectLabel="Connect Calendar"
          reconnectLabel="Reconnect"
          workingLabel="Connecting..."
          onDisconnect={() => disconnect("google-calendar")}
          helperText="Used by the agent to schedule tasks automatically."
        />

        <SourceCard
          name="Reddit Listening"
          icon="reddit"
          connected={false}
          accountName="Search public Reddit posts for product signals"
          healthLabel="On-demand discovery"
          healthTone="neutral"
          onConnect={fetchReddit}
          syncing={fetchingReddit}
          connectLabel="Fetch Posts"
        >
          <div className="grid gap-3">
            <Input
              placeholder="App name (e.g. Product Pulse)"
              value={redditForm.appName}
              onChange={(event) =>
                setRedditForm((current) => ({
                  ...current,
                  appName: event.target.value,
                }))
              }
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
            <Input
              placeholder="Keywords (e.g. crashing billing slow login)"
              value={redditForm.keywords}
              onChange={(event) =>
                setRedditForm((current) => ({
                  ...current,
                  keywords: event.target.value,
                }))
              }
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
            <p className="text-xs text-slate-500">
              Product Pulse searches public Reddit posts only and sends matching posts into your feedback pipeline.
            </p>
          </div>
        </SourceCard>

        <SourceCard
          name="Social Listening"
          icon="social-search"
          connected={false}
          accountName="Search Google results for Twitter and Threads mentions"
          healthLabel="Low-frequency MVP search"
          healthTone="neutral"
          onConnect={fetchSocialMentions}
          syncing={fetchingSocial}
          connectLabel="Fetch Social Mentions"
        >
          <div className="grid gap-3">
            <Input
              placeholder="App name (e.g. Product Pulse)"
              value={socialSearchForm.appName}
              onChange={(event) =>
                setSocialSearchForm((current) => ({
                  ...current,
                  appName: event.target.value,
                }))
              }
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
            <Input
              placeholder="Keywords (e.g. crashing login billing)"
              value={socialSearchForm.keywords}
              onChange={(event) =>
                setSocialSearchForm((current) => ({
                  ...current,
                  keywords: event.target.value,
                }))
              }
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
            <p className="text-xs text-slate-500">
              Searches lightweight Google results for Twitter and Threads mentions, then feeds relevant mentions into Product Pulse.
            </p>

            {socialMentions.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Latest Mentions
                </p>
                <div className="space-y-2">
                  {socialMentions.slice(0, 5).map((mention) => (
                    <a
                      key={mention.link}
                      href={mention.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 transition hover:border-slate-700 hover:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-medium text-white">
                          {mention.title}
                        </p>
                        <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-300">
                          {mention.platform}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                        {mention.snippet}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SourceCard>

        <SourceCard
          name="Outlook"
          icon="outlook"
          connected={Boolean(connectionMap.outlook)}
          accountName={
            (connectionMap.outlook?.metadata?.email as string | undefined) ??
            "Connect your Outlook inbox"
          }
          lastSync={
            formatSyncTime(
              (connectionMap.outlook?.last_synced_at as string | undefined) ??
                (connectionMap.outlook?.metadata?.lastSyncedAt as string | undefined) ??
                undefined
            )
          }
          healthLabel={getConnectionHealth(connectionMap.outlook).label}
          healthTone={getConnectionHealth(connectionMap.outlook).tone}
          onConnect={connectOutlook}
          onSync={() => syncProvider("outlook")}
          syncing={syncingProvider === "outlook" || connectingOutlook}
          onDisconnect={() => disconnect("outlook")}
        />

        <SourceCard
          name="Email Inbox"
          icon="imap"
          connected={Boolean(connectionMap.imap)}
          accountName={
            (connectionMap.imap?.metadata?.email as string | undefined) ??
            "Connect any IMAP inbox"
          }
          lastSync={
            formatSyncTime(
              (connectionMap.imap?.last_synced_at as string | undefined) ??
                (connectionMap.imap?.metadata?.lastSyncedAt as string | undefined) ??
                undefined
            )
          }
          healthLabel={getConnectionHealth(connectionMap.imap).label}
          healthTone={getConnectionHealth(connectionMap.imap).tone}
          onConnect={connectImap}
          onSync={() => syncProvider("imap")}
          syncing={syncingProvider === "imap" || connectingImap}
          onDisconnect={() => disconnect("imap")}
          collapsible
          collapsedLabel="Show IMAP setup"
        >
          {!connectionMap.imap && (
            <div className="grid gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <ImapSetupInfoSheet />
                </div>
                <Input
                  placeholder="Email address"
                  value={imapForm.email}
                  onChange={(event) => updateImapEmail(event.target.value)}
                  className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    IMAP Host
                  </label>
                  <Input
                    placeholder="IMAP host (e.g. imap.gmail.com)"
                    value={imapForm.imap_host}
                    onChange={(event) =>
                      setImapForm((current) => ({
                        ...current,
                        imap_host: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                  />
                  <p className="text-xs text-slate-500">
                    {detectedImapConfig.host
                      ? `Auto-detected based on your email provider${detectedImapConfig.providerLabel ? ` (${detectedImapConfig.providerLabel})` : ""}.`
                      : "We use common IMAP defaults and you can override them if needed."}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Port
                  </label>
                  <Input
                    placeholder="Port"
                    value={imapForm.imap_port}
                    onChange={(event) =>
                      setImapForm((current) => ({
                        ...current,
                        imap_port: event.target.value,
                      }))
                    }
                    className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="App password or mailbox password"
                  value={imapForm.password}
                  onChange={(event) =>
                    setImapForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                />
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={imapForm.secure}
                  onChange={(event) =>
                    setImapForm((current) => ({
                      ...current,
                      secure: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                />
                Use secure IMAP (SSL/TLS)
              </label>
            </div>
          )}
        </SourceCard>

        <SourceCard
          name="App Store Reviews"
          icon="app-reviews"
          connected={Boolean(connectionMap["app-reviews"])}
          accountName={
            connectionMap["app-reviews"]?.metadata?.appId
              ? `App ID: ${String(connectionMap["app-reviews"]?.metadata?.appId)}`
              : "Track Apple App Store feedback"
          }
          lastSync={
            formatSyncTime(
              (connectionMap["app-reviews"]?.last_synced_at as string | undefined) ??
                (connectionMap["app-reviews"]?.metadata?.lastSyncedAt as string | undefined) ??
                undefined
            )
          }
          healthLabel={getConnectionHealth(connectionMap["app-reviews"]).label}
          healthTone={getConnectionHealth(connectionMap["app-reviews"]).tone}
          onSync={() => syncProvider("app-reviews")}
          syncing={syncingProvider === "app-reviews"}
          onConnect={() => connect("app-reviews")}
          onDisconnect={() => disconnect("app-reviews")}
          alwaysShowChildren
        >
          <div className="grid gap-2">
            <Input
              placeholder="Enter Apple App ID"
              value={appleAppId}
              onChange={(e) => setAppleAppId(e.target.value)}
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
            <p className="text-xs text-slate-500">
              {connectionMap["app-reviews"]
                ? "You can update the App ID here before syncing again."
                : "Paste the Apple App Store ID you want Product Pulse to monitor."}
            </p>
          </div>
        </SourceCard>

        <SourceCard
          name="Google Play Reviews"
          icon="google-play"
          connected={Boolean(connectionMap["google-play"])}
          accountName={
            connectionMap["google-play"]?.metadata?.appId
              ? `App ID: ${String(connectionMap["google-play"]?.metadata?.appId)}`
              : "Track Google Play Store feedback"
          }
          lastSync={
            formatSyncTime(
              (connectionMap["google-play"]?.last_synced_at as string | undefined) ??
                (connectionMap["google-play"]?.metadata?.lastSyncedAt as string | undefined) ??
                undefined
            )
          }
          healthLabel={getConnectionHealth(connectionMap["google-play"]).label}
          healthTone={getConnectionHealth(connectionMap["google-play"]).tone}
          onSync={() => syncProvider("google-play")}
          syncing={syncingProvider === "google-play"}
          onConnect={() => connect("google-play")}
          onDisconnect={() => disconnect("google-play")}
          alwaysShowChildren
        >
          <div className="grid gap-2">
            <Input
              placeholder="Enter Play Store App ID (e.g. com.instagram.android)"
              value={googlePlayAppId}
              onChange={(e) => setGooglePlayAppId(e.target.value)}
              className="h-11 rounded-xl border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/50 focus-visible:ring-2 focus-visible:ring-indigo-500/50"
            />
            <p className="text-xs text-slate-500">
              {connectionMap["google-play"]
                ? "Update the package name here if you want to switch apps before the next sync."
                : "Use the package name from Google Play, like com.instagram.android."}
            </p>
          </div>
        </SourceCard>

        <SourceCard
          name="Instagram"
          icon="instagram"
          connected={Boolean(connectionMap.instagram)}
          accountName={
            (connectionMap.instagram?.metadata?.accountName as string | undefined) ??
            "@yourbrand"
          }
          lastSync={
            formatSyncTime(
              (connectionMap.instagram?.last_synced_at as string | undefined) ??
                (connectionMap.instagram?.metadata?.lastSyncedAt as string | undefined) ??
                undefined
            )
          }
          healthLabel={getConnectionHealth(connectionMap.instagram).label}
          healthTone={getConnectionHealth(connectionMap.instagram).tone}
          onConnect={() => connect("instagram")}
          onDisconnect={() => disconnect("instagram")}
        />
      </div>

      {(loading || refreshingConnections) && (
        <p className="mt-4 text-sm text-slate-500">
          {loading ? "Loading connected sources..." : "Syncing changes without reloading the page..."}
        </p>
      )}
    </div>
  );
}
