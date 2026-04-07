import type {
  AgentAction,
  AgentStatus,
  FeedbackMessage,
  InspectionActivity,
  InspectionResult,
  Issue,
  Notification,
  Reminder,
  SdkAnalyticsResponse,
  SdkConnectedApp,
  AgentAnomaly,
  AgentChatResponse,
  AgentExecutiveSummary,
  AgentMemoryHighlight,
  AgentPrediction,
  AgentPriorityResult,
  AgentTrend,
  MobileInspectionResult,
} from "@/lib/api";

export const DEMO_UI_MODE = true;
export const PRIMARY_WEBSITE_DOMAIN = "webate.vercel.app";
export const PRIMARY_WEBSITE_URL = `https://${PRIMARY_WEBSITE_DOMAIN}`;

const now = Date.now();

export const demoAnalytics = {
  issue: "Audit form not responding",
  severity: "critical" as const,
  reports: 25,
  trend: "+18%",
  trendPercent: 18,
  source: "gmail + sdk",
  status: "open" as const,
  timeline: [2, 4, 6, 10, 18, 25, 25],
  timelineLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  subtitle: "Spike detected",
  graphLabel: "Feedback Spike",
};

export const demoWebsiteAnalytics = {
  issues: [
    {
      title: demoAnalytics.issue,
      severity: demoAnalytics.severity,
      reports: demoAnalytics.reports,
    },
  ],
  clicks: "rage clicks detected",
  dropOff: "high at submit",
};

export const demoSdkAnalytics = {
  issues: [
    {
      title: demoAnalytics.issue,
      severity: demoAnalytics.severity,
      reports: demoAnalytics.reports,
    },
  ],
  events: "multiple failed submits",
  friction: "high interaction without response",
};

export const demoSdkAnalyticsResponse: SdkAnalyticsResponse = {
  behavior: {
    sessions: 184,
    clicks: 942,
    engagement: "strong",
    avgFriction: 72,
  },
  frictionMap: {
    pages: [
      { page: "/audit", friction: 91, deadClicks: 31, rageClicks: 18, formStruggle: 25 },
      { page: "/pricing", friction: 34, deadClicks: 6, rageClicks: 3, formStruggle: 2 },
    ],
    elements: [
      { target: "Audit submit button", deadClicks: 19, rageClicks: 14, totalHits: 61 },
      { target: "Lead capture modal", deadClicks: 7, rageClicks: 4, totalHits: 23 },
    ],
  },
  painPoints: [
    { label: "Audit form submit does not respond", count: 25 },
    { label: "Repeated clicks before exit", count: 18 },
    { label: "Submit flow crash after retry", count: 12 },
  ],
  uxSuggestions: [
    "Add submit handler validation and positive success feedback.",
    "Prevent repeated clicks by disabling submit while the request is in flight.",
    "Capture submit failures and surface a retry-safe confirmation state.",
  ],
};

export const demoSdkApps: SdkConnectedApp[] = [
  {
    domain: PRIMARY_WEBSITE_DOMAIN,
    lastActivity: new Date(now - 1000 * 60 * 6).toISOString(),
    status: "connected",
    eventsCount: 942,
    sessionsCount: 184,
    feedbackCount: 25,
    avgFriction: 72,
  },
  {
    domain: PRIMARY_WEBSITE_DOMAIN,
    lastActivity: new Date(now - 1000 * 60 * 14).toISOString(),
    status: "connected",
    eventsCount: 521,
    sessionsCount: 109,
    feedbackCount: 12,
    avgFriction: 41,
  },
];

