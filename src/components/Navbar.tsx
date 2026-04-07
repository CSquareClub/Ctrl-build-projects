"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowUpRight, Bot, LoaderCircle, LogOut, Radio, Search, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";
import { useIssues } from "@/providers/IssuesProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useAgent } from "@/providers/AgentProvider";
import { useAgentCommandPanel } from "@/providers/AgentCommandPanelProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone } from "@/lib/system-health";

interface NavbarProps {
  title: string;
  subtitle?: string;
}

const routeDestinations = [
  {
    id: "control-room",
    label: "Control Room",
    href: "/dashboard",
    description: "Product health, alerts, and live system pressure",
    keywords: ["home", "dashboard", "alerts", "health", "control room"],
    type: "page" as const,
  },
  {
    id: "command-center",
    label: "Command Center",
    href: "/dashboard/command-center",
    description: "Agent activity, inspections, and system decisions",
    keywords: ["agent", "inspections", "signals", "predictions", "decisions"],
    type: "page" as const,
  },
  {
    id: "data-sources",
    label: "Data Sources",
    href: "/dashboard/connect",
    description: "Overview of integrations and live source health",
    keywords: ["integrations", "sources", "connections", "connect"],
    type: "page" as const,
  },
  {
    id: "website-inspection",
    label: "Website Inspection",
    href: "/dashboard/website",
    description: "Inspect website flows and monitor issues",
    keywords: ["website", "web", "inspect", "browser"],
    type: "page" as const,
  },
  {
    id: "mobile-inspection",
    label: "Mobile Inspection",
    href: "/dashboard/mobile",
    description: "Inspect your mobile app and cloud-device runs",
    keywords: ["mobile", "app", "inspection", "device"],
    type: "page" as const,
  },
  {
    id: "workspace",
    label: "Team Workspace",
    href: "/dashboard/workspace",
    description: "Tickets, members, approvals, and collaboration",
    keywords: ["team", "workspace", "members", "tickets", "activity"],
    type: "page" as const,
  },
  {
    id: "timeline",
    label: "Timeline & Reports",
    href: "/dashboard/timeline",
    description: "Weekly reports, history, and trend timeline",
    keywords: ["timeline", "reports", "weekly", "history"],
    type: "page" as const,
  },
  {
    id: "github",
    label: "GitHub Workspace",
    href: "/dashboard/github",
    description: "Patch review, repo context, and fix generation",
    keywords: ["github", "repo", "patch", "pull request", "code"],
    type: "page" as const,
  },
  {
    id: "sdk",
    label: "Website SDK",
    href: "/dashboard/sdk",
    description: "Install and monitor the product behavior SDK",
    keywords: ["sdk", "tracking", "behavior", "script"],
    type: "page" as const,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    description: "Workspace, product, privacy, and integration settings",
    keywords: ["settings", "profile", "privacy", "agent settings"],
    type: "page" as const,
  },
  {
    id: "pulse-ai",
    label: "Pulse AI",
    href: "/dashboard/ai-helper",
    description: "Open the product command panel",
    keywords: ["ai", "chat", "pulse", "assistant", "command"],
    type: "page" as const,
  },
];

type SearchResult = {
  id: string;
  label: string;
  href: string;
  description: string;
  type: "page" | "issue";
  meta?: string;
  priority: number;
};

