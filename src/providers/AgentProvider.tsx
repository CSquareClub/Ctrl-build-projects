"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type AgentAction, type AgentStatus } from "@/lib/api";
import { DEMO_UI_MODE, demoAgentActions, demoAgentStatus } from "@/lib/demo-ui-mode";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "./AuthProvider";
import { useLiveEvents } from "./LiveEventsProvider";

const EMPTY_STATUS: AgentStatus = {
  enabled: true,
  state: "idle",
  lastRunAt: null,
  latestBanner: null,
  latestAction: null,
  actions: [],
  listening: true,
};

interface AgentContextValue {
  status: AgentStatus;
  actions: AgentAction[];
  loading: boolean;
  error: string | null;
  refreshAgent: (options?: { silent?: boolean }) => void;
  setAgentEnabled: (enabled: boolean) => Promise<void>;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { subscribeToEvents } = useLiveEvents();
  const [status, setStatus] = useState<AgentStatus>(EMPTY_STATUS);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAgent = useCallback(async (options?: { silent?: boolean }) => {
    if (DEMO_UI_MODE) {
      setStatus(demoAgentStatus);
      setActions(demoAgentActions);
      setError(null);
      setLoading(false);
      return;
    }

    if (!session?.access_token) {
      setStatus(EMPTY_STATUS);
      setActions([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const [nextStatus, nextActions] = await Promise.all([
        api.agent.status(session.access_token),
        api.agent.actions(session.access_token),
      ]);
      setStatus({ ...nextStatus, actions: nextActions });
      setActions(nextActions);
    } catch (err) {
      setStatus(EMPTY_STATUS);
      setActions([]);
      setError(toUserFacingError(err, "agent-load"));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void refreshAgent();
  }, [refreshAgent]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    if (DEMO_UI_MODE) {
      return;
    }

    return subscribeToEvents(
      (event) => {
        if (event.type === "agent_status") {
          const payload = event.payload as Partial<AgentStatus>;
          setStatus((current) => ({
            ...current,
            ...payload,
            state:
              payload.state === "processing"
                ? "active"
                : (payload.state ?? current.state),
          }));
          return;
        }

        if (event.type === "agent_action") {
          const nextAction = (event.payload?.action || null) as AgentAction | null;
          if (!nextAction) {
            void refreshAgent({ silent: true });
            return;
          }

          setActions((current) => {
            if (current.some((entry) => entry.id === nextAction.id)) {
              return current;
            }
            return [nextAction, ...current].slice(0, 40);
          });
          setStatus((current) => ({
            ...current,
            latestAction: nextAction,
            latestBanner: nextAction.reason,
            actions: current.actions.some((entry) => entry.id === nextAction.id)
              ? current.actions
              : [nextAction, ...current.actions].slice(0, 40),
          }));
          return;
        }

        if (event.type === "job_completed" || event.type === "job_failed") {
          void refreshAgent({ silent: true });
        }
      },
      {
        types: ["agent_status", "agent_action", "job_completed", "job_failed"],
      }
    );
  }, [refreshAgent, session?.access_token, subscribeToEvents]);

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    if (DEMO_UI_MODE) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshAgent({ silent: true });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [refreshAgent, session?.access_token]);

  const setAgentEnabled = useCallback(
    async (enabled: boolean) => {
      if (DEMO_UI_MODE) {
        setStatus((current) => ({
          ...current,
          enabled,
        }));
        return;
      }

      if (!session?.access_token) {
        return;
      }

      const nextStatus = await api.agent.updateSettings(session.access_token, enabled);
      setStatus((current) => ({
        ...current,
        ...nextStatus,
      }));
    },
    [session?.access_token]
  );

  const value = useMemo(
    () => ({
      status,
      actions,
      loading,
      error,
      refreshAgent,
      setAgentEnabled,
    }),
    [actions, error, loading, refreshAgent, setAgentEnabled, status]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const context = useContext(AgentContext);

  if (!context) {
    throw new Error("useAgent must be used within AgentProvider.");
  }

  return context;
}