export const demoInspectionActivity: InspectionActivity[] = [
  {
    id: "inspect-activity-1",
    message: "Detected spike in audit form issues",
    status: "success",
    timestamp: new Date(now - 1000 * 60 * 7).toISOString(),
  },
  {
    id: "inspect-activity-2",
    message: "Confidence score settled at 92%",
    status: "success",
    timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "inspect-activity-3",
    message: "Suggested fix generated for submit handler",
    status: "success",
    timestamp: new Date(now - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "inspect-activity-4",
    message: "Patch ready for deployment",
    status: "success",
    timestamp: new Date(now - 1000 * 60 * 1).toISOString(),
  },
];

export const demoInspectionResults: InspectionResult[] = [
  {
    id: "inspect-result-1",
    issue: demoAnalytics.issue,
    confidence: 92,
    observedBehavior: "Users repeatedly click submit but the form does not respond or confirm success.",
    suspectedCause: "Submit handler is missing or returns early before sending the request.",
    suggestedFix: "Restore the submit handler, validate inputs, and return a visible success confirmation.",
    url: `${PRIMARY_WEBSITE_URL}/audit`,
    createdAt: new Date(now - 1000 * 60 * 2).toISOString(),
  },
];

export const demoIssues: Issue[] = [
  {
    id: "audit-form-not-responding",
    title: demoAnalytics.issue,
    sources: ["gmail", "sdk"],
    reportCount: demoAnalytics.reports,
    category: "Bug",
    priority: "HIGH",
    trend: "increasing",
    trendPercent: demoAnalytics.trendPercent,
    createdAt: new Date(now - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "app-crash-on-submit",
    title: "App crash on submit",
    sources: ["gmail", "sdk"],
    reportCount: 12,
    category: "Problem",
    priority: "HIGH",
    trend: "increasing",
    trendPercent: 9,
    createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "checkout-latency-spike",
    title: "Checkout latency spike",
    sources: ["sdk", "gmail"],
    reportCount: 7,
    category: "Problem",
    priority: "MEDIUM",
    trend: "increasing",
    trendPercent: 6,
    createdAt: new Date(now - 1000 * 60 * 32).toISOString(),
  },
];

export const demoTrendSeries = demoAnalytics.timeline.map((complaints, index) => ({
  time: demoAnalytics.timelineLabels[index],
  complaints,
}));

export const demoFeedback: FeedbackMessage[] = [
  {
    id: "feedback-audit-1",
    text: "Audit form not submitting, button does nothing after I fill every field.",
    source: "gmail",
    author: "Priya S",
    timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
    sentiment: "negative",
  },
  {
    id: "feedback-audit-2",
    text: "The audit request never gets submitted and I do not see any confirmation.",
    source: "sdk",
    author: "Nikhil A",
    timestamp: new Date(now - 1000 * 60 * 11).toISOString(),
    sentiment: "negative",
  },
  {
    id: "feedback-crash-1",
    text: "App crashes right after clicking submit on the lead flow.",
    source: "gmail",
    author: "Riya K",
    timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
    sentiment: "negative",
  },
  {
    id: "feedback-audit-3",
    text: "Still seeing the submit CTA freeze on the audit page.",
    source: "sdk",
    author: "Ankit V",
    timestamp: new Date(now - 1000 * 60 * 23).toISOString(),
    sentiment: "negative",
  },
  {
    id: "feedback-crash-2",
    text: "Submit opens a loading state and then the app closes unexpectedly.",
    source: "gmail",
    author: "Meera D",
    timestamp: new Date(now - 1000 * 60 * 29).toISOString(),
    sentiment: "negative",
  },
];

export const demoNotifications: Notification[] = [
  {
    id: "demo-notification-1",
    userId: "demo",
    title: "25 new reports detected",
    message: "Audit form complaints surged across Gmail and SDK signals.",
    type: "spike",
    read: false,
    metadata: { issueId: "audit-form-not-responding" },
    createdAt: new Date(now - 1000 * 60 * 4).toISOString(),
  },
  {
    id: "demo-notification-2",
    userId: "demo",
    title: "Critical issue requires attention",
    message: "Audit form not responding has become the top user-facing problem.",
    type: "ticket",
    read: false,
    metadata: { issueId: "audit-form-not-responding" },
    createdAt: new Date(now - 1000 * 60 * 9).toISOString(),
  },
  {
    id: "demo-notification-3",
    userId: "demo",
    title: "Agent generated fix",
    message: "A safe patch was prepared for the audit submission flow.",
    type: "reminder",
    read: false,
    metadata: { issueId: "audit-form-not-responding" },
    createdAt: new Date(now - 1000 * 60 * 14).toISOString(),
  },
];

export const demoReminders: Reminder[] = [
  {
    id: "demo-reminder-1",
    title: "Follow up on audit fix",
    description: "Confirm the audit form patch is live and collecting leads correctly.",
    remindAt: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
    status: "pending",
    linkedIssueId: "audit-form-not-responding",
    linkedTicketId: "demo-ticket-1",
    createdByAgent: true,
    linkedIssue: {
      id: "audit-form-not-responding",
      title: demoAnalytics.issue,
      priority: "HIGH",
    },
    linkedTicket: {
      id: "demo-ticket-1",
      title: "Fix audit form submission",
      status: "open",
    },
    createdAt: new Date(now - 1000 * 60 * 7).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 7).toISOString(),
  },
  {
    id: "demo-reminder-2",
    title: "Check deployment logs",
    description: "Review post-deploy stability after the submit crash patch.",
    remindAt: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
    status: "pending",
    linkedIssueId: "app-crash-on-submit",
    linkedTicketId: "demo-ticket-2",
    createdByAgent: true,
    linkedIssue: {
      id: "app-crash-on-submit",
      title: "App crash on submit",
      priority: "HIGH",
    },
    linkedTicket: {
      id: "demo-ticket-2",
      title: "Resolve crash on submit",
      status: "in_progress",
    },
    createdAt: new Date(now - 1000 * 60 * 13).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 13).toISOString(),
  },
];

