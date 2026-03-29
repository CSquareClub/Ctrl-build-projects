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
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "./AuthProvider";

interface IssuesContextType {
  issues: Issue[];
  loading: boolean;
  error: string | null;
  refreshIssues: () => void;
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

  const refreshIssues = useCallback(async () => {
    if (!session?.access_token) {
      setIssues([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
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

  return (
    <IssuesContext.Provider
      value={{ issues, loading, error, refreshIssues }}
    >
      {children}
    </IssuesContext.Provider>
  );
}

export const useIssues = () => useContext(IssuesContext);

