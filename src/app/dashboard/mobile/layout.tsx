"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Activity, Eye, Smartphone, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";
import { writeStoredBoolean } from "@/lib/useStoredBoolean";

const mobileNav = [
  { href: "/dashboard/mobile", label: "Overview", icon: Eye, exact: true },
  { href: "/dashboard/mobile/apps", label: "Apps", icon: Smartphone, exact: false },
  { href: "/dashboard/mobile/inspections", label: "Inspections", icon: Bot, exact: false },
  { href: "/dashboard/mobile/activity", label: "Activity", icon: Activity, exact: false },
];

export default function MobileLayout({
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
            "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-100 dark:border-emerald-500/15",
          heading: "good" as SystemHealthTone,
        }
      : chromeTone === "warning"
        ? {
            active:
              "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border border-amber-100 dark:border-amber-500/15",
            heading: "warning" as SystemHealthTone,
          }
        : {
            active:
              "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-medium border border-red-100 dark:border-red-500/15",
            heading: "bad" as SystemHealthTone,
          };

  return (
    <div className="flex gap-0 lg:gap-8">
      <nav className="hidden lg:flex flex-col gap-1 w-48 shrink-0 sticky top-24 self-start">
        {mobileNav.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all text-left",
                isActive
                  ? navTone.active
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 min-w-0 pb-24">{children}</div>
    </div>
  );
}
