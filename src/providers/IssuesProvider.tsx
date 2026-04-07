"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Issue } from "@/lib/api";
import { api } from "@/lib/api";
import { DASHBOARD_DEMO_MODE, dashboardDemoIssues } from "@/lib/dashboard-demo";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "./AuthProvider";
import { useLiveEvents } from "./LiveEventsProvider";

interface IssuesContextType {
  issues: Issue[];
  loading: boolean;
  error: string | null;
  refreshIssues: (options?: { silent?: boolean }) => void;
}

const IssuesContext = createContext<IssuesContextType>({
  issues: [],
  loading: false,
  error: null,
  refreshIssues: () => {},
});

export function IssuesProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session, loading: authLoading } = useAuth();
  const { subscribeToEvents } = useLiveEvents();

  const refreshIssues = useCallback(async (options?: { silent?: boolean }) => {
    if (DASHBOARD_DEMO_MODE) {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      window.setTimeout(() => {
        setIssues(dashboardDemoIssues);
        setLoading(false);
      }, options?.silent ? 0 : 900);
      return;
    }

    if (!session?.access_token) {
      setIssues([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const nextIssues = await api.issues.list(session.access_token);
      setIssues(nextIssues);
    } catch (err) {
      setIssues([]);
      setError(toUserFacingError(err, "issues-load"));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refreshIssues();
  }, [authLoading, refreshIssues]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    return subscribeToEvents(
      () => {
        void refreshIssues({ silent: true });
      },
      {
        types: [
          "new_feedback",
          "agent_action",
          "job_completed",
          "patch_accepted",
        ],
      }
    );
  }, [refreshIssues, session?.access_token, subscribeToEvents]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshIssues({ silent: true });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [refreshIssues, session?.access_token]);

  return (
    <IssuesContext.Provider
      value={{ issues, loading, error, refreshIssues }}
    >
      {children}
    </IssuesContext.Provider>
  );
}

export const useIssues = () => useContext(IssuesContext);

