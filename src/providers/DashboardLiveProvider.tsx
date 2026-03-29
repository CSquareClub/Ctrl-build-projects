"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FeedbackMessage, Issue } from "@/lib/api";
import { useIssues } from "./IssuesProvider";
import { useAuth } from "./AuthProvider";
import { isDemoUser } from "@/lib/demo-mode";

export interface LiveIssue extends Issue {
  category: "Bug" | "Problem" | "Feature Request" | "Praise";
  severity: "Critical" | "Warning" | "Stable";
  updatedAt: string;
  sparkline: number[];
}

export interface DashboardNotification {
  id: string;
  title: string;
  kind: "critical" | "new" | "insight";
  createdAt: string;
  read: boolean;
}

export interface TrendPoint {
  time: string;
  complaints: number;
}

export interface FeedbackFeedItem extends FeedbackMessage {
  sourceLabel: string;
}

interface DashboardLiveContextType {
  liveIssues: LiveIssue[];
  criticalAlerts: LiveIssue[];
  notifications: DashboardNotification[];
  unreadCount: number;
  trendSeries: TrendPoint[];
  recentFeedback: FeedbackFeedItem[];
  distribution: { bugs: number; problems: number; features: number; praise: number };
  acknowledgeNotifications: () => void;
}

const DashboardLiveContext = createContext<DashboardLiveContextType | null>(null);