export default function Navbar({ title, subtitle }: NavbarProps) {
  const { loading, issues } = useIssues();
  const { profile, signOut } = useAuth();
  const { status } = useAgent();
  const { criticalAlerts } = useDashboardLive();
  const { togglePanel, open } = useAgentCommandPanel();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AP";

  const agentTone =
    status.state === "processing"
      ? "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : status.state === "active"
        ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-transparent text-slate-500 dark:text-slate-400";
  const agentLabel =
    status.state === "processing"
      ? "Agent Processing"
      : status.state === "active"
        ? "Agent Active"
        : "Agent Idle";
  const healthTone = deriveSystemHealthTone(criticalAlerts);
  const chromeTone =
    healthTone === "good"
      ? {
          sync: "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          avatar: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
        }
      : healthTone === "warning"
        ? {
            sync: "border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
            avatar: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/20",
          }
        : {
            sync: "border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
            avatar: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20",
          };
  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return routeDestinations.slice(0, 7).map((item): SearchResult => ({
        ...item,
        meta: undefined,
        priority: 1,
      }));
    }

    const routeMatches = routeDestinations
      .map((item): SearchResult => {
        const haystack = [item.label, item.description, ...item.keywords].join(" ").toLowerCase();
        const exactLabel = item.label.toLowerCase() === normalized ? 5 : 0;
        const startsWith = item.label.toLowerCase().startsWith(normalized) ? 4 : 0;
        const includes = haystack.includes(normalized) ? 2 : 0;

        return {
          ...item,
          meta: undefined,
          priority: exactLabel + startsWith + includes,
        };
      })
      .filter((item) => item.priority > 0);

    const issueMatches = issues
      .map((issue) => {
        const haystack = [
          issue.title,
          issue.category ?? "",
          issue.priority,
          issue.sources.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        const startsWith = issue.title.toLowerCase().startsWith(normalized) ? 4 : 0;
        const includes = haystack.includes(normalized) ? 2 : 0;

        return {
          id: issue.id,
          label: issue.title,
          href: `/dashboard/issues/${issue.id}`,
          description: `${issue.category ?? "Issue"} · ${issue.priority} priority`,
          type: "issue" as const,
          meta: `${issue.reportCount} reports`,
          priority: startsWith + includes,
        };
      })
      .filter((item) => item.priority > 0);

    return [...routeMatches, ...issueMatches]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(0, 8);
  }, [issues, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const navigateToResult = (result: SearchResult) => {
    setSearchOpen(false);
    setQuery("");
    router.push(result.href);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) {
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((current) => (current + 1) % searchResults.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((current) => (current - 1 + searchResults.length) % searchResults.length);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      navigateToResult(searchResults[activeIndex] ?? searchResults[0]);
    }

    if (event.key === "Escape") {
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 mb-8 flex flex-col gap-4 border-b border-slate-200 bg-white/85 pb-5 backdrop-blur-md transition-colors dark:border-slate-800/60 dark:bg-[#161616]/85 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {loading && (
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium", chromeTone.sync)}>
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              syncing
            </span>
          )}
        </div>
        {subtitle ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <div className={cn("hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium md:inline-flex", agentTone)}>
          {status.state === "processing" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : status.state === "active" ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : (
            <Bot className="h-3.5 w-3.5" />
          )}
          {agentLabel}
        </div>
        <div className={cn("hidden items-center gap-2 rounded-full border px-3 py-2 text-xs lg:inline-flex", chromeTone.sync)}>
          <Radio className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          {status.listening ? "Listening to feedback..." : "Autonomy paused"}
        </div>
        <div ref={searchRef} className="relative hidden w-80 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Go anywhere: issues, pages, workspaces..."
            className="h-10 rounded-xl border-slate-200 bg-white pr-3 pl-9 text-slate-900 placeholder:text-slate-400 shadow-sm dark:border-slate-800 dark:bg-background dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {searchOpen ? (
            <div className="absolute top-[calc(100%+0.6rem)] left-0 right-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#111111]">
              <div className="border-b border-slate-200/80 px-3 py-2 text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase dark:border-slate-800 dark:text-slate-500">
                Jump anywhere
              </div>
              {searchResults.length ? (
                <div className="max-h-96 overflow-y-auto p-2">
                  {searchResults.map((result, index) => {
                    const active = index === activeIndex;

                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => navigateToResult(result)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                          active
                            ? "bg-slate-100 text-slate-900 dark:bg-white/[0.06] dark:text-white"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.04] dark:hover:text-white"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{result.label}</span>
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                result.type === "issue"
                                  ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                              )}
                            >
                              {result.type}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{result.description}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                          {result.meta ? <span>{result.meta}</span> : null}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-slate-500 dark:text-slate-400">
                  No matches yet. Try an issue name, `settings`, `github`, `website`, or `timeline`.
                </div>
              )}
            </div>
          ) : null}
        </div>
        <NotificationBell />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={togglePanel}
            className={cn(
            "h-11 w-11 rounded-2xl border bg-white p-0 hover:bg-slate-50 dark:bg-background dark:hover:bg-white/[0.04]",
            open
              ? chromeTone.avatar
              : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200"
          )}
          aria-label="Open Pulse AI"
        >
          <Bot className="h-4.5 w-4.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-background dark:text-slate-100 dark:hover:bg-white/[0.04]"
              />
            }
          >
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold", chromeTone.avatar)}>
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.name ?? "User avatar"}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-60 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-[#1a1a1a] dark:text-slate-100"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {profile.name ?? "Signed in user"}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {profile.email ?? "No email"}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
            <DropdownMenuItem
              className="rounded-xl px-3 py-2 text-slate-600 focus:bg-slate-100 focus:text-slate-900 dark:text-slate-300 dark:focus:bg-white/[0.04] dark:focus:text-white"
              onClick={() => router.push("/dashboard/settings/profile")}
            >
              <UserCircle2 className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl px-3 py-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/10 dark:focus:text-red-300"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
