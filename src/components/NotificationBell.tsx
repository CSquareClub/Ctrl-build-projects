"use client";

import { Bell, Radar, Sparkles, Ticket, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/providers/NotificationsProvider";
import SystemNotice from "@/components/SystemNotice";

function notificationIcon(type: string) {
  if (type === "spike") {
    return <Radar className="h-4 w-4 text-red-500 dark:text-red-400" />;
  }
  if (type === "ticket") {
    return <Ticket className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
  }
  if (type === "reminder") {
    return <TimerReset className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />;
  }
  return <Bell className="h-4 w-4 text-slate-500 dark:text-slate-300" />;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  const handleOpen = async () => {
    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-background dark:text-slate-200 dark:hover:bg-slate-900/60"
          />
        }
        onClick={() => void handleOpen()}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[360px] rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-background dark:text-slate-100"
      >
        <div className="px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white">
          Notifications
        </div>
        <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-800" />
        <div className="max-h-96 space-y-1 overflow-y-auto px-1 py-1">
          {notifications.length === 0 ? (
            <SystemNotice
              tone="info"
              title="Notifications"
              message="No notifications yet."
              className="border-dashed shadow-none"
            />
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="items-start gap-3 rounded-xl px-3 py-3 text-slate-700 focus:bg-slate-100 focus:text-slate-900 dark:text-slate-300 dark:focus:bg-slate-800 dark:focus:text-white"
              >
                <span className="mt-0.5">{notificationIcon(notification.type)}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-snug text-slate-900 dark:text-white">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {notification.message}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    {!notification.read && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
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
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