const fallbackIssues: Issue[] = [
  {
    id: "login-crash-spike",
    title: "Login crash reports increased after latest mobile release",
    sources: ["app-reviews", "gmail"],
    reportCount: 34,
    priority: "HIGH",
    trend: "increasing",
    trendPercent: 60,
    createdAt: new Date().toISOString(),
  },
  {
    id: "checkout-friction",
    title: "Checkout flow friction showing up in support and social",
    sources: ["gmail", "instagram"],
    reportCount: 21,
    priority: "MEDIUM",
    trend: "increasing",
    trendPercent: 22,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "dark-mode-praise",
    title: "Users are praising the new dark mode polish",
    sources: ["instagram", "app-reviews"],
    reportCount: 12,
    priority: "LOW",
    trend: "stable",
    trendPercent: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

function sourceLabel(source: string) {
  if (source === "app-reviews") return "Reviews";
  if (source === "gmail") return "Gmail";
  if (source === "instagram") return "Social";
  return source;
}

function issueCategory(issue: Issue): LiveIssue["category"] {
  if (issue.category === "Bug") return "Bug";
  if (issue.category === "Problem") return "Problem";
  if (issue.category === "Feature Request") return "Feature Request";
  if (issue.category === "Praise") return "Praise";

  if (issue.priority === "LOW") return "Praise";
  return "Problem";
}

function isLargeIssue(issue: Issue) {
  return issue.reportCount >= 25 || issue.trendPercent >= 45;
}

function issueSeverity(issue: Issue): LiveIssue["severity"] {
  if (issue.priority === "HIGH" && isLargeIssue(issue)) return "Critical";
  if (
    issue.priority === "MEDIUM" ||
    issue.priority === "HIGH" ||
    issue.reportCount >= 10 ||
    issue.trendPercent >= 18
  ) {
    return "Warning";
  }
  return "Stable";
}

function seedSparkline(issue: Issue, index: number) {
  return Array.from({ length: 10 }, (_, pointIndex) =>
    Math.max(
      4,
      Math.round(issue.reportCount * 0.4 + index * 2 + pointIndex * ((issue.trendPercent % 7) + 1))
    )
  );
}

function toLiveIssue(issue: Issue, index: number): LiveIssue {
  return {
    ...issue,
    category: issueCategory(issue),
    severity: issueSeverity(issue),
    updatedAt: new Date(Date.now() - index * 1000 * 60 * 12).toISOString(),
    sparkline: seedSparkline(issue, index),
  };
}

function createInitialNotifications(
  issues: LiveIssue[],
  demoUser: boolean
): DashboardNotification[] {
  return issues.slice(0, 3).map((issue, index) => ({
    id: `notif-${issue.id}-${index}`,
    title: demoUser
      ? index === 0
        ? `Login crash reports increased ${Math.max(18, issue.trendPercent)}%`
        : index === 1
          ? `New issue detected: ${issue.title}`
          : `System insight: ${issue.sources.length} sources now mention ${issue.category.toLowerCase()} signals`
      : index === 0
        ? `${issue.title} is affecting ${issue.reportCount} reports`
        : index === 1
          ? `Monitor ${issue.title} across ${issue.sources.join(", ")}`
          : `${issue.title} is trending ${issue.trend}`,
    kind: index === 0 ? "critical" : index === 1 ? "new" : "insight",
    createdAt: new Date(Date.now() - index * 1000 * 60 * 6).toISOString(),
    read: !demoUser || index > 0,
  }));
}

function createInitialTrendSeries(issues: LiveIssue[]): TrendPoint[] {
  if (issues.length === 0) {
    return [];
  }

  const total = issues.reduce((sum, issue) => sum + issue.reportCount, 0);

  return Array.from({ length: 8 }, (_, index) => ({
    time: `${9 + index}:00`,
    complaints: Math.max(8, total - 18 + index * 4),
  }));
}

function createRealTrendSeries(issues: LiveIssue[]): TrendPoint[] {
  return [...issues]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-8)
    .map((issue) => ({
      time: new Date(issue.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      complaints: issue.reportCount,
    }));
}

function createInitialFeedback(issues: LiveIssue[], demoUser: boolean): FeedbackFeedItem[] {
  if (!demoUser) {
    return [];
  }

  const issueFeedback = issues.flatMap((issue, issueIndex) =>
    issue.sources.map((source, sourceIndex) => ({
      id: `${issue.id}-feedback-${sourceIndex}`,
      text:
        source === "gmail"
          ? `Customers keep mentioning "${issue.title.toLowerCase()}".`
          : source === "app-reviews"
            ? `Several reviewers mention ${issue.title.toLowerCase()}.`
            : `Social mentions are surfacing ${issue.title.toLowerCase()}.`,
      source,
      sourceLabel: sourceLabel(source),
      author: source === "instagram" ? "@productuser" : "Customer report",
      timestamp: new Date(
        Date.now() - (issueIndex * 2 + sourceIndex) * 1000 * 60 * 7
      ).toISOString(),
      sentiment: (issue.priority === "LOW" ? "positive" : "negative") as
        | "positive"
        | "negative",
    }))
  );

  return issueFeedback.slice(0, 10);
}

export function DashboardLiveProvider({ children }: { children: ReactNode }) {
  const { profile, user, session } = useAuth();
  const { issues, refreshIssues } = useIssues();
  const demoUser =
    Boolean(session?.access_token) &&
    isDemoUser(profile.email) &&
    isDemoUser(user?.email ?? null);
  const baseIssues = useMemo(
    () => (issues.length > 0 ? issues : demoUser ? fallbackIssues : []),
    [demoUser, issues]
  );

  const [liveIssues, setLiveIssues] = useState<LiveIssue[]>([]);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [trendSeries, setTrendSeries] = useState<TrendPoint[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackFeedItem[]>([]);

  useEffect(() => {
    const nextIssues = baseIssues.map(toLiveIssue);
    const resetTimer = window.setTimeout(() => {
      setLiveIssues(nextIssues);
      setNotifications(createInitialNotifications(nextIssues, demoUser));
      setTrendSeries(
        demoUser ? createInitialTrendSeries(nextIssues) : createRealTrendSeries(nextIssues)
      );
      setRecentFeedback(createInitialFeedback(nextIssues, demoUser));
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [baseIssues, demoUser]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      void refreshIssues();
    }, 20000);

    return () => window.clearInterval(refreshTimer);
  }, [refreshIssues]);

  useEffect(() => {
    if (!demoUser || !liveIssues.length) return;

    const liveTimer = window.setInterval(() => {
      setLiveIssues((current) =>
        current.map((issue, index) => {
          const bump =
            index === 0 ? Math.ceil(Math.random() * 2) : Math.round(Math.random());
          const nextReportCount =
            issue.trend === "decreasing"
              ? Math.max(4, issue.reportCount - bump)
              : issue.reportCount + bump;

          const nextSparkline = [...issue.sparkline.slice(1), nextReportCount];

          return {
            ...issue,
            reportCount: nextReportCount,
            trendPercent:
              issue.trend === "increasing"
                ? Math.min(issue.trendPercent + 2, 98)
                : Math.max(issue.trendPercent - 1, 4),
            sparkline: nextSparkline,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      setTrendSeries((current) => {
        const last = current[current.length - 1];
        const nextValue = Math.max(
          6,
          (last?.complaints ?? 18) + Math.round(Math.random() * 6 - 2)
        );
        const hour = (current.length + 9) % 24;
        return [...current.slice(1), { time: `${hour}:00`, complaints: nextValue }];
      });

      setNotifications((current) => {
        const [topIssue] = liveIssues;
        if (!topIssue) return current;

        const nextNotification: DashboardNotification = {
          id: `notif-live-${Date.now()}`,
          title:
            current.length % 3 === 0
              ? `Spike alert: ${topIssue.title} increased ${Math.max(
                  18,
                  topIssue.trendPercent
                )}%`
              : current.length % 3 === 1
                ? `New issue detected in ${sourceLabel(topIssue.sources[0] ?? "feed")}`
                : `System insight: ${topIssue.reportCount} active complaints require triage`,
          kind:
            current.length % 3 === 0
              ? "critical"
              : current.length % 3 === 1
                ? "new"
                : "insight",
          createdAt: new Date().toISOString(),
          read: false,
        };

        return [nextNotification, ...current].slice(0, 8);
      });
    }, 6500);

    return () => window.clearInterval(liveTimer);
  }, [demoUser, liveIssues]);

  const distribution = useMemo(() => {
    const bugs = liveIssues.filter((issue) => issue.category === "Bug").length;
    const problems = liveIssues.filter((issue) => issue.category === "Problem").length;
    const features = liveIssues.filter(
      (issue) => issue.category === "Feature Request"
    ).length;
    const praise = liveIssues.filter((issue) => issue.category === "Praise").length;

    return { bugs, problems, features, praise };
  }, [liveIssues]);

  const criticalAlerts = useMemo(
    () =>
      [...liveIssues]
        .sort((a, b) => {
          const severityWeight = { Critical: 3, Warning: 2, Stable: 1 };
          return (
            severityWeight[b.severity] - severityWeight[a.severity] ||
            b.reportCount - a.reportCount ||
            b.trendPercent - a.trendPercent
          );
        })
        .slice(0, 5),
    [liveIssues]
  );

  const acknowledgeNotifications = useCallback(() => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );
  }, []);

  const value = useMemo(
    () => ({
      liveIssues,
      criticalAlerts,
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      trendSeries,
      recentFeedback,
      distribution,
      acknowledgeNotifications,
    }),
    [
      acknowledgeNotifications,
      criticalAlerts,
      distribution,
      liveIssues,
      notifications,
      recentFeedback,
      trendSeries,
    ]
  );

  return (
    <DashboardLiveContext.Provider value={value}>
      {children}
    </DashboardLiveContext.Provider>
  );
}

export function useDashboardLive() {
  const context = useContext(DashboardLiveContext);

  if (!context) {
    throw new Error("useDashboardLive must be used within DashboardLiveProvider.");
  }

  return context;
}
