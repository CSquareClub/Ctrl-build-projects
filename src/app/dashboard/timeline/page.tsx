"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  AreaChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  MessageSquare,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type TimelineDay } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";
import { useDashboardLive } from "@/providers/DashboardLiveProvider";
import { deriveSystemHealthTone, type SystemHealthTone } from "@/lib/system-health";

/* ─── types ─── */

type RangeOption = 7 | 30 | 90;
type SeverityFilter = "all" | "green" | "yellow" | "red";

interface EnrichedDay extends TimelineDay {
  movingAverage: number;
  spike: boolean;
  spikePercent: number;
}

/* ─── helpers ─── */

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatResolution(value: number | null) {
  if (value === null) return "n/a";
  if (value < 24) return `${value.toFixed(1)}h`;
  return `${(value / 24).toFixed(1)}d`;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildEnrichedData(data: TimelineDay[]): EnrichedDay[] {
  return data.map((point, index) => {
    const window = data
      .slice(Math.max(0, index - 4), index + 1)
      .map((e) => e.feedback_count);
    const movingAverage = average(window);
    const spike = movingAverage > 0 && point.feedback_count > movingAverage * 1.5;
    const spikePercent =
      movingAverage > 0
        ? Math.round(((point.feedback_count - movingAverage) / movingAverage) * 100)
        : 0;

    return { ...point, movingAverage, spike, spikePercent };
  });
}

function SectionHeading({
  icon: Icon,
  title,
  tone = "bad",
}: {
  icon: React.ElementType;
  title: string;
  tone?: SystemHealthTone;
}) {
  const cls =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent", cls)}>
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    </div>
  );
}

/* ─── tooltip ─── */

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: EnrichedDay }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/95 p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(point.date)}</p>
        <span className={cn(
          "rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em]",
          point.severity === "green"
            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
            : point.severity === "yellow"
              ? "bg-amber-50 dark:bg-yellow-400/15 text-amber-600 dark:text-yellow-200"
              : "bg-red-50 dark:bg-rose-500/15 text-red-600 dark:text-rose-300"
        )}>
          {point.severity}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Issues</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{point.issue_count}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Feedback</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{point.feedback_count}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Resolve</p>
          <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
            {point.avg_resolution_time === null ? "n/a" : `${point.avg_resolution_time}h`}
          </p>
        </div>
      </div>
      {point.spike && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3" />
          Spike detected: +{point.spikePercent}% above average
        </div>
      )}
    </div>
  );
}

/* ─── page ─── */

