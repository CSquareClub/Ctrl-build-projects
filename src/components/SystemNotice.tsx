"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock3,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NoticeTone = "success" | "error" | "warning" | "info";

const toneMap: Record<
  NoticeTone,
  {
    shell: string;
    iconWrap: string;
    icon: typeof CheckCircle2;
    title: string;
    timer: string;
  }
> = {
  success: {
    shell:
      "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
    iconWrap:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
    icon: CheckCircle2,
    title: "Success",
    timer: "bg-emerald-500",
  },
  error: {
    shell:
      "border-red-200/80 bg-red-50/80 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300",
    iconWrap:
      "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
    icon: AlertTriangle,
    title: "Action failed",
    timer: "bg-red-500",
  },
  warning: {
    shell:
      "border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
    iconWrap:
      "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
    icon: Clock3,
    title: "Heads up",
    timer: "bg-amber-500",
  },
  info: {
    shell:
      "border-slate-200/90 bg-slate-50/90 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200",
    iconWrap:
      "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
    icon: Info,
    title: "Notice",
    timer: "bg-slate-400 dark:bg-slate-500",
  },
};

type SystemNoticeProps = {
  tone?: NoticeTone;
  message: string;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  floating?: boolean;
  timerKey?: string | number;
  className?: string;
  children?: ReactNode;
};

export default function SystemNotice({
  tone = "info",
  message,
  title,
  dismissible = false,
  onDismiss,
  floating = false,
  timerKey,
  className,
  children,
}: SystemNoticeProps) {
  const config = toneMap[tone];
  const Icon = config.icon;

  const notice = (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm transition-all duration-200",
        config.shell,
        className
      )}
    >
      <div className={cn("flex items-start gap-3 px-4 py-3", dismissible && "pr-12")}>
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            config.iconWrap
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            {title ?? config.title}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {message}
          </p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>

      {dismissible && onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition hover:bg-black/5 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-200"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {typeof timerKey !== "undefined" ? (
        <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden">
          <div
            key={timerKey}
            className={cn(
              "h-full origin-left animate-[system-notice-progress_4.8s_linear_forwards]",
              config.timer
            )}
          />
        </div>
      ) : null}

      <style jsx>{`
        @keyframes system-notice-progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );

  if (!floating) {
    return notice;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[80] flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-xl">{notice}</div>
    </div>
  );
}
