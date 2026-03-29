"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
    | "outlook"
    | "app-reviews"
    | "google-play"
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
  collapsible?: boolean;
  collapsedLabel?: string;
  children?: React.ReactNode;
}

const iconMap = {
  gmail: Mail,
  outlook: Mail,
  "app-reviews": Smartphone,
  "google-play": Smartphone,
  instagram: MessageCircleHeart,
  imap: Inbox,
  reddit: MessageSquareText,
  "social-search": Globe2,
};

const sourceTheme = {
  gmail: {
    cardIdle:
      "border-rose-500/25 bg-[linear-gradient(135deg,rgba(244,63,94,0.16)_0%,rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-rose-400/35 bg-[linear-gradient(135deg,rgba(244,63,94,0.24)_0%,rgba(15,23,42,0.96)_55%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-rose-500/12 text-rose-300 ring-1 ring-inset ring-rose-500/20",
    iconConnected: "bg-rose-500/18 text-rose-300 ring-1 ring-inset ring-rose-500/30",
    hover: "hover:border-rose-400/45 hover:shadow-[0_18px_50px_-18px_rgba(244,63,94,0.45)]",
    titleHover: "group-hover:text-rose-300",
    button: "hover:border-rose-500 hover:bg-rose-500/90 hover:text-white hover:shadow-lg hover:shadow-rose-500/20",
  },
  outlook: {
    cardIdle:
      "border-sky-500/25 bg-[linear-gradient(135deg,rgba(14,165,233,0.16)_0%,rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-sky-400/35 bg-[linear-gradient(135deg,rgba(14,165,233,0.24)_0%,rgba(15,23,42,0.96)_55%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-sky-500/12 text-sky-300 ring-1 ring-inset ring-sky-500/20",
    iconConnected: "bg-sky-500/18 text-sky-300 ring-1 ring-inset ring-sky-500/30",
    hover: "hover:border-sky-400/45 hover:shadow-[0_18px_50px_-18px_rgba(14,165,233,0.45)]",
    titleHover: "group-hover:text-sky-300",
    button: "hover:border-sky-500 hover:bg-sky-500/90 hover:text-white hover:shadow-lg hover:shadow-sky-500/20",
  },
  instagram: {
    cardIdle:
      "border-pink-500/25 bg-[linear-gradient(135deg,rgba(236,72,153,0.18)_0%,rgba(168,85,247,0.10)_28%,rgba(15,23,42,0.94)_58%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-pink-400/35 bg-[linear-gradient(135deg,rgba(236,72,153,0.24)_0%,rgba(168,85,247,0.16)_28%,rgba(15,23,42,0.96)_58%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-pink-500/12 text-pink-300 ring-1 ring-inset ring-pink-500/20",
    iconConnected: "bg-pink-500/18 text-pink-300 ring-1 ring-inset ring-pink-500/30",
    hover: "hover:border-pink-400/45 hover:shadow-[0_18px_50px_-18px_rgba(236,72,153,0.45)]",
    titleHover: "group-hover:text-pink-300",
    button: "hover:border-pink-500 hover:bg-pink-500/90 hover:text-white hover:shadow-lg hover:shadow-pink-500/20",
  },
  reddit: {
    cardIdle:
      "border-orange-500/25 bg-[linear-gradient(135deg,rgba(249,115,22,0.18)_0%,rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-orange-400/35 bg-[linear-gradient(135deg,rgba(249,115,22,0.26)_0%,rgba(15,23,42,0.96)_55%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-orange-500/12 text-orange-300 ring-1 ring-inset ring-orange-500/20",
    iconConnected: "bg-orange-500/18 text-orange-300 ring-1 ring-inset ring-orange-500/30",
    hover: "hover:border-orange-400/45 hover:shadow-[0_18px_50px_-18px_rgba(249,115,22,0.45)]",
    titleHover: "group-hover:text-orange-300",
    button: "hover:border-orange-500 hover:bg-orange-500/90 hover:text-white hover:shadow-lg hover:shadow-orange-500/20",
  },
  "social-search": {
    cardIdle:
      "border-violet-500/25 bg-[linear-gradient(135deg,rgba(139,92,246,0.18)_0%,rgba(59,130,246,0.08)_30%,rgba(15,23,42,0.94)_60%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-violet-400/35 bg-[linear-gradient(135deg,rgba(139,92,246,0.26)_0%,rgba(59,130,246,0.14)_30%,rgba(15,23,42,0.96)_60%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-violet-500/12 text-violet-300 ring-1 ring-inset ring-violet-500/20",
    iconConnected: "bg-violet-500/18 text-violet-300 ring-1 ring-inset ring-violet-500/30",
    hover: "hover:border-violet-400/45 hover:shadow-[0_18px_50px_-18px_rgba(139,92,246,0.45)]",
    titleHover: "group-hover:text-violet-300",
    button: "hover:border-violet-500 hover:bg-violet-500/90 hover:text-white hover:shadow-lg hover:shadow-violet-500/20",
  },
  imap: {
    cardIdle:
      "border-amber-500/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.18)_0%,rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-amber-400/35 bg-[linear-gradient(135deg,rgba(245,158,11,0.26)_0%,rgba(15,23,42,0.96)_55%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-amber-500/12 text-amber-300 ring-1 ring-inset ring-amber-500/20",
    iconConnected: "bg-amber-500/18 text-amber-300 ring-1 ring-inset ring-amber-500/30",
    hover: "hover:border-amber-400/45 hover:shadow-[0_18px_50px_-18px_rgba(245,158,11,0.45)]",
    titleHover: "group-hover:text-amber-300",
    button: "hover:border-amber-500 hover:bg-amber-500/90 hover:text-slate-950 hover:shadow-lg hover:shadow-amber-500/20",
  },
  "app-reviews": {
    cardIdle:
      "border-cyan-500/25 bg-[linear-gradient(135deg,rgba(6,182,212,0.18)_0%,rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-cyan-400/35 bg-[linear-gradient(135deg,rgba(6,182,212,0.26)_0%,rgba(15,23,42,0.96)_55%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-cyan-500/12 text-cyan-300 ring-1 ring-inset ring-cyan-500/20",
    iconConnected: "bg-cyan-500/18 text-cyan-300 ring-1 ring-inset ring-cyan-500/30",
    hover: "hover:border-cyan-400/45 hover:shadow-[0_18px_50px_-18px_rgba(6,182,212,0.45)]",
    titleHover: "group-hover:text-cyan-300",
    button: "hover:border-cyan-500 hover:bg-cyan-500/90 hover:text-slate-950 hover:shadow-lg hover:shadow-cyan-500/20",
  },
  "google-play": {
    cardIdle:
      "border-emerald-500/25 bg-[linear-gradient(135deg,rgba(34,197,94,0.18)_0%,rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.98)_100%)]",
    cardConnected:
      "border-emerald-400/35 bg-[linear-gradient(135deg,rgba(34,197,94,0.26)_0%,rgba(15,23,42,0.96)_55%,rgba(15,23,42,1)_100%)]",
    iconIdle: "bg-emerald-500/12 text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
    iconConnected: "bg-emerald-500/18 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    hover: "hover:border-emerald-400/45 hover:shadow-[0_18px_50px_-18px_rgba(34,197,94,0.45)]",
    titleHover: "group-hover:text-emerald-300",
    button: "hover:border-emerald-500 hover:bg-emerald-500/90 hover:text-slate-950 hover:shadow-lg hover:shadow-emerald-500/20",
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
  collapsible = false,
  collapsedLabel = "Show setup",
  children,
}: SourceCardProps) {
  const Icon = iconMap[icon] ?? AppWindow;
  const theme = sourceTheme[icon];
  const [expanded, setExpanded] = useState(false);
  const showChildren = !collapsible || connected || expanded;
  const healthToneClass =
    healthTone === "good"
      ? "text-emerald-300"
      : healthTone === "warning"
        ? "text-amber-300"
        : "text-slate-300";

  return (
    <div
      className={cn(
        "group relative rounded-2xl border p-6 transition-all duration-300",
        connected
          ? theme.cardConnected
          : theme.cardIdle,
        theme.hover
      )}
    >
      {connected && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2 py-1 text-xs font-medium text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Connected
        </div>
      )}

      <div className="mb-6 flex items-start gap-4">
        <div
          className={cn(
            "flex items-center justify-center rounded-xl p-3.5 shadow-inner transition-colors",
            connected
              ? theme.iconConnected
              : theme.iconIdle
          )}
        >
          <Icon className="h-8 w-8" />
        </div>

        <div className="mt-1 flex-1 pr-16 md:pr-0">
          <h3 className={cn("mb-1 text-lg font-semibold text-white transition-colors", theme.titleHover)}>
            {name}
          </h3>
          <p className="text-sm leading-relaxed text-slate-400">
            {accountName ||
              "Connect this source to pull feedback, detect trends, and surface critical issues."}
          </p>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2">
              <p className="uppercase tracking-[0.18em] text-slate-500">Source health</p>
              <p className={cn("mt-1 font-medium", healthToneClass)}>{healthLabel}</p>
            </div>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2">
              <p className="uppercase tracking-[0.18em] text-slate-500">Last synced</p>
              <p className="mt-1 font-medium text-slate-300">
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
          className="mb-4 flex w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/55 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-950/80"
        >
          <span>{expanded ? "Hide setup" : collapsedLabel}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded ? "rotate-180" : "rotate-0")}
          />
        </button>
      )}

      {children && showChildren && <div className="mb-4">{children}</div>}

      <div className="mt-auto">
        {connected ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="secondary"
              className="w-full justify-between group-hover:border-slate-600"
              onClick={onSync}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync Now"}
              <ChevronRight className="h-4 w-4 text-slate-500 opacity-50 transition-opacity group-hover:opacity-100" />
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-between border border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-900"
              onClick={onDisconnect}
            >
              Disconnect
              <ChevronRight className="h-4 w-4 text-slate-500 opacity-50 transition-opacity group-hover:opacity-100" />
            </Button>
          </div>
        ) : (
          <Button
            className={cn(
              "w-full justify-between border border-slate-700 bg-slate-800 text-slate-300 shadow-none transition-all",
              theme.button
            )}
            onClick={onConnect}
          >
            {syncing ? "Working..." : connectLabel}
            <ChevronRight className="h-4 w-4 opacity-50 text-current" />
          </Button>
        )}
      </div>
    </div>
  );
}
