"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppWindow, BookOpen, ChartColumnBig, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone } from "@/lib/system-health";

const navItems = [
  { href: "/dashboard/sdk", label: "Guide", icon: BookOpen },
  { href: "/dashboard/sdk/apps", label: "Connected Apps", icon: AppWindow },
  { href: "/dashboard/sdk/analytics", label: "Analytics", icon: ChartColumnBig },
];

export default function SdkLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { criticalAlerts } = useDashboardLive();
  const tone = deriveSystemHealthTone(criticalAlerts);
  const activeClass =
    tone === "good"
      ? "border-emerald-100 dark:border-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "border-amber-100 dark:border-amber-500/15 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-red-100 dark:border-red-500/15 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300";

  return (
    <div className="flex gap-0 lg:gap-8">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-1 sticky top-24 self-start">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all",
                active
                  ? activeClass
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {active ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
            </Link>
          );
        })}
      </aside>

      <div className="min-w-0 flex-1 pb-20">{children}</div>
    </div>
  );
}
