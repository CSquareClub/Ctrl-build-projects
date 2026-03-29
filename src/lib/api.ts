const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  // Get token from Supabase session if available
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const errorText = await response.text();

    try {
      const parsed = JSON.parse(errorText) as { error?: string };
      throw new Error(parsed.error || `API Error: ${response.status}`);
    } catch {
      throw new Error(errorText || `API Error: ${response.status}`);
    }
  }

  return response.json();
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; fullName?: string }) =>
      request<{ user: { id: string | null; email: string } }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  user: {
    me: (token: string) =>
      request<{
        user: { id: string; email: string | null };
        sdkApiKey: string | null;
        sdkStats: {
          totalSignals: number;
          eventCount: number;
          feedbackCount: number;
          errorCount: number;
          latestEventAt: string | null;
          latestUrl: string | null;
        };
      }>("/me", {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  connections: {
    list: (token: string) =>
      request<Connection[]>("/connections", {
        headers: { Authorization: `Bearer ${token}` },
      }),

    startGmail: (token: string) =>
      request<{ authUrl: string }>("/integrations/gmail/start", {
        headers: { Authorization: `Bearer ${token}` },
      }),

    startOutlook: (token: string) =>
      request<{ authUrl: string }>("/integrations/outlook/start", {
        headers: { Authorization: `Bearer ${token}` },
      }),

    connectImap: (
      token: string,
      data: {
        email: string;
        imap_host: string;
        imap_port?: number;
        password: string;
        secure?: boolean;
      }
    ) =>
      request<Connection>("/integrations/imap/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    getImapStatus: (token: string) =>
      request<Connection>("/integrations/imap/status", {
        headers: { Authorization: `Bearer ${token}` },
      }),

    syncImap: (token: string) =>
      request<{ success: boolean; provider: string; imported: number; skipped?: number; lastSyncedAt: string }>(
        "/integrations/imap/sync",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
    
    connect: (
      token: string,
      provider: string,
      data: {
        access_token: string;
        refresh_token?: string;
        metadata?: Record<string, string>;
      }
    ) =>
      request(`/connect/${provider}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    sync: (token: string, provider: string) =>
      request<{ success: boolean; provider: string; imported: number; skipped?: number; lastSyncedAt: string }>(
        `/connections/${provider}/sync`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      ),

    update: (
      token: string,
      id: string,
      data: {
        metadata?: Record<string, string | number | boolean | null>;
        status?: string;
      }
    ) =>
      request<Connection>(`/connections/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),

    disconnect: (token: string, id: string) =>
      request<{ success: boolean }>(`/connections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  social: {
    reddit: (token: string, data: { query: string; count?: number }) =>
      request<{ success: boolean; count: number; duplicatesSkipped: number }>(
        "/integrations/social/reddit",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }
      ),
    search: (token: string, data: { query: string }) =>
      request<{
        success: boolean;
        count: number;
        duplicatesSkipped: number;
        filteredOut: number;
        mentions: Array<{
          title: string;
          snippet: string;
          platform: string;
          link: string;
        }>;
      }>("/integrations/social/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
  },

  issues: {
    list: (token: string) =>
      request<Issue[]>("/issues", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    getById: (token: string, id: string) =>
      request<IssueDetail>(`/issues/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  timeline: {
    list: (token: string) =>
      request<TimelineDay[]>("/timeline", {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  reports: {
    weekly: (token: string, endDate?: string) =>
      request<WeeklyReport>(
        `/reports/weekly${endDate ? `?endDate=${encodeURIComponent(endDate)}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
  },

  tickets: {
    list: (token: string) =>
      request<Ticket[]>("/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    create: (
      token: string,
      data: {
        title: string;
        description: string;
        priority?: TicketPriority;
        linked_issue_id?: string | null;
      }
    ) =>
      request<Ticket>("/tickets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    update: (
      token: string,
      id: string,
      data: { status?: TicketStatus; priority?: TicketPriority }
    ) =>
      request<Ticket>(`/tickets/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      request<{ success: boolean }>(`/tickets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  reminders: {
    list: (token: string) =>
      request<Reminder[]>("/reminders", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    create: (
      token: string,
      data: {
        title: string;
        description?: string;
        remind_at: string;
        linked_issue_id?: string | null;
        linked_ticket_id?: string | null;
      }
    ) =>
      request<Reminder>("/reminders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    update: (token: string, id: string, data: { status: ReminderStatus }) =>
      request<Reminder>(`/reminders/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    delete: (token: string, id: string) =>
      request<{ success: boolean }>(`/reminders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }),
  },

  ai: {
    chat: (token: string, message: string) =>
      request<AiChatResponse>("/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      }),
  },
};

export interface Connection {
  id: string;
  provider: "gmail" | "outlook" | "instagram" | "app-reviews" | "google-play" | "imap";
  metadata: Record<string, string | number | boolean | null> | null;
  created_at: string;
  status?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
}

// Types for API responses
export interface Issue {
  id: string;
  title: string;
  sources: string[];
  reportCount: number;
  category?: "Bug" | "Problem" | "Feature Request" | "Praise" | string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  trend: "increasing" | "decreasing" | "stable";
  trendPercent: number;
  createdAt: string;
}

export interface FeedbackMessage {
  id: string;
  text: string;
  source: string;
  author: string;
  timestamp: string;
  sentiment: "negative" | "neutral" | "positive";
}

export interface IssueDetail extends Issue {
  summary: string;
  feedbackMessages: FeedbackMessage[];
  sourceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  timeline: { date: string; count: number }[];
  suggestedActions: string[];
}

export interface AiChatResponse {
  answer: string;
  suggestedActions: string[];
  suggestedIssueIds: string[];
  confidence: "high" | "medium" | "low" | string;
  generatedAt: string;
  model: string;
  snapshotMode: "demo" | "real" | string;
}

export interface TimelineDay {
  date: string;
  issue_count: number;
  feedback_count: number;
  severity: "green" | "yellow" | "red";
  avg_resolution_time: number | null;
}

export interface WeeklyReport {
  summary: string;
  insights: string[];
  recommendations: string[];
  metrics: {
    total_feedback_count: number;
    total_issue_count: number;
    avg_resolution_time: number | null;
    unresolved_issue_count: number;
  };
  spikes: Array<{
    date: string;
    issue_count: number;
    feedback_count: number;
    severity: string;
  }>;
  top_issues: Array<{
    id: string;
    title: string;
    report_count: number;
    priority: string;
    trend_percent: number;
    category: string;
  }>;
  locations: Array<{
    name: string;
    count: number;
  }>;
  resolution: {
    avg_resolution_time: number | null;
    resolved_count: number;
    unresolved_count: number;
    resolution_efficiency: number | null;
    unresolved_issues: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
    }>;
  };
  derived: {
    spike_days: string[];
    highest_spike_day: {
      date: string;
      issue_count: number;
      feedback_count: number;
    } | null;
    most_reported_issue: {
      id: string;
      title: string;
      report_count: number;
    } | null;
    fastest_growing_issue: {
      id: string;
      title: string;
      trend_percent: number;
    } | null;
    top_locations: Array<{
      name: string;
      count: number;
    }>;
    issues_by_category: Array<{
      name: string;
      count: number;
    }>;
    issues_by_location: Array<{
      name: string;
      count: number;
    }>;
  };
  timeline: TimelineDay[];
  weekStart: string;
  weekEnd: string;
  generation_mode: "ai" | "rules" | string;
}

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "medium" | "high";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  linkedIssueId: string | null;
  linkedIssue: { id: string; title: string; priority: string } | null;
  createdAt: string;
  updatedAt: string;
}

export type ReminderStatus = "pending" | "done";

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  remindAt: string;
  status: ReminderStatus;
  linkedIssueId: string | null;
  linkedTicketId: string | null;
  linkedIssue: { id: string; title: string; priority: string } | null;
  linkedTicket: { id: string; title: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

