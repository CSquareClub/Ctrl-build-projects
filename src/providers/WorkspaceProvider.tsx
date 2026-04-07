"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, type WorkspaceSummary } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

interface WorkspaceContextType {
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  loading: boolean;
  refreshWorkspaces: (options?: { silent?: boolean }) => Promise<void>;
  setActiveWorkspaceId: (workspaceId: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  activeWorkspace: null,
  loading: true,
  refreshWorkspaces: async () => {},
  setActiveWorkspaceId: () => {},
});

const STORAGE_KEY = "product-pulse-active-workspace";
const REFRESH_INTERVAL_MS = 10000;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveWorkspaceIdState(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const refreshWorkspaces = useCallback(async (options?: { silent?: boolean }) => {
    if (!session?.access_token) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    if (refreshInFlight.current) {
      return;
    }

    refreshInFlight.current = true;
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const data = await api.collaboration.workspaces(session.access_token);
      setWorkspaces(data.workspaces);

      const preferred =
        (activeWorkspaceId &&
          data.workspaces.find((entry) => entry.workspace.id === activeWorkspaceId)) ||
        data.activeWorkspace ||
        data.workspaces[0] ||
        null;

      if (preferred?.workspace.id) {
        setActiveWorkspaceIdState(preferred.workspace.id);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, preferred.workspace.id);
        }
      }
    } catch {
      if (!options?.silent) {
        setWorkspaces([]);
      }
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, [activeWorkspaceId, session?.access_token]);

  useEffect(() => {
    if (authLoading) return;
    void refreshWorkspaces();
  }, [authLoading, refreshWorkspaces]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshWorkspaces({ silent: true });
      }
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refreshWorkspaces, session?.access_token]);

  const setActiveWorkspaceId = useCallback((workspaceId: string) => {
    setActiveWorkspaceIdState(workspaceId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, workspaceId);
    }
  }, []);

  const activeWorkspace =
    workspaces.find((entry) => entry.workspace.id === activeWorkspaceId) ||
    workspaces[0] ||
    null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        refreshWorkspaces,
        setActiveWorkspaceId,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
