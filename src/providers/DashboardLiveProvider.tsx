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
import { useLiveEvents } from "./LiveEventsProvider";
import {
  DASHBOARD_DEMO_MODE,
  dashboardDemoAgentActivity,
  dashboardDemoFeedback,
  dashboardDemoNotifications,
  dashboardDemoReminders,
  dashboardDemoTickets,
  dashboardDemoTrendSeries,
} from "@/lib/dashboard-demo";

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

export interface DashboardTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface DashboardLiveContextType {
  liveIssues: LiveIssue[];
  criticalAlerts: LiveIssue[];
  notifications: DashboardNotification[];
  unreadCount: number;
  trendSeries: TrendPoint[];
  recentFeedback: FeedbackFeedItem[];
  distribution: { bugs: number; problems: number; features: number; praise: number };
  agentActivity: string[];
  tickets: DashboardTicket[];
  reminders: typeof dashboardDemoReminders;
  acknowledgeNotifications: () => void;
}

const DashboardLiveContext = createContext<DashboardLiveContextType | null>(null);

const fallbackIssues: Issue[] = [
  {
    id: "audit-form-submission-glitch",
    title: "Audit form submission glitch",
    sources: ["gmail", "app-reviews"],
    reportCount: 25,
    priority: "HIGH",
    trend: "increasing",
    trendPercent: 58,
    createdAt: new Date().toISOString(),
  },
  {
    id: "login-auth-friction",
    title: "Login and authentication friction",
    sources: ["gmail", "instagram"],
    reportCount: 9,
    priority: "MEDIUM",
    trend: "increasing",
    trendPercent: 24,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "billing-and-payments",
    title: "Billing and payment friction",
    sources: ["gmail", "app-reviews"],
    reportCount: 4,
    priority: "MEDIUM",
    trend: "stable",
    trendPercent: 11,
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

  const auditIssue = issues.find((issue) => issue.title.toLowerCase().includes("audit form"));
  const auditFeedback: FeedbackFeedItem[] = auditIssue
    ? [
        {
          id: "audit-feedback-1",
          text: "Audit form is not submitting, button does nothing after I fill every field.",
          source: "gmail",
          sourceLabel: "Gmail",
          author: "Audit User 1",
          timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
          sentiment: "negative",
        },
        {
          id: "audit-feedback-2",
          text: "I click submit on the audit page and the request never reaches the backend.",
          source: "gmail",
          sourceLabel: "Gmail",
          author: "Audit User 7",
          timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          sentiment: "negative",
        },
        {
          id: "audit-feedback-3",
          text: "Audit page keeps spinning after submit and never confirms success.",
          source: "gmail",
          sourceLabel: "Gmail",
          author: "Audit User 13",
          timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
          sentiment: "negative",
        },
      ]
    : [];

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

  return [...auditFeedback, ...issueFeedback].slice(0, 10);
}

export function DashboardLiveProvider({ children }: { children: ReactNode }) {
  const { profile, user, session } = useAuth();
  const { issues, refreshIssues } = useIssues();
  const { subscribeToEvents } = useLiveEvents();
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
  const [agentActivity] = useState(dashboardDemoAgentActivity);
  const [tickets] = useState(dashboardDemoTickets);
  const [reminders] = useState(dashboardDemoReminders);

  useEffect(() => {
    const nextIssues = baseIssues.map(toLiveIssue);
    const resetTimer = window.setTimeout(() => {
      setLiveIssues(nextIssues);
      setNotifications(
        DASHBOARD_DEMO_MODE
          ? dashboardDemoNotifications.map((notification) => ({
              id: notification.id,
              title: notification.title,
              kind:
                notification.type === "spike"
                  ? "critical"
                  : notification.type === "ticket"
                    ? "new"
                    : "insight",
              createdAt: notification.createdAt,
              read: notification.read,
            }))
          : createInitialNotifications(nextIssues, demoUser)
      );
      setTrendSeries(
        DASHBOARD_DEMO_MODE
          ? dashboardDemoTrendSeries
          : demoUser
            ? createInitialTrendSeries(nextIssues)
            : createRealTrendSeries(nextIssues)
      );
      setRecentFeedback(
        DASHBOARD_DEMO_MODE
          ? dashboardDemoFeedback.map((item) => ({
              ...item,
              sourceLabel: sourceLabel(item.source),
            }))
          : createInitialFeedback(nextIssues, demoUser)
      );
    }, DASHBOARD_DEMO_MODE ? 950 : 0);

    return () => window.clearTimeout(resetTimer);
  }, [baseIssues, demoUser]);

  useEffect(() => {
    if (!session?.access_token || demoUser || DASHBOARD_DEMO_MODE) {
      return;
    }

    return subscribeToEvents(
      () => {
        void refreshIssues({ silent: true });
      },
      {
        types: ["new_feedback", "agent_action", "notification_created", "patch_accepted"],
      }
    );
  }, [demoUser, refreshIssues, session?.access_token, subscribeToEvents]);

  useEffect(() => {
    if (!demoUser || !liveIssues.length || DASHBOARD_DEMO_MODE) return;

    const liveTimer = window.setInterval(() => {}, 6500);
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
      agentActivity,
      tickets,
      reminders,
      acknowledgeNotifications,
    }),
    [
      acknowledgeNotifications,
      agentActivity,
      criticalAlerts,
      distribution,
      liveIssues,
      notifications,
      recentFeedback,
      reminders,
      tickets,
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
