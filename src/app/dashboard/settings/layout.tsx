"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  UserRound,
  Building2,
  Bot,
  ShieldCheck,
  Plug,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone } from "@/lib/system-health";
import { writeStoredBoolean } from "@/lib/useStoredBoolean";

const settingsNav = [
  {
    href: "/dashboard/settings/profile",
    label: "Profile",
    icon: UserRound,
    description: "Your account identity",
  },
  {
    href: "/dashboard/settings/product",
    label: "Product / Company",
    icon: Building2,
    description: "Product & team details",
  },
  {
    href: "/dashboard/settings/agent",
    label: "Agent Settings",
    icon: Bot,
    description: "AI behaviour controls",
  },
  {
    href: "/dashboard/settings/privacy",
    label: "Privacy & Security",
    icon: ShieldCheck,
    description: "Passwords, keys & data",
  },
  {
    href: "/dashboard/settings/integrations",
    label: "Integrations",
    icon: Plug,
    description: "Connected services",
  },
  {
    href: "/dashboard/settings/danger-zone",
    label: "Danger Zone",
    icon: AlertTriangle,
    description: "Destructive actions",
    danger: true,
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { criticalAlerts } = useDashboardLive();

  useEffect(() => {
    writeStoredBoolean("product-pulse-sidebar-expanded", false);
  }, []);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const navTone =
    chromeTone === "good"
      ? {
          active:
            "border border-emerald-200 bg-emerald-50 font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
          activeIcon: "text-emerald-600 dark:text-emerald-400",
          activeMeta: "text-emerald-600/70 dark:text-emerald-400/60",
        }
      : chromeTone === "warning"
        ? {
            active:
              "border border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
            activeIcon: "text-amber-700 dark:text-amber-300",
            activeMeta: "text-amber-600/80 dark:text-amber-300/70",
          }
        : {
            active:
              "border border-red-200 bg-red-50 font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
            activeIcon: "text-red-600 dark:text-red-400",
            activeMeta: "text-red-500/70 dark:text-red-400/60",
          };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-8 lg:flex-row">
      {/* ── Settings sidebar ── */}
      <nav className="w-full shrink-0 lg:w-64 xl:w-72">
        <div className="sticky top-28 space-y-1">
          {settingsNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const isDanger = item.danger;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3.5 rounded-2xl px-4 py-3 transition-all duration-200",
                  isActive
                    ? isDanger
                      ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                      : navTone.active
                    : isDanger
                      ? "border border-transparent text-red-500/70 hover:border-red-100 hover:bg-red-50/60 hover:text-red-600 dark:text-red-500/50 dark:hover:border-red-500/10 dark:hover:bg-red-500/5 dark:hover:text-red-400"
                      : "border border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:border-white/[0.06] dark:hover:bg-white/[0.04] dark:hover:text-slate-100"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isActive
                      ? isDanger
                        ? "text-red-600 dark:text-red-400"
                        : navTone.activeIcon
                      : isDanger
                        ? "text-red-400/60 group-hover:text-red-500 dark:text-red-500/40 dark:group-hover:text-red-400"
                        : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm leading-tight">{item.label}</p>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[11px] leading-tight",
                      isActive
                        ? isDanger
                          ? "text-red-500/70 dark:text-red-400/60"
                          : navTone.activeMeta
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
