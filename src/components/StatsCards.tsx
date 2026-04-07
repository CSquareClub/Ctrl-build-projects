"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Bug, ChevronDown, HeartHandshake, Sparkles } from "lucide-react";
import { TriangleAlert } from "lucide-react";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";

const primaryCards = [
  {
    key: "bugs",
    label: "Bugs",
    icon: Bug,
    tint: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20",
    href: "/dashboard?category=Bug",
  },
  {
    key: "problems",
    label: "Problems",
    icon: TriangleAlert,
    tint: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
    href: "/dashboard?category=Problem",
  },
  {
    key: "praise",
    label: "Praise",
    icon: HeartHandshake,
    tint: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    href: "/dashboard?category=Praise",
  },
] as const;

const dropdownCards = [
  {
    key: "features",
    label: "Feature Requests",
    icon: Sparkles,
    tint: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20",
    href: "/dashboard?category=Feature%20Request",
    description: "Requests and roadmap signals from users.",
  },
] as const;

function StatsCards() {
  const { distribution } = useDashboardLive();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {primaryCards.map((card) => {
          const Icon = card.icon;
          const value = distribution[card.key];

          return (
            <Link
              key={card.key}
              href={card.href}
              className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
                </div>
                <div className={`rounded-xl border p-3 ${card.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-2xl"
        >
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">More Signals</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
              Feature Requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-300">
              {distribution.features}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-4">
            {dropdownCards.map((card) => {
              const Icon = card.icon;
              const value = distribution[card.key];

              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-4 transition hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl border p-3 ${card.tint}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{card.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{card.description}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StatsCards);
