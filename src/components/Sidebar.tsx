"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Cable,
  Bot,
  Ticket,
  History,
  Package,
  Settings,
  LogOut,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import SidebarAlerts from "@/components/SidebarAlerts";
import { useStoredBoolean, writeStoredBoolean } from "@/lib/useStoredBoolean";

const navItems = [
  { href: "/dashboard", label: "Control Room", icon: LayoutDashboard },
  { href: "/dashboard/connect", label: "Data Sources", icon: Cable },
  { href: "/dashboard/tickets", label: "Tickets", icon: Ticket },
  { href: "/dashboard/timeline", label: "Timeline", icon: History },
  { href: "/dashboard/sdk", label: "SDK Integration", icon: Package },
  { href: "/dashboard/ai-helper", label: "AI Helper", icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const expanded = useStoredBoolean("product-pulse-sidebar-expanded", true);

  const toggleSidebar = () => {
    writeStoredBoolean("product-pulse-sidebar-expanded", !expanded);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "relative hidden h-screen flex-col justify-between border-r border-slate-800 bg-slate-950/50 p-4 transition-[width] duration-300 md:flex",
        expanded ? "w-20 lg:w-80" : "w-20 lg:w-24"
      )}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        className="absolute top-6 -right-3 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-slate-800 bg-slate-950 text-slate-300 shadow-[0_8px_30px_rgba(2,6,23,0.45)] transition hover:border-slate-700 hover:text-white lg:flex"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" />
        )}
      </button>

      <div>
        <div className="mb-10 flex items-center gap-3 px-2 text-indigo-400">
          <Activity className="h-8 w-8 lg:h-6 lg:w-6" />
          <span
            className={cn(
              "text-lg font-bold tracking-tight text-white transition-all duration-200",
              expanded ? "hidden lg:block" : "hidden"
            )}
          >
            Product<span className="text-indigo-500">Pulse</span>
          </span>
        </div>

        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 lg:justify-start lg:px-4 lg:py-2.5",
                  isActive
                    ? "bg-indigo-500/10 font-medium text-indigo-400"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                )}
              >
                <item.icon
                  className={cn(
                    "h-6 w-6 lg:h-5 lg:w-5",
                    isActive
                      ? "text-indigo-400"
                      : "text-slate-400 group-hover:text-slate-100"
                  )}
                />
                <span className={cn(expanded ? "hidden lg:block" : "hidden")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {expanded && <SidebarAlerts />}
      </div>

      <div className="mb-4 space-y-2">
        <button
          type="button"
          onClick={() => router.push("/dashboard/profile")}
          className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition-all hover:bg-slate-800/50 hover:text-slate-100 lg:justify-start lg:px-4 lg:py-2.5"
        >
          <Settings className="h-6 w-6 lg:h-5 lg:w-5" />
          <span className={cn("text-left", expanded ? "hidden lg:block" : "hidden")}>
            Settings
          </span>
        </button>
        <button
          onClick={handleSignOut}
          className="group flex w-full items-center justify-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400 lg:justify-start lg:px-4 lg:py-2.5"
        >
          <LogOut className="h-6 w-6 lg:h-5 lg:w-5" />
          <span
            className={cn(
              "text-left group-hover:text-rose-400",
              expanded ? "hidden lg:block" : "hidden"
            )}
          >
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
