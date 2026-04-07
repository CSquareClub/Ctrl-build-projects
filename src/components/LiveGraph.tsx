"use client";

import Link from "next/link";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";

export default function LiveGraph() {
  const { trendSeries } = useDashboardLive();

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Feedback Spike
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Weekly issue pressure across the audit and submit funnel.
        </p>
      </div>
      <div className="h-72 w-full">
        {trendSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ stroke: "rgba(220,38,38,0.15)" }}
                contentStyle={{
                  background: "var(--tooltip-bg, #ffffff)",
                  border: "1px solid var(--tooltip-border, #e2e8f0)",
                  borderRadius: "12px",
                  color: "var(--tooltip-text, #0f172a)",
                  fontSize: "13px",
                }}
              />
              <Line
                type="monotone"
                dataKey="complaints"
                stroke="#dc2626"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: "#dc2626", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent text-center">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No activity history yet</p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Sync a source to build a real issue timeline.
              </p>
              <Link
                href="/dashboard/connect"
                className="mt-3 inline-flex rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Connect a source
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
