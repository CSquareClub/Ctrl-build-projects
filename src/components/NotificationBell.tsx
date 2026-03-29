"use client";

import { Bell, Lightbulb, Radar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";

function kindIcon(kind: "critical" | "new" | "insight") {
  if (kind === "critical") return <Radar className="h-4 w-4 text-rose-400" />;
  if (kind === "new") return <Bell className="h-4 w-4 text-amber-400" />;
  return <Lightbulb className="h-4 w-4 text-indigo-400" />;
}

export default function NotificationBell() {
  const { notifications, unreadCount, acknowledgeNotifications } =
    useDashboardLive();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
          />
        }
        onClick={acknowledgeNotifications}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[360px] rounded-2xl border border-slate-800 bg-slate-900 p-2 text-slate-100 shadow-2xl"
      >
        <div className="px-3 py-2 text-sm font-semibold text-white">
          Notifications
        </div>
        <DropdownMenuSeparator className="bg-slate-800" />
        <div className="max-h-96 space-y-1 overflow-y-auto px-1 py-1">
          {notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="items-start gap-3 rounded-xl px-3 py-3 text-slate-300 focus:bg-slate-800 focus:text-white"
            >
              <span className="mt-0.5">{kindIcon(notification.kind)}</span>
              <div className="flex-1">
                <p className="text-sm leading-snug">{notification.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  {!notification.read && (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <Sparkles className="h-3 w-3" />
                      unread
                    </span>
                  )}
                  <span>
                    {new Date(notification.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