export const demoAgentActivity = [
  "Detected spike in audit form issues",
  "Confidence score: 92%",
  "Suggested fix generated",
  "Patch ready for deployment",
];

export const demoTickets = [
  {
    id: "demo-ticket-1",
    title: "Fix audit form submission",
    status: "Open",
    priority: "High",
  },
  {
    id: "demo-ticket-2",
    title: "Resolve crash on submit",
    status: "In Progress",
    priority: "High",
  },
];

export const demoAgentActions: AgentAction[] = [
  {
    id: "demo-agent-action-1",
    userId: "demo",
    agentId: "demo-agent",
    actionType: "issue_detected",
    reason: "Detected spike in audit form issues",
    metadata: {
      confidenceScore: 92,
      linkedIssueId: "audit-form-not-responding",
      priorityLevel: "critical",
      confidenceReasoning:
        "Confidence: 92% (High)\nBased on:\n- 25 similar reports\n- 2 sources\n- strong pattern match in audit form failures\n- 92% past acceptance rate",
      plannerReasoning:
        "Audit form failures are now the clearest blocker to conversion and should be addressed before the submit-crash regression.",
      strategy: "Safe patch",
      riskLevel: "Low",
    },
    createdAt: new Date(now - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "demo-agent-action-2",
    userId: "demo",
    agentId: "demo-agent",
    actionType: "ticket_created",
    reason: "Opened a focused engineering task for the audit submission flow.",
    metadata: {
      confidenceScore: 88,
      linkedIssueId: "audit-form-not-responding",
      priorityLevel: "high",
      plannerReasoning:
        "The failure is isolated to one user journey and can be fixed with a low-risk submit handler patch.",
    },
    createdAt: new Date(now - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "demo-agent-action-3",
    userId: "demo",
    agentId: "demo-agent",
    actionType: "predictive_alert",
    reason: "Predicted the submit crash issue will grow if the audit fix ships without a retry-safe response state.",
    metadata: {
      confidenceScore: 81,
      linkedIssueId: "app-crash-on-submit",
      priorityLevel: "high",
      prediction: {
        prediction:
          "Crash-on-submit reports are likely to increase after the next growth push unless the submit flow gets proper success/error handling.",
      },
    },
    createdAt: new Date(now - 1000 * 60 * 14).toISOString(),
  },
];

export const demoAgentStatus: AgentStatus = {
  enabled: true,
  state: "active",
  lastRunAt: new Date(now - 1000 * 60 * 2).toISOString(),
  latestBanner: "Analysis completed",
  latestAction: demoAgentActions[0],
  actions: demoAgentActions,
  listening: true,
};

export const demoCommandCenterAnomalies: AgentAnomaly[] = [
  {
    issue_type: "audit-form-not-responding",
    issue_type_label: "Audit form not responding",
    spike_detected: true,
    spike_level: "high",
    baseline_hourly_rate: 2,
    current_hourly_rate: 9,
    last_hour_count: 9,
    last_six_hours_count: 25,
    spike_ratio: 4.5,
    trend_growth_percent: 18,
  },
];

export const demoCommandCenterPredictions: AgentPrediction[] = [
  {
    issue_type: "audit-form-not-responding",
    issue_type_label: "Audit form not responding",
    escalating: true,
    current_window_count: 25,
    previous_window_count: 18,
    trend_delta: 7,
    repeated_within_short_interval: true,
    prediction:
      "If the submit handler is not restored today, audit complaints will remain the highest-volume signal through the next sync window.",
    confidence: 92,
  },
  {
    issue_type: "app-crash-on-submit",
    issue_type_label: "App crash on submit",
    escalating: true,
    current_window_count: 12,
    previous_window_count: 8,
    trend_delta: 4,
    repeated_within_short_interval: false,
    prediction:
      "The crash on submit is likely to become the second active escalation unless the same patch also hardens the retry path.",
    confidence: 84,
  },
];

export const demoCommandCenterTrends: AgentTrend[] = [
  {
    issue_type: "audit-form-not-responding",
    issue_type_label: "Audit form not responding",
    frequency_count: 25,
    resolution_time_hours: 3.2,
    trend_direction: "up",
    trend_growth_percent: 18,
    summary: "Audit submission complaints have climbed across both Gmail and SDK signals over the last week.",
  },
  {
    issue_type: "app-crash-on-submit",
    issue_type_label: "App crash on submit",
    frequency_count: 12,
    resolution_time_hours: 4.6,
    trend_direction: "up",
    trend_growth_percent: 9,
    summary: "Crash-on-submit reports remain elevated and correlate with repeated retries in the same session.",
  },
];

export const demoCommandCenterPriority: AgentPriorityResult = {
  issue_id: "audit-form-not-responding",
  priority_score: 94,
  priority_level: "critical",
  reasoning:
    "This issue blocks the primary audit conversion path and is now the top source of negative feedback volume.",
  confidence: {
    score: 92,
    level: "high",
    reasoning:
      "Strong cross-source confirmation and consistent wording make this the most reliable signal in the system.",
  },
  anomaly: demoCommandCenterAnomalies[0],
  trend: demoCommandCenterTrends[0],
  prediction: demoCommandCenterPredictions[0],
  actions: [
    "Restore the submit handler",
    "Validate required inputs before send",
    "Show a clear success state after submission",
  ],
  execution_mode: "suggest",
};

export const demoCommandCenterMemories: AgentMemoryHighlight[] = [
  {
    id: "memory-1",
    memoryType: "issue",
    content: {
      summary:
        "The audit form regression first appeared after the latest landing-page update and has remained stable across Gmail and SDK signals.",
    },
    importanceScore: 0.93,
    createdAt: new Date(now - 1000 * 60 * 22).toISOString(),
  },
  {
    id: "memory-2",
    memoryType: "decision",
    content: {
      summary:
        "Engineering prioritized the audit submission bug ahead of lower-volume checkout latency issues due to direct conversion impact.",
    },
    importanceScore: 0.88,
    createdAt: new Date(now - 1000 * 60 * 36).toISOString(),
  },
];

export const demoCommandCenterSummary: AgentExecutiveSummary = {
  generatedAt: new Date(now - 1000 * 60 * 2).toISOString(),
  mode: "real",
  summary:
    "Audit submission failures remain the dominant risk across the product. The system has isolated the failure to the submit path, prepared the safest remediation steps, and kept crash-on-submit as the next-most-likely escalation.",
  topIssues: [
    {
      id: "audit-form-not-responding",
      title: "Audit form not responding",
      priority: "HIGH",
      reportCount: 25,
      trendPercent: 18,
    },
    {
      id: "app-crash-on-submit",
      title: "App crash on submit",
      priority: "HIGH",
      reportCount: 12,
      trendPercent: 9,
    },
  ],
  actionsTaken: demoAgentActions.map((action) => ({
    id: action.id,
    actionType: action.actionType,
    reason: action.reason,
    createdAt: action.createdAt,
  })),
  risks: [
    "Audit leads are being lost on the final action.",
    "Crash-on-submit may rise after the next traffic spike if retry handling remains weak.",
  ],
  recommendations: [
    "Ship the audit submit handler patch first.",
    "Add a retry-safe success state to the submit flow.",
    "Watch post-deploy submit behavior for 24 hours.",
  ],
  memoryHighlights: demoCommandCenterMemories,
};

export const demoMobileInspectionResults: MobileInspectionResult[] = [
  {
    id: "mobile-result-1",
    issue: "App crash on submit",
    deviceName: "Google Pixel 6",
    platformName: "Android",
    platformVersion: "14",
    appUrl: PRIMARY_WEBSITE_URL,
    observedBehavior: "Submit retries trigger an abrupt app close after the second tap.",
    suspectedCause: "The mobile submit flow is not handling the retry branch safely.",
    suggestedFix: "Guard duplicate submits and reuse the same response state across retries.",
    confidence: 84,
    createdAt: new Date(now - 1000 * 60 * 6).toISOString(),
  },
];

export const demoCommandCenterChatResponses: Record<string, AgentChatResponse> = {
  "what needs attention?": {
    answer:
      "Audit form not responding needs attention first. It is carrying 25 reports, a high-confidence spike, and direct conversion impact across both Gmail and SDK signals.",
    suggestedActions: [
      "Open the audit issue",
      "Review the latest inspection result",
      "Ship the submit handler patch",
    ],
    suggestedIssueIds: ["audit-form-not-responding"],
    confidence: "high",
    generatedAt: new Date().toISOString(),
    mode: "real",
  },
  "explain last decision": {
    answer:
      "The latest decision focused on the audit form because it is the clearest blocker to lead capture. The signal quality is high, the fix is contained, and the impact is visible immediately after submit.",
    suggestedActions: [
      "Inspect the reasoning trail",
      "Open the audit issue",
      "Review crash-on-submit next",
    ],
    suggestedIssueIds: ["audit-form-not-responding"],
    confidence: "high",
    generatedAt: new Date().toISOString(),
    mode: "real",
  },
  "what should i fix first?": {
    answer:
      "Fix the audit form submit path first, then harden the crash-on-submit retry behavior. That order protects the highest-volume funnel and reduces the next-most-likely escalation.",
    suggestedActions: [
      "Patch the submit handler",
      "Verify success confirmation",
      "Monitor retry crashes",
    ],
    suggestedIssueIds: ["audit-form-not-responding", "app-crash-on-submit"],
    confidence: "high",
    generatedAt: new Date().toISOString(),
    mode: "real",
  },
};

export function getDemoCommandCenterChatResponse(input: string): AgentChatResponse {
  const normalized = String(input || "").trim().toLowerCase();
  return (
    demoCommandCenterChatResponses[normalized] || {
      answer:
        "The system is watching the audit form spike most closely right now. The recommended path is to restore submit handling, confirm persistence, and monitor crash-on-submit after the patch lands.",
      suggestedActions: [
        "Open the top issue",
        "Review the latest inspection",
        "Check predicted risks",
      ],
      suggestedIssueIds: ["audit-form-not-responding"],
      confidence: "high",
      generatedAt: new Date().toISOString(),
      mode: "real",
    }
  );
}

export const demoSuccessMessage = "Data loaded successfully";
