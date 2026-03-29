"use client";

import { useState } from "react";
import Link from "next/link";
import { Bug, ChevronDown, HeartHandshake, Sparkles } from "lucide-react";
import { TriangleAlert } from "lucide-react";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";

const primaryCards = [
  {
    key: "bugs",
    label: "Bugs",
    icon: Bug,
    tint: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    href: "/dashboard?category=Bug",
  },
  {
    key: "problems",
    label: "Problems",
    icon: TriangleAlert,
    tint: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    href: "/dashboard?category=Problem",
  },
  {
    key: "praise",
    label: "Praise",
    icon: HeartHandshake,
    tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    href: "/dashboard?category=Praise",
  },
] as const;

const dropdownCards = [
  {
    key: "features",
    label: "Feature Requests",
    icon: Sparkles,
    tint: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    href: "/dashboard?category=Feature%20Request",
    description: "Requests and roadmap signals from users.",
  },
] as const;

export default function StatsCards() {
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
              className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.18)] transition hover:border-slate-700 hover:bg-slate-900/90"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                </div>
                <div className={`rounded-xl border p-3 ${card.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-900/80"
        >
          <div>
            <p className="text-sm text-slate-400">More Signals</p>
            <p className="mt-1 text-base font-semibold text-white">
              Feature Requests
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
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
          <div className="border-t border-slate-800 px-4 py-4">
            {dropdownCards.map((card) => {
              const Icon = card.icon;
              const value = distribution[card.key];

              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-slate-700 hover:bg-slate-950"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl border p-3 ${card.tint}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{card.label}</p>
                      <p className="text-sm text-slate-400">{card.description}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-semibold text-white">{value}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
