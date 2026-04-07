"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Command,
  Cable,
  Database,
  Globe2,
  GitBranch,
  Users,
  History,
  Package,
  Smartphone,
  Settings,
  LogOut,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Sun,
  Moon,
  FileSearch,
  ChevronDown,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import SidebarAlerts from "@/components/SidebarAlerts";
import { useStoredBoolean, writeStoredBoolean } from "@/lib/useStoredBoolean";
import { useGuide } from "@/providers/GuideProvider";
import { useTheme } from "next-themes";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone } from "@/lib/system-health";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  indent?: boolean;
  primary?: boolean;
}

interface NavGroup {
  key: string;
  items: NavItem[];
  collapsible?: boolean;
  parentLabel?: string;
  parentIcon?: React.ElementType;
}

const navGroups: NavGroup[] = [
  {
    key: "primary",
    items: [
      {
        href: "/dashboard",
        label: "Control Room",
        icon: LayoutDashboard,
        primary: true,
      },
      {
        href: "/dashboard/command-center",
        label: "Command Center",
        icon: Command,
        primary: true,
      },
    ],
  },
  {
    key: "sources",
    collapsible: true,
    parentLabel: "Integrations",
    parentIcon: Cable,
    items: [
      { href: "/dashboard/connect", label: "Data Sources", icon: Database, indent: true },
      { href: "/dashboard/github", label: "GitHub", icon: GitBranch, indent: true },
      { href: "/dashboard/github/code-analysis", label: "Code Analysis", icon: FileSearch, indent: true },
      { href: "/dashboard/sdk", label: "SDK", icon: Package, indent: true },
    ],
  },
  {
    key: "inspection",
    items: [
      { href: "/dashboard/website", label: "Website Inspection", icon: Globe2 },
      { href: "/dashboard/mobile", label: "Mobile Inspection", icon: Smartphone },
    ],
  },
  {
    key: "workspace",
    items: [{ href: "/dashboard/workspace", label: "Team Workspace", icon: Users }],
  },
  {
    key: "analytics",
    items: [{ href: "/dashboard/timeline", label: "Timeline", icon: History }],
  },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function isGroupActive(group: NavGroup, pathname: string) {
  return group.items.some((item) => isItemActive(pathname, item.href));
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { openGuide } = useGuide();
  const { theme, setTheme } = useTheme();
  const { criticalAlerts } = useDashboardLive();
  const expanded = useStoredBoolean("product-pulse-sidebar-expanded", true);
  const [mounted, setMounted] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (
      pathname.startsWith("/dashboard/command-center") ||
      pathname.startsWith("/dashboard/workspace") ||
      pathname.startsWith("/dashboard/connect") ||
      pathname.startsWith("/dashboard/website") ||
      pathname.startsWith("/dashboard/mobile") ||
      pathname.startsWith("/dashboard/timeline") ||
      pathname.startsWith("/dashboard/sdk") ||
      pathname.startsWith("/dashboard/settings")
    ) {
      writeStoredBoolean("product-pulse-sidebar-expanded", false);
    }
  }, [pathname]);

  useEffect(() => {
    const sourcesGroup = navGroups.find((group) => group.key === "sources");
    if (sourcesGroup && isGroupActive(sourcesGroup, pathname)) {
      setCollapsedSections((prev) => ({ ...prev, sources: false }));
    }
  }, [pathname]);

  const healthTone = deriveSystemHealthTone(criticalAlerts);
  const chromeTone =
    healthTone === "good"
      ? {
          logoBox:
            "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
          brand: "text-emerald-600 dark:text-emerald-400",
          activeSurface:
            "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
          activeBorder: "bg-emerald-500 dark:bg-emerald-400",
          activeIcon: "text-emerald-600 dark:text-emerald-400",
        }
      : healthTone === "warning"
        ? {
            logoBox:
              "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400",
            brand: "text-amber-600 dark:text-amber-400",
            activeSurface:
              "border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
            activeBorder: "bg-amber-500 dark:bg-amber-400",
            activeIcon: "text-amber-600 dark:text-amber-400",
          }
        : {
            logoBox:
              "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400",
            brand: "text-red-600 dark:text-red-400",
            activeSurface:
              "border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300",
            activeBorder: "bg-red-500 dark:bg-red-400",
            activeIcon: "text-red-600 dark:text-red-400",
          };

  const sourcesCollapsed = collapsedSections.sources ?? false;

  const sourcesHeightClass = useMemo(() => {
    if (sourcesCollapsed) return "max-h-0 opacity-0";
    return expanded ? "max-h-56 opacity-100" : "max-h-40 opacity-100";
  }, [expanded, sourcesCollapsed]);

  const toggleSidebar = () => {
    writeStoredBoolean("product-pulse-sidebar-expanded", !expanded);
  };

  const toggleSources = () => {
    setCollapsedSections((prev) => ({ ...prev, sources: !sourcesCollapsed }));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  function renderNavItem(item: NavItem) {
    const active = isItemActive(pathname, item.href);
    const alertBadge = item.href === "/dashboard" ? "3 Alerts" : null;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group relative flex h-11 items-center justify-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-slate-600 transition-all duration-150 ease-out dark:text-slate-400 lg:justify-start lg:px-4",
          item.indent && expanded ? "lg:pl-10" : "",
          active
            ? chromeTone.activeSurface
            : "hover:bg-slate-100/90 hover:text-slate-900 dark:hover:bg-white/[0.04] dark:hover:text-slate-100",
          item.primary && "font-semibold text-slate-800 dark:text-slate-100"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full opacity-0 transition-all duration-150 ease-out",
            active && "opacity-100",
            chromeTone.activeBorder
          )}
        />
        <item.icon
          strokeWidth={1.9}
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors duration-150 ease-out",
            active
              ? chromeTone.activeIcon
              : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300"
          )}
        />
        <span
          className={cn(
            "truncate text-sm leading-none",
            expanded ? "hidden lg:block" : "hidden"
          )}
        >
          {item.label}
        </span>
        {alertBadge && expanded ? (
          <span className="ml-auto hidden rounded-full bg-red-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white lg:inline-flex">
            {alertBadge}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "relative hidden h-screen flex-col justify-between border-r border-slate-200 bg-slate-50 p-4 transition-all duration-300 dark:border-slate-800/70 dark:bg-[#111111] md:flex",
        expanded ? "w-20 lg:w-72" : "w-20 lg:w-24"
      )}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute top-6 -right-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-[#161616] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white lg:flex"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </button>

      <div className="overflow-y-auto overflow-x-hidden">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border lg:h-7 lg:w-7",
              chromeTone.logoBox
            )}
          >
            <Activity className="h-4 w-4" />
          </div>
          <span
            className={cn(
              "text-lg font-bold tracking-tight text-slate-900 transition-all duration-200 dark:text-white",
              expanded ? "hidden lg:block" : "hidden"
            )}
          >
            Agentic<span className={chromeTone.brand}>Pulse</span>
          </span>
        </div>

        <div className="space-y-4">
          {navGroups.map((group, index) => {
            const showDivider = index > 0;

            if (group.collapsible) {
              const ParentIcon = group.parentIcon || group.items[0].icon;
              const parentLabel = group.parentLabel || group.items[0].label;
              const children = group.items;
              const groupActive = isGroupActive(group, pathname);
              const parentActive = pathname.startsWith("/dashboard/connect");

              return (
                <div key={group.key} className="space-y-2">
                  {showDivider && (
                    <div className="mx-2 border-t border-slate-200/80 dark:border-slate-800/80" />
                  )}
                  {expanded && (
                    <button
                      type="button"
                      onClick={toggleSources}
                      className={cn(
                        "group relative flex h-11 w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-slate-600 transition-all duration-150 ease-out dark:text-slate-400 lg:justify-start lg:px-4",
                        groupActive
                          ? chromeTone.activeSurface
                          : "hover:bg-slate-100/90 hover:text-slate-900 dark:hover:bg-white/[0.04] dark:hover:text-slate-100"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full opacity-0 transition-all duration-150 ease-out",
                          parentActive && "opacity-100",
                          chromeTone.activeBorder
                        )}
                      />
                      <ParentIcon
                        strokeWidth={1.9}
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors duration-150 ease-out",
                          groupActive
                            ? chromeTone.activeIcon
                            : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300"
                        )}
                      />
                      <span
                        className={cn(
                          "truncate text-sm leading-none",
                          expanded ? "hidden lg:block" : "hidden"
                        )}
                      >
                        {parentLabel}
                      </span>
                      <ChevronDown
                        strokeWidth={1.9}
                        className={cn(
                          "ml-auto hidden h-4 w-4 transition-transform duration-200 ease-out",
                          expanded ? "lg:block" : "hidden",
                          sourcesCollapsed ? "-rotate-90" : "rotate-0",
                          groupActive
                            ? chromeTone.activeIcon
                            : "text-slate-400 dark:text-slate-500"
                        )}
                      />
                    </button>
                  )}

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200 ease-out",
                      expanded ? sourcesHeightClass : "max-h-48 opacity-100"
                    )}
                  >
                    <div className={cn("space-y-1", expanded ? "pt-0.5" : "pt-0")}>
                      {children.map((item) => renderNavItem(item))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={group.key} className="space-y-2">
                {showDivider && (
                  <div className="mx-2 border-t border-slate-200/80 dark:border-slate-800/80" />
                )}
                <div className="space-y-1">{group.items.map((item) => renderNavItem(item))}</div>
              </div>
            );
          })}
        </div>

        {expanded && <SidebarAlerts />}
      </div>

      <div className="mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-transparent px-3 py-2 text-slate-500 transition-all duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.04] dark:hover:text-slate-100 lg:justify-start lg:px-4",
              pathname.startsWith("/dashboard/settings") && "bg-slate-100 dark:bg-white/[0.04]"
            )}
          >
            <MoreHorizontal strokeWidth={1.9} className="h-[18px] w-[18px]" />
            <span
              className={cn(
                "text-sm text-left",
                expanded ? "hidden lg:block" : "hidden"
              )}
            >
              More
            </span>
            <ChevronDown
              strokeWidth={1.9}
              className={cn(
                "ml-auto hidden h-4 w-4 text-slate-400 dark:text-slate-500",
                expanded ? "lg:block" : "hidden"
              )}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="right"
            sideOffset={12}
            className="w-56 rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-[#111111] dark:text-slate-200"
          >
            {mounted && (
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-xl px-3 py-2 text-sm text-slate-600 focus:bg-slate-100 focus:text-slate-900 dark:text-slate-300 dark:focus:bg-white/[0.06] dark:focus:text-white"
              >
                {theme === "dark" ? (
                  <Sun strokeWidth={1.9} className="h-4 w-4" />
                ) : (
                  <Moon strokeWidth={1.9} className="h-4 w-4" />
                )}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => openGuide()}
              className="rounded-xl px-3 py-2 text-sm text-slate-600 focus:bg-slate-100 focus:text-slate-900 dark:text-slate-300 dark:focus:bg-white/[0.06] dark:focus:text-white"
            >
              <Info strokeWidth={1.9} className="h-4 w-4" />
              <span>Product Guide</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="rounded-xl px-3 py-2 text-sm text-slate-600 focus:bg-slate-100 focus:text-slate-900 dark:text-slate-300 dark:focus:bg-white/[0.06] dark:focus:text-white"
            >
              <Settings strokeWidth={1.9} className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 bg-slate-200 dark:bg-slate-800" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="rounded-xl px-3 py-2 text-sm text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/10 dark:focus:text-red-300"
            >
              <LogOut strokeWidth={1.9} className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