export default function TimelinePage() {
  const { session } = useAuth();
  const { criticalAlerts } = useDashboardLive();
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>(30);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [selectedDay, setSelectedDay] = useState<EnrichedDay | null>(null);
  const [selection, setSelection] = useState<{ startDate: string; endDate: string } | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const chromeTone = deriveSystemHealthTone(criticalAlerts);
  const headingTone: SystemHealthTone = chromeTone === "good" ? "good" : chromeTone === "warning" ? "warning" : "bad";

  /* ─── data loading ─── */

  useEffect(() => {
    const loadTimeline = async () => {
      if (!session?.access_token) { setDays([]); setLoading(false); return; }
      setLoading(true); setError(null);
      try { const result = await api.timeline.list(session.access_token); setDays(result); }
      catch (err) { setError(toUserFacingError(err, "timeline-load")); }
      finally { setLoading(false); }
    };
    void loadTimeline();
  }, [session?.access_token]);

  /* ─── computed ─── */

  const baseDays = useMemo(() => {
    const ranged = days.length <= range ? days : days.slice(-range);
    if (selection) return ranged.filter((d) => d.date >= selection.startDate && d.date <= selection.endDate);
    return ranged;
  }, [days, range, selection]);

  const filtered = useMemo(() => {
    if (severityFilter === "all") return baseDays;
    return baseDays.filter((d) => d.severity === severityFilter);
  }, [baseDays, severityFilter]);

  const enrichedData = useMemo(() => buildEnrichedData(filtered), [filtered]);

  const spikeDays = useMemo(() => enrichedData.filter((d) => d.spike), [enrichedData]);

  const metrics = useMemo(() => {
    if (enrichedData.length === 0) return null;
    const totalIssues = enrichedData.reduce((s, p) => s + p.issue_count, 0);
    const totalFeedback = enrichedData.reduce((s, p) => s + p.feedback_count, 0);
    const peakDay = enrichedData.reduce((pk, p) => (p.feedback_count > pk.feedback_count ? p : pk));
    const avgRes = average(enrichedData.map((p) => p.avg_resolution_time).filter((v): v is number => v !== null));
    return { totalIssues, totalFeedback, peakDay, avgResolution: avgRes };
  }, [enrichedData]);

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const selectionBounds = useMemo(() => {
    if (dragStart === null || dragEnd === null) return null;
    return { startIndex: Math.min(dragStart, dragEnd), endIndex: Math.max(dragStart, dragEnd) };
  }, [dragStart, dragEnd]);

  const handleQuickZoom = (date: string) => {
    const idx = baseDays.findIndex((d) => d.date === date);
    if (idx === -1) return;
    const start = Math.max(0, idx - 3);
    const end = Math.min(baseDays.length - 1, idx + 3);
    setSelection({ startDate: baseDays[start].date, endDate: baseDays[end].date });
    setRange(7);
  };

  const totalWidth = Math.max(720, enrichedData.length * 4);

  if (loading) {
    return (
      <div className="space-y-5">
        <SectionHeading icon={Clock} title="System Health Timeline" tone={headingTone} />
        <Skeleton className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-rose-500/20 bg-red-50 dark:bg-rose-500/10 p-6 text-sm text-red-600 dark:text-rose-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ── Controls ── */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading icon={Clock} title="System Health Timeline" tone={headingTone} />

          <div className="flex items-center gap-3">
            {/* Severity filter */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-1 gap-0.5">
              {(["all", "green", "yellow", "red"] as SeverityFilter[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSeverityFilter(opt)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition capitalize",
                    severityFilter === opt
                      ? opt === "green" ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950"
                        : opt === "yellow" ? "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950"
                        : opt === "red" ? "bg-red-600 text-white dark:bg-red-500 dark:text-slate-950"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {opt === "all" ? "All" : opt}
                </button>
              ))}
            </div>

            {/* Range selector */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-1">
              {([7, 30, 90] as RangeOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => { setRange(option); setSelection(null); setSelectedDay(null); }}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    range === option
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {option}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review the last {range} days of product health. Drag across the timeline to zoom, click a bar to expand day details.
        </p>
      </section>

      {/* ── Zoom indicator ── */}
      {selection && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            Zoomed: {formatShortDate(selection.startDate)} → {formatShortDate(selection.endDate)}
          </span>
          <button
            type="button"
            onClick={() => { setSelection(null); setSelectedDay(null); }}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Reset zoom
          </button>
        </div>
      )}

      {/* ── Metric Cards ── */}
      {metrics && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              <Activity className="h-3.5 w-3.5" />
              Total Issues
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalIssues}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              <MessageSquare className="h-3.5 w-3.5" />
              Feedback
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalFeedback}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              <TrendingUp className="h-3.5 w-3.5" />
              Peak Day
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{formatShortDate(metrics.peakDay.date)}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{metrics.peakDay.feedback_count} events</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Avg Resolution
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              {metrics.avgResolution > 0 ? formatResolution(metrics.avgResolution) : "No resolved tickets"}
            </p>
          </div>
        </div>
      )}

      {/* ── Timeline Visualization ── */}
      {enrichedData.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors"
        >
          <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" />
              Feedback Volume & Issue Trend
            </span>
            <span>Drag to zoom, click a segment to focus</span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div
              className="relative rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3 transition-colors"
              style={{ minWidth: `${totalWidth}px` }}
            >
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrichedData} margin={{ top: 10, right: 0, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="timelineAreaLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(99,102,241,0.18)" />
                        <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                      </linearGradient>
                      <linearGradient id="timelineAreaDark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(148,163,184,0.26)" />
                        <stop offset="100%" stopColor="rgba(148,163,184,0)" />
                      </linearGradient>
                    </defs>
                    <RechartsTooltip content={<TimelineTooltip />} cursor={false} />
                    <Area
                      type="monotone"
                      dataKey="feedback_count"
                      stroke="rgba(99,102,241,0)"
                      fill="url(#timelineAreaDark)"
                      isAnimationActive
                      animationDuration={450}
                    />
                    <Line
                      type="monotone"
                      dataKey="feedback_count"
                      stroke="rgba(99,102,241,0.7)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={500}
                    />
                    <Line
                      type="monotone"
                      dataKey="issue_count"
                      stroke="rgba(239,68,68,0.5)"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 4"
                      isAnimationActive
                      animationDuration={600}
                    />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Horizontal bar segments */}
                <div className="absolute inset-x-3 bottom-3 flex h-20 items-end">
                  {enrichedData.map((point, index) => {
                    const inSelection = selectionBounds && index >= selectionBounds.startIndex && index <= selectionBounds.endIndex;
                    const isSelected = selectedDay?.date === point.date;
                    const today = isToday(point.date);

                    return (
                      <div
                        key={point.date}
                        className="relative flex h-full w-[4px] shrink-0 items-end"
                        onMouseEnter={() => {
                          if (dragStart !== null) setDragEnd(index);
                        }}
                        onMouseUp={() => {
                          if (selectionBounds) {
                            setSelection({
                              startDate: enrichedData[selectionBounds.startIndex].date,
                              endDate: enrichedData[selectionBounds.endIndex].date,
                            });
                          }
                          setDragStart(null);
                          setDragEnd(null);
                        }}
                      >
                        {/* Spike indicator */}
                        {point.spike && (
                          <motion.span
                            className="absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-500 dark:bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.5)]"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 1.6, repeat: Infinity }}
                          />
                        )}

                        {/* Blinking today */}
                        {today && (
                          <motion.span
                            className="absolute -top-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-blue-500 dark:bg-cyan-400"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                          />
                        )}

                        <motion.button
                          type="button"
                          aria-label={`${formatDate(point.date)} health segment`}
                          whileHover={{ filter: "brightness(1.15)", scaleY: 1.04 }}
                          whileTap={{ scaleY: 0.98 }}
                          className={cn(
                            "relative h-full w-full rounded-sm bg-gradient-to-t transition-all",
                            point.severity === "green"
                              ? "from-emerald-400/90 to-emerald-500/70"
                              : point.severity === "yellow"
                                ? "from-yellow-300/90 to-yellow-400/75"
                                : "from-rose-400/90 to-red-500/75",
                            isSelected
                              ? "brightness-125 ring-2 ring-offset-1 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-950"
                              : "opacity-80",
                            inSelection ? "ring-1 ring-slate-400/30 dark:ring-white/20" : ""
                          )}
                          onMouseDown={() => { setDragStart(index); setDragEnd(index); }}
                          onClick={() => {
                            setSelectedDay(point);
                            handleQuickZoom(point.date);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Date range labels */}
          <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            <span>{formatShortDate(enrichedData[0].date)}</span>
            <span>{formatShortDate(enrichedData[enrichedData.length - 1].date)}</span>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" /> No issues
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full bg-gradient-to-r from-yellow-300 to-yellow-400" /> Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-full bg-gradient-to-r from-rose-400 to-red-500" /> High spike
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-4 border-b-2 border-dashed border-red-400" /> Issue trend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-4 bg-indigo-500 rounded" /> Feedback volume
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-6 text-sm text-slate-500 dark:text-slate-400">
          No timeline data yet. AgenticPulse will render system health here once issue and feedback data starts flowing.
        </div>
      )}

      {/* ── Day Detail Expansion ── */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent p-5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{formatDate(selectedDay.date)}</h3>
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    selectedDay.severity === "green" ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                      : selectedDay.severity === "yellow" ? "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                      : "text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20"
                  )}>
                    {selectedDay.severity}
                  </Badge>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Feedback</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selectedDay.feedback_count}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Issues</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selectedDay.issue_count}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Avg Resolution</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatResolution(selectedDay.avg_resolution_time)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Moving Avg</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{selectedDay.movingAverage.toFixed(1)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-transparent p-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedDay.spike ? (
                      <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" /> Spike +{selectedDay.spikePercent}%
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Normal</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  href={`/dashboard?trend=${encodeURIComponent(selectedDay.severity === "green" ? "stable" : "increasing")}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 transition hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  View matching issues <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spike Alerts ── */}
      {spikeDays.length > 0 && (
        <section className="space-y-4">
          <SectionHeading icon={AlertTriangle} title="Spike Alerts" tone={headingTone} />
          <div className="grid gap-3 md:grid-cols-2">
            {spikeDays.slice(0, 6).map((spike) => (
              <div
                key={spike.date}
                className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4 transition-colors cursor-pointer hover:border-amber-300 dark:hover:border-amber-500/30"
                onClick={() => { setSelectedDay(spike); handleQuickZoom(spike.date); }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(spike.date)}</p>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    ⚠️ +{spike.spikePercent}% above avg
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  {spike.issue_count} issues • {spike.feedback_count} feedback events
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
