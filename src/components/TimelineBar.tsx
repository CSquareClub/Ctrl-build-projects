"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import type { TimelineDay } from "@/lib/api";

type Granularity = "day" | "hour";

interface TimelineBarProps {
  data: TimelineDay[];
  granularity?: Granularity;
  onSelectRange?: (selection: { startDate: string; endDate: string } | null) => void;
  onQuickZoom?: (date: string) => void;
  highlightDates?: string[];
}

interface EnrichedTimelineDay extends TimelineDay {
  movingAverage: number;
  spike: boolean;
}

const severityStyles: Record<TimelineDay["severity"], string> = {
  green: "from-emerald-400/95 to-emerald-500/75",
  yellow: "from-yellow-300/95 to-yellow-400/80",
  red: "from-rose-400/95 to-red-500/80",
};

const severityShadow: Record<TimelineDay["severity"], string> = {
  green: "shadow-[0_0_14px_rgba(34,197,94,0.16)]",
  yellow: "shadow-[0_0_14px_rgba(250,204,21,0.14)]",
  red: "shadow-[0_0_18px_rgba(239,68,68,0.24)]",
};

function formatDate(value: string, granularity: Granularity) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: granularity === "hour" ? undefined : "numeric",
  });
}

function formatResolution(value: number | null) {
  if (value === null) {
    return "No resolved tickets";
  }

  if (value < 24) {
    return `${value} hrs`;
  }

  return `${(value / 24).toFixed(1)} days`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildEnrichedData(data: TimelineDay[]) {
  return data.map((point, index) => {
    const window = data
      .slice(Math.max(0, index - 4), index + 1)
      .map((entry) => entry.feedback_count);
    const movingAverage = average(window);
    const spike =
      movingAverage > 0 && point.feedback_count > movingAverage * 1.5;

    return {
      ...point,
      movingAverage,
      spike,
    } satisfies EnrichedTimelineDay;
  });
}

function TimelineTooltip({
  active,
  payload,
  granularity,
}: {
  active?: boolean;
  payload?: Array<{ payload: EnrichedTimelineDay }>;
  granularity: Granularity;
}) {
  const point = payload?.[0]?.payload;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-[0_20px_50px_rgba(2,6,23,0.55)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">
          {formatDate(point.date, granularity)}
        </p>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${
            point.severity === "green"
              ? "bg-emerald-500/15 text-emerald-200"
              : point.severity === "yellow"
                ? "bg-yellow-400/15 text-yellow-100"
                : "bg-rose-500/15 text-rose-200"
          }`}
        >
          {point.severity}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="uppercase tracking-[0.18em] text-slate-500">Issues</p>
          <p className="mt-1 text-sm font-medium text-white">{point.issue_count}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.18em] text-slate-500">Feedback</p>
          <p className="mt-1 text-sm font-medium text-white">{point.feedback_count}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.18em] text-slate-500">Resolve</p>
          <p className="mt-1 text-sm font-medium text-white">
            {point.avg_resolution_time === null ? "n/a" : `${point.avg_resolution_time}h`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TimelineBar({
  data,
  granularity = "day",
  onSelectRange,
  onQuickZoom,
  highlightDates = [],
}: TimelineBarProps) {
  const [activeDate, setActiveDate] = useState<string | null>(
    data[data.length - 1]?.date ?? null
  );
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const enrichedData = useMemo(() => buildEnrichedData(data), [data]);

  const activePoint =
    enrichedData.find((point) => point.date === activeDate) ??
    enrichedData[enrichedData.length - 1] ??
    null;

  const selectionBounds = useMemo(() => {
    if (dragStart === null || dragEnd === null) {
      return null;
    }

    const startIndex = Math.min(dragStart, dragEnd);
    const endIndex = Math.max(dragStart, dragEnd);
    return { startIndex, endIndex };
  }, [dragEnd, dragStart]);

  const metrics = useMemo(() => {
    if (enrichedData.length === 0) {
      return null;
    }

    const totalIssues = enrichedData.reduce((sum, point) => sum + point.issue_count, 0);
    const peakDay = enrichedData.reduce((peak, point) =>
      point.feedback_count > peak.feedback_count ? point : peak
    );
    const avgResolution = average(
      enrichedData
        .map((point) => point.avg_resolution_time)
        .filter((value): value is number => value !== null)
    );

    return {
      totalIssues,
      peakDay,
      avgResolution,
    };
  }, [enrichedData]);

  if (enrichedData.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900 p-4 text-slate-400 shadow-lg">
        No timeline data yet. Product Pulse will render system health here once issue and feedback data starts flowing.
      </div>
    );
  }

  const totalWidth = Math.max(720, enrichedData.length * 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl bg-zinc-900 p-4 shadow-lg"
    >
      {metrics && (
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-950/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Total issues
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {metrics.totalIssues}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Peak day
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatDate(metrics.peakDay.date, granularity)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {metrics.peakDay.feedback_count} feedback events
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Avg resolution
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              {metrics.avgResolution > 0 ? `${metrics.avgResolution.toFixed(1)} hrs` : "No resolved tickets"}
            </p>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <span>System Health Timeline</span>
        <span>Drag to zoom, click a segment to focus</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="relative rounded-2xl bg-slate-950/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          style={{ minWidth: `${totalWidth}px` }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/5" />

          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrichedData} margin={{ top: 10, right: 0, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="timelineArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(148,163,184,0.26)" />
                    <stop offset="100%" stopColor="rgba(148,163,184,0)" />
                  </linearGradient>
                </defs>
                <RechartsTooltip
                  content={<TimelineTooltip granularity={granularity} />}
                  cursor={false}
                />
                <Area
                  type="monotone"
                  dataKey="feedback_count"
                  stroke="rgba(191,219,254,0)"
                  fill="url(#timelineArea)"
                  isAnimationActive
                  animationDuration={450}
                />
                <Line
                  type="monotone"
                  dataKey="feedback_count"
                  stroke="rgba(191,219,254,0.68)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="absolute inset-x-3 bottom-3 flex h-24 items-end">
              {enrichedData.map((point, index) => {
                const isActive = activePoint?.date === point.date;
                const inSelection =
                  selectionBounds &&
                  index >= selectionBounds.startIndex &&
                  index <= selectionBounds.endIndex;

                return (
                  <div
                    key={point.date}
                    className="relative flex h-full w-[4px] shrink-0 items-end"
                    onMouseEnter={() => {
                      setActiveDate(point.date);
                      if (dragStart !== null) {
                        setDragEnd(index);
                      }
                    }}
                    onMouseUp={() => {
                      if (selectionBounds && onSelectRange) {
                        onSelectRange({
                          startDate: enrichedData[selectionBounds.startIndex].date,
                          endDate: enrichedData[selectionBounds.endIndex].date,
                        });
                      }
                      setDragStart(null);
                      setDragEnd(null);
                    }}
                  >
                    {(point.spike || highlightDates.includes(point.date)) && (
                      <motion.span
                        className={`absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full shadow-[0_0_16px_rgba(251,146,60,0.55)] ${
                          highlightDates.includes(point.date) ? "bg-rose-400" : "bg-orange-400"
                        }`}
                        animate={{ scale: [1, 1.28, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                    )}

                    <motion.button
                      type="button"
                      aria-label={`${formatDate(point.date, granularity)} health segment`}
                      whileHover={{ filter: "brightness(1.2)", scaleY: 1.04 }}
                      whileTap={{ scaleY: 0.98 }}
                      className={`relative h-full w-full rounded-sm bg-gradient-to-t ${severityStyles[point.severity]} transition-all ${
                        isActive ? `brightness-125 ${severityShadow[point.severity]}` : "opacity-85"
                      } ${inSelection ? "ring-1 ring-white/20" : ""}`}
                      onMouseDown={() => {
                        setDragStart(index);
                        setDragEnd(index);
                      }}
                      onClick={() => {
                        setActiveDate(point.date);
                        onQuickZoom?.(point.date);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-600">
        <span>{formatDate(enrichedData[0].date, granularity)}</span>
        <span>{formatDate(enrichedData[enrichedData.length - 1].date, granularity)}</span>
      </div>

      {activePoint && (
        <motion.div
          layout
          className="mt-4 grid gap-4 rounded-2xl bg-slate-950/70 p-4 md:grid-cols-4"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Date</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatDate(activePoint.date, granularity)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Issues</p>
            <p className="mt-2 text-sm font-medium text-white">{activePoint.issue_count}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Feedback</p>
            <p className="mt-2 text-sm font-medium text-white">{activePoint.feedback_count}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Avg resolution</p>
            <p className="mt-2 text-sm font-medium text-white">
              {formatResolution(activePoint.avg_resolution_time)}
            </p>
          </div>
          <div className="md:col-span-4">
            <Link
              href={`/dashboard?trend=${encodeURIComponent(
                activePoint.severity === "green" ? "stable" : "increasing"
              )}`}
              className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            >
              View matching issues
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
