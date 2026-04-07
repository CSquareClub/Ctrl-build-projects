"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type Notification } from "@/lib/api";
import { DASHBOARD_DEMO_MODE, dashboardDemoNotifications } from "@/lib/dashboard-demo";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "./AuthProvider";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from "@/services/notificationClient";
import { useLiveEvents } from "./LiveEventsProvider";

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  permission: NotificationPermission | "unsupported";
  refreshNotifications: () => void;
  markAsRead: (ids: string[]) => Promise<void>;
  requestPermission: () => Promise<NotificationPermission | "unsupported">;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const REFRESH_INTERVAL_MS = 10000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { subscribeToEvents } = useLiveEvents();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    getBrowserNotificationPermission()
  );
  const hasLoadedOnce = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());
  const refreshInFlight = useRef(false);

  const buildNotificationUrl = useCallback((notification: Notification) => {
    const issueId = typeof notification.metadata?.issueId === "string" ? notification.metadata.issueId : null;
    const ticketId = typeof notification.metadata?.ticketId === "string" ? notification.metadata.ticketId : null;

    if (issueId && issueId !== "timeline-spike") {
      return `/dashboard/issues/${issueId}`;
    }

    if (ticketId) {
      return "/dashboard/tickets";
    }

    return "/dashboard/command-center";
  }, []);

  const refreshNotifications = useCallback(async (options?: { silent?: boolean }) => {
    if (DASHBOARD_DEMO_MODE) {
      setNotifications(dashboardDemoNotifications);
      setUnreadCount(
        dashboardDemoNotifications.filter((notification) => !notification.read).length
      );
      setError(null);
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
      return;
    }

    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;

    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await api.notifications.list(session.access_token);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);

      const nextIds = new Set(result.notifications.map((notification) => notification.id));
      if (!hasLoadedOnce.current) {
        seenIds.current = nextIds;
        hasLoadedOnce.current = true;
      } else {
        const newNotifications = result.notifications.filter(
          (notification) => !seenIds.current.has(notification.id)
        );

        seenIds.current = nextIds;

        if (permission === "granted") {
          newNotifications
            .filter((notification) => !notification.read)
            .forEach((notification) => {
              sendBrowserNotification({
                id: notification.id,
                title: notification.title,
                body: notification.message,
                url: buildNotificationUrl(notification),
              });
            });
        }
      }
    } catch (err) {
      if (!options?.silent) {
        setNotifications([]);
        setUnreadCount(0);
        setError(toUserFacingError(err, "agent-load"));
      }
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, [buildNotificationUrl, permission, session?.access_token]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshNotifications({ silent: true });
      }
    };

    const timer = window.setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refreshNotifications, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    return subscribeToEvents((event) => {
      if (event.type === "notification_created") {
        const notification = event.payload?.notification as Notification | undefined;
        if (!notification) {
          void refreshNotifications({ silent: true });
          return;
        }

        setNotifications((current) => {
          if (current.some((entry) => entry.id === notification.id)) {
            return current;
          }
          return [notification, ...current].slice(0, 25);
        });
        setUnreadCount((current) => current + (notification.read ? 0 : 1));

        if (permission === "granted" && !notification.read) {
          sendBrowserNotification({
            id: notification.id,
            title: notification.title,
            body: notification.message,
            url: buildNotificationUrl(notification),
          });
        }
        return;
      }

      if (event.type === "notification_read") {
        const notificationId = String(event.payload?.notificationId || "");
        if (!notificationId) {
          return;
        }
        setNotifications((current) =>
          current.map((entry) =>
            entry.id === notificationId ? { ...entry, read: true } : entry
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    }, {
      types: ["notification_created", "notification_read"],
    });
  }, [
    buildNotificationUrl,
    permission,
    refreshNotifications,
    session?.access_token,
    subscribeToEvents,
  ]);

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
  }, []);

  const markAsRead = useCallback(
    async (ids: string[]) => {
      if (DASHBOARD_DEMO_MODE) {
        setNotifications((current) =>
          current.map((entry) =>
            ids.includes(entry.id) ? { ...entry, read: true } : entry
          )
        );
        setUnreadCount((current) => Math.max(0, current - ids.length));
        return;
      }

      if (!session?.access_token || ids.length === 0) {
        return;
      }

      setNotifications((current) =>
        current.map((entry) =>
          ids.includes(entry.id) ? { ...entry, read: true } : entry
        )
      );
      setUnreadCount((current) => Math.max(0, current - ids.length));

      try {
        await api.notifications.markRead(session.access_token, ids);
        await refreshNotifications({ silent: true });
      } catch (error) {
        await refreshNotifications({ silent: true });
        throw error;
      }
    },
    [refreshNotifications, session?.access_token]
  );

  const requestPermission = useCallback(async () => {
    const nextPermission = await requestBrowserNotificationPermission();
    setPermission(nextPermission);
    return nextPermission;
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      permission,
      refreshNotifications,
      markAsRead,
      requestPermission,
    }),
    [error, loading, markAsRead, notifications, permission, refreshNotifications, requestPermission, unreadCount]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider.");
  }

  return context;
}
