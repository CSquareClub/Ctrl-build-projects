"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Mail,
  Smartphone,
  AppWindow,
  MessageCircleHeart,
  Inbox,
  MessageSquareText,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  name: string;
  icon:
    | "gmail"
    | "github"
    | "outlook"
    | "app-reviews"
    | "google-play"
    | "google-calendar"
    | "instagram"
    | "imap"
    | "reddit"
    | "social-search";
  connected: boolean;
  accountName?: string;
  lastSync?: string;
  healthLabel?: string;
  healthTone?: "good" | "warning" | "neutral";
  onConnect?: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  syncing?: boolean;
  connectLabel?: string;
  reconnectLabel?: string;
  workingLabel?: string;
  collapsible?: boolean;
  collapsedLabel?: string;
  alwaysShowChildren?: boolean;
  helperText?: string;
  children?: React.ReactNode;
}

const iconMap = {
  gmail: Mail,
  github: GitBranch,
  outlook: Mail,
  "app-reviews": Smartphone,
  "google-play": Smartphone,
  "google-calendar": Calendar,
  instagram: MessageCircleHeart,
  imap: Inbox,
  reddit: MessageSquareText,
  "social-search": Globe2,
};

const sourceTheme = {
  gmail: {
    idleAccent: "before:bg-rose-400/25 dark:before:bg-rose-400/20",
    connectedAccent: "before:bg-rose-500/40 dark:before:bg-rose-400/30",
    iconIdle: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    iconConnected: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-300 dark:bg-rose-500/14 dark:text-rose-300 dark:ring-rose-500/30",
  },
  github: {
    idleAccent: "before:bg-slate-400/20 dark:before:bg-slate-400/20",
    connectedAccent: "before:bg-slate-500/35 dark:before:bg-slate-300/25",
    iconIdle: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800",
    iconConnected: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  },
  outlook: {
    idleAccent: "before:bg-sky-400/22 dark:before:bg-sky-400/18",
    connectedAccent: "before:bg-sky-500/38 dark:before:bg-sky-400/28",
    iconIdle: "bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    iconConnected: "bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-300 dark:bg-sky-500/14 dark:text-sky-300 dark:ring-sky-500/30",
  },
  instagram: {
    idleAccent: "before:bg-pink-400/22 dark:before:bg-pink-400/18",
    connectedAccent: "before:bg-pink-500/36 dark:before:bg-pink-400/28",
    iconIdle: "bg-pink-50 text-pink-600 ring-1 ring-inset ring-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:ring-pink-500/20",
    iconConnected: "bg-pink-50 text-pink-600 ring-1 ring-inset ring-pink-300 dark:bg-pink-500/14 dark:text-pink-300 dark:ring-pink-500/30",
  },
  reddit: {
    idleAccent: "before:bg-orange-400/24 dark:before:bg-orange-400/18",
    connectedAccent: "before:bg-orange-500/38 dark:before:bg-orange-400/28",
    iconIdle: "bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
    iconConnected: "bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-300 dark:bg-orange-500/14 dark:text-orange-300 dark:ring-orange-500/30",
  },
  "social-search": {
    idleAccent: "before:bg-violet-400/22 dark:before:bg-violet-400/18",
    connectedAccent: "before:bg-violet-500/38 dark:before:bg-violet-400/28",
    iconIdle: "bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20",
    iconConnected: "bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-300 dark:bg-violet-500/14 dark:text-violet-300 dark:ring-violet-500/30",
  },
  imap: {
    idleAccent: "before:bg-amber-400/22 dark:before:bg-amber-400/18",
    connectedAccent: "before:bg-amber-500/38 dark:before:bg-amber-400/28",
    iconIdle: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    iconConnected: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-300 dark:bg-amber-500/14 dark:text-amber-300 dark:ring-amber-500/30",
  },
  "app-reviews": {
    idleAccent: "before:bg-slate-400/20 dark:before:bg-slate-400/18",
    connectedAccent: "before:bg-slate-500/34 dark:before:bg-slate-300/24",
    iconIdle: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800",
    iconConnected: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  },
  "google-play": {
    idleAccent: "before:bg-emerald-400/22 dark:before:bg-emerald-400/18",
    connectedAccent: "before:bg-emerald-500/38 dark:before:bg-emerald-400/28",
    iconIdle: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    iconConnected: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-300 dark:bg-emerald-500/14 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  "google-calendar": {
    idleAccent: "before:bg-blue-400/22 dark:before:bg-blue-400/18",
    connectedAccent: "before:bg-blue-500/38 dark:before:bg-blue-400/28",
    iconIdle: "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
    iconConnected: "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-300 dark:bg-blue-500/14 dark:text-blue-300 dark:ring-blue-500/30",
  },
} as const;

export default function SourceCard({
  name,
  icon,
  connected,
  accountName,
  lastSync,
  healthLabel = "Ready to connect",
  healthTone = "neutral",
  onConnect,
  onSync,
  onDisconnect,
  syncing = false,
  connectLabel = "Connect",
  reconnectLabel = "Reconnect",
  workingLabel = "Working...",
  collapsible = false,
  collapsedLabel = "Show setup",
  alwaysShowChildren = false,
  helperText,
  children,
}: SourceCardProps) {
  const Icon = iconMap[icon] ?? AppWindow;
  const theme = sourceTheme[icon];
  const [expanded, setExpanded] = useState(false);
  const showChildren = alwaysShowChildren || !collapsible || connected || expanded;
  const healthToneClass =
    healthTone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : healthTone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-700 dark:text-slate-300";
  const iconToneClass = connected ? theme.iconConnected : theme.iconIdle;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-px dark:bg-transparent",
        connected
          ? "border-emerald-200 dark:border-emerald-500/20"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
        connected ? theme.connectedAccent : theme.idleAccent
      )}
    >
      {connected && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected
        </div>
      )}

      <div className="mb-6 flex items-start gap-4">
        <div
          className={cn(
            "flex items-center justify-center rounded-xl p-3.5 transition-colors",
            iconToneClass
          )}
        >
          <Icon className="h-8 w-8" />
        </div>

        <div className="mt-1 flex-1 pr-16 md:pr-0">
          <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">{name}</h3>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {accountName ||
              "Connect this source to pull feedback, detect trends, and surface critical issues."}
          </p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800/70 dark:bg-slate-950/40">
              <p className="uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Source health</p>
              <p className={cn("mt-1 font-medium", healthToneClass)}>{healthLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800/70 dark:bg-slate-950/40">
              <p className="uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Last synced</p>
              <p className="mt-1 font-medium text-slate-700 dark:text-slate-300">
                {lastSync ?? (connected ? "Awaiting first sync" : "Not synced yet")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {children && !connected && collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mb-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-950/80"
        >
          <span>{expanded ? "Hide setup" : collapsedLabel}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded ? "rotate-180" : "rotate-0")}
          />
        </button>
      )}

      {children && showChildren && <div className="mb-4">{children}</div>}

      {helperText && (
        <p className="mb-4 text-xs text-slate-500">{helperText}</p>
      )}

      <div className="mt-auto">
        {connected ? (
          <div
            className={cn(
              "grid gap-3",
              onSync || onConnect ? "sm:grid-cols-2" : "sm:grid-cols-1"
            )}
          >
            {onSync && (
              <Button
                variant="secondary"
                className="w-full justify-between border-slate-200 bg-slate-50 text-slate-700 shadow-none hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                onClick={onSync}
                disabled={syncing}
              >
                {syncing ? "Syncing..." : "Sync Now"}
                <ChevronRight className="h-4 w-4 text-slate-500 opacity-50 transition-opacity group-hover:opacity-100" />
              </Button>
            )}
            {!onSync && onConnect && (
              <Button
                variant="secondary"
                className="w-full justify-between border-slate-200 bg-slate-50 text-slate-700 shadow-none hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                onClick={onConnect}
                disabled={syncing}
              >
                {syncing ? workingLabel : reconnectLabel}
                <ChevronRight className="h-4 w-4 text-slate-500 opacity-50 transition-opacity group-hover:opacity-100" />
              </Button>
            )}
            <Button
              variant="secondary"
              className="w-full justify-between border border-red-200 bg-red-50 text-red-600 shadow-none hover:border-red-300 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
              onClick={onDisconnect}
            >
              Disconnect
              <ChevronRight className="h-4 w-4 text-slate-500 opacity-50 transition-opacity group-hover:opacity-100" />
            </Button>
          </div>
        ) : (
          <Button
            className={cn(
              "w-full justify-between border border-slate-200 bg-slate-50 text-slate-700 shadow-none transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
            )}
            onClick={onConnect}
          >
            {syncing ? workingLabel : connectLabel}
            <ChevronRight className="h-4 w-4 opacity-50 text-current" />
          </Button>
        )}
      </div>
    </div>
  );
}
