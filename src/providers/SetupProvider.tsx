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
import { api, type SetupStatus } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

interface SetupContextType {
  status: SetupStatus | null;
  loading: boolean;
  refreshSetup: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType>({
  status: null,
  loading: true,
  refreshSetup: async () => {},
});
const REFRESH_INTERVAL_MS = 10000;

export function SetupProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef(false);

  const refreshSetup = useCallback(async (options?: { silent?: boolean }) => {
    if (!session?.access_token) {
      setStatus(null);
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
      const next = await api.setup.status(session.access_token);
      setStatus(next);
    } catch {
      if (!options?.silent) {
        setStatus(null);
      }
    } finally {
      refreshInFlight.current = false;
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) return;
    void refreshSetup();
  }, [authLoading, refreshSetup]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshSetup({ silent: true });
      }
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [refreshSetup, session?.access_token]);

  return (
    <SetupContext.Provider value={{ status, loading, refreshSetup }}>
      {children}
    </SetupContext.Provider>
  );
}

export function useSetup() {
  return useContext(SetupContext);
}
