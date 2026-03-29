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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.25)]">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">
          Issue Activity Over Time
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Complaint volume updating in near real time.
        </p>
      </div>
      <div className="h-72 w-full">
        {trendSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ stroke: "rgba(99,102,241,0.22)" }}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid rgba(51,65,85,1)",
                  borderRadius: "16px",
                  color: "#e2e8f0",
                }}
              />
              <Line
                type="monotone"
                dataKey="complaints"
                stroke="#818cf8"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: "#a5b4fc" }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 text-center">
            <div>
              <p className="text-sm font-medium text-slate-300">No activity history yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Sync a source to build a real issue timeline.
              </p>
              <Link
                href="/dashboard/connect"
                className="mt-3 inline-flex rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700"
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
