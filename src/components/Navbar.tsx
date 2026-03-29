"use client";

import { Activity, ChevronDown, LogOut, Search, UserCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/NotificationBell";
import { useIssues } from "@/providers/IssuesProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface NavbarProps {
  title: string;
  subtitle?: string;
}

export default function Navbar({ title, subtitle }: NavbarProps) {
  const { loading } = useIssues();
  const { profile, signOut } = useAuth();
  const router = useRouter();

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
    : "PP";

  return (
    <header className="sticky top-0 z-30 mb-8 flex flex-col gap-4 border-b border-slate-800/80 bg-slate-950/85 pb-5 backdrop-blur-md md:flex-row md:items-end md:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {loading && (
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              syncing
            </span>
          )}
        </div>
        {subtitle && <p className="mt-2 text-sm text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden w-72 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search issues, channels, signals..."
            className="h-10 rounded-xl border-slate-800 bg-slate-900/70 pr-3 pl-9 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-11 gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 text-slate-100 hover:bg-slate-800"
              />
            }
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-200">
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
            <div className="hidden text-left md:block">
              <p className="max-w-40 truncate text-sm font-medium text-slate-100">
                {profile.name ?? "Signed in user"}
              </p>
              <p className="max-w-40 truncate text-xs text-slate-400">
                {profile.email ?? "No email"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={10}
            className="w-60 rounded-2xl border border-slate-800 bg-slate-900 p-2 text-slate-100 shadow-2xl"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-white">
                {profile.name ?? "Signed in user"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {profile.email ?? "No email"}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              className="rounded-xl px-3 py-2 text-slate-300 focus:bg-slate-800 focus:text-white"
              onClick={() => router.push("/dashboard/profile")}
            >
              <UserCircle2 className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-xl px-3 py-2 text-rose-400 focus:bg-rose-500/10 focus:text-rose-300"
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
