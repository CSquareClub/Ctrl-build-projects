"use client";

import { useEffect, useMemo, useState } from "react";
import TimelineBar from "@/components/TimelineBar";
import WeeklyReportPanel from "@/components/WeeklyReportPanel";
import { api, type TimelineDay, type WeeklyReport } from "@/lib/api";
import { toUserFacingError } from "@/lib/user-facing-errors";
import { useAuth } from "@/providers/AuthProvider";

type RangeOption = 7 | 30 | 90;

export default function TimelinePage() {
  const { session } = useAuth();
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeOption>(30);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportEndDate, setReportEndDate] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  useEffect(() => {
    const loadTimeline = async () => {
      if (!session?.access_token) {
        setDays([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await api.timeline.list(session.access_token);
        setDays(result);
      } catch (err) {
        setError(toUserFacingError(err, "timeline-load"));
      } finally {
        setLoading(false);
      }
    };

    void loadTimeline();
  }, [session?.access_token]);

  useEffect(() => {
    if (!days.length || reportEndDate) {
      return;
    }

    setReportEndDate(days[days.length - 1].date);
  }, [days, reportEndDate]);

  useEffect(() => {
    const loadReport = async () => {
      if (!session?.access_token || !reportEndDate) {
        setReport(null);
        setReportLoading(false);
        return;
      }

      setReportLoading(true);
      setReportError(null);

      try {
        const result = await api.reports.weekly(session.access_token, reportEndDate);
        setReport(result);
      } catch (err) {
        setReportError(toUserFacingError(err, "weekly-report-load"));
      } finally {
        setReportLoading(false);
      }
    };

    void loadReport();
  }, [reportEndDate, session?.access_token]);

  const visibleDays = useMemo(() => {
    const baseDays = days.length <= range ? days : days.slice(-range);

    if (!selection) {
      return baseDays;
    }

    return baseDays.filter(
      (day) => day.date >= selection.startDate && day.date <= selection.endDate
    );
  }, [days, range, selection]);

  const highlightedDates = useMemo(
    () => report?.spikes.map((spike) => spike.date) ?? [],
    [report]
  );

  const handleQuickZoom = (date: string) => {
    const baseDays = days.length <= range ? days : days.slice(-range);
    const index = baseDays.findIndex((day) => day.date === date);
    if (index === -1) {
      return;
    }

    const startIndex = Math.max(0, index - 3);
    const endIndex = Math.min(baseDays.length - 1, index + 3);

    setSelection({
      startDate: baseDays[startIndex].date,
      endDate: baseDays[endIndex].date,
    });
    setRange(7);
    setReportEndDate(date);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400">
        Building your system health timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">
            System Health Timeline
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Review the last 7, 30, or 90 days of product health in one continuous strip.
          </p>
        </div>

        <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-900/80 p-1">
          {[7, 30, 90].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setRange(option as RangeOption);
                setSelection(null);
                const baseDays = days.length <= option ? days : days.slice(-option);
                setReportEndDate(baseDays[baseDays.length - 1]?.date ?? null);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                range === option
                  ? "bg-slate-100 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      {selection && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          <span>
            Zoomed range: {selection.startDate} to {selection.endDate}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelection(null);
              const baseDays = days.length <= range ? days : days.slice(-range);
              setReportEndDate(baseDays[baseDays.length - 1]?.date ?? null);
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
          >
            Reset zoom
          </button>
        </div>
      )}

      <TimelineBar
        data={visibleDays}
        granularity="day"
        highlightDates={highlightedDates}
        onSelectRange={(nextSelection) => {
          setSelection(nextSelection);
          setReportEndDate(nextSelection?.endDate ?? visibleDays[visibleDays.length - 1]?.date ?? null);
        }}
        onQuickZoom={handleQuickZoom}
      />

      <div className="mt-8">
        <WeeklyReportPanel
          report={report}
          loading={reportLoading}
          error={reportError}
        />
      </div>
    </div>
  );
}
