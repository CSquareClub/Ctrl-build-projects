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

const OPEN_STORAGE_KEY = "product-pulse-agent-panel-open";
const EXPANDED_STORAGE_KEY = "product-pulse-agent-panel-expanded";

type AgentCommandPanelContextValue = {
  open: boolean;
  expanded: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  toggleExpanded: () => void;
};

const AgentCommandPanelContext = createContext<AgentCommandPanelContextValue | null>(null);

export function AgentCommandPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      setOpen(window.localStorage.getItem(OPEN_STORAGE_KEY) === "true");
      setExpanded(window.localStorage.getItem(EXPANDED_STORAGE_KEY) === "true");
    } catch {
      // Ignore storage failures.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(OPEN_STORAGE_KEY, String(open));
    } catch {
      // Ignore storage failures.
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(EXPANDED_STORAGE_KEY, String(expanded));
    } catch {
      // Ignore storage failures.
    }
  }, [expanded]);

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => setOpen((current) => !current), []);
  const toggleExpanded = useCallback(() => setExpanded((current) => !current), []);

  const value = useMemo(
    () => ({
      open,
      expanded,
      openPanel,
      closePanel,
      togglePanel,
      toggleExpanded,
    }),
    [closePanel, expanded, open, openPanel, toggleExpanded, togglePanel]
  );

  return (
    <AgentCommandPanelContext.Provider value={value}>
      {children}
    </AgentCommandPanelContext.Provider>
  );
}

export function useAgentCommandPanel() {
  const context = useContext(AgentCommandPanelContext);

  if (!context) {
    throw new Error("useAgentCommandPanel must be used within AgentCommandPanelProvider.");
  }

  return context;
}
