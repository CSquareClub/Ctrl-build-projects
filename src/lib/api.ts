import { getSupabaseBrowserClient } from "@/lib/supabase";

function getApiOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8000";
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

const API_BASE = `${getApiOrigin()}/api`;

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  // Get token from Supabase session if available
  const headers: Record<string, string> = {
    ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
  };

  const nextHeaders: Record<string, string> = {
    ...headers,
    ...(options.headers as Record<string, string> | undefined),
  };

  if (
    typeof window !== "undefined" &&
    typeof nextHeaders.Authorization === "string" &&
    nextHeaders.Authorization.startsWith("Bearer ")
  ) {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        nextHeaders.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // Best effort only. If this fails, fall back to the caller-provided token.
    }
  }

  const config: RequestInit = {
    ...options,
    headers: nextHeaders,
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
    syncGitHubSession: (
      token: string,
      data: { providerToken: string }
    ) =>
      request<{
        success: boolean;
        github: {
          username: string | null;
          avatarUrl: string | null;
          id: number | null;
        };
      }>("/auth/github/callback", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

  setup: {
    status: (token: string) =>
      request<SetupStatus>("/setup/status", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    complete: (
      token: string,
      data: {
        productName: string;
        repoOwner?: string;
        repoName?: string;
        websiteUrl?: string;
        inspectionLoginUrl?: string;
        inspectionUsername?: string;
        inspectionPassword?: string;
        inspectionPostLoginSelector?: string;
      }
    ) =>
      request<SetupStatus>("/setup/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
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

    startGoogleCalendar: (token: string) =>
      request<{ authUrl: string }>("/integrations/google-calendar/start", {
        headers: { Authorization: `Bearer ${token}` },
      }),

    getGoogleCalendarStatus: (token: string) =>
      request<{
        connected: boolean;
        email: string | null;
        lastSyncedAt: string | null;
      }>("/integrations/google-calendar/status", {
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

    sync: (
      token: string,
      provider: string,
      data?: Record<string, string | number | boolean | null>
    ) =>
      request<{ success: boolean; provider: string; imported: number; skipped?: number; lastSyncedAt: string }>(
        `/connections/${provider}/sync`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: data ? JSON.stringify(data) : undefined,
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

  github: {
    start: (token: string, redirectTo?: string) =>
      request<{ authUrl: string }>(
        `/integrations/github/start${
          redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""
        }`,
        {
        headers: { Authorization: `Bearer ${token}` },
        }
      ),
    status: (token: string) =>
      request<GitHubConnectionStatus>("/integrations/github/status", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    repos: (token: string) =>
      request<{ repos: GitHubRepository[] }>("/integrations/github/repos", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    structure: (
      token: string,
      params?: { repoOwner?: string; repoName?: string; refresh?: boolean }
    ) => {
      const query = new URLSearchParams(
        Object.entries({
          repoOwner: params?.repoOwner || "",
          repoName: params?.repoName || "",
          refresh: params?.refresh ? "1" : "",
        }).filter(([, value]) => value)
      ).toString();

      return request<{ structure: RepoStructure }>(
        `/integrations/github/structure${query ? `?${query}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    mappings: (token: string) =>
      request<{
        mappings: RepoMapping[];
        settings: GitHubWorkspaceSettings;
      }>("/integrations/github/mappings", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    selectRepo: (token: string, repoOwner: string, repoName: string) =>
      request<{
        repository: {
          owner: string | null;
          name: string | null;
          defaultBranch: string | null;
        };
      }>("/integrations/github/repository", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ repoOwner, repoName }),
      }),
    saveMapping: (
      token: string,
      issueType: string,
      repoOwner: string,
      repoName: string
    ) =>
      request<{ mapping: RepoMapping }>("/integrations/github/mappings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ issueType, repoOwner, repoName }),
      }),
    deleteMapping: (token: string, issueType: string) =>
      request<{ success: boolean }>(
        `/integrations/github/mappings/${encodeURIComponent(issueType)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
    updateSettings: (token: string, codeInsightsEnabled: boolean) =>
      request<{ settings: GitHubWorkspaceSettings }>(
        "/integrations/github/settings",
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ codeInsightsEnabled }),
        }
      ),
    automations: (token: string) =>
      request<{
        automations: GitHubAutomationRun[];
        repository?: {
          owner: string | null;
          name: string | null;
          defaultBranch: string | null;
        };
      }>("/integrations/github/automations", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    runAutomation: (
      token: string,
      type: string,
      data?: {
        repoOwner?: string;
        repoName?: string;
        defaultBranch?: string;
        localRepoPath?: string;
        changedFiles?: string[];
        createPullRequest?: boolean;
      }
    ) =>
      request<{
        success: boolean;
        automation: GitHubAutomationRun;
        result: GitHubAutomationResult;
      }>(`/integrations/github/automations/${encodeURIComponent(type)}/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data || {}),
      }),
    startAnalysis: (
      token: string,
      data: { code: string; source?: string; language?: string; filePath?: string }
    ) =>
      request<CodeAnalysisJobStartResponse>("/code/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    getAnalysisResult: (token: string, jobId: string) =>
      request<CodeAnalysisJobStatusResponse>(`/code/result/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    generateFix: (
      token: string,
      data: {
        code: string;
        language?: string;
        filePath?: string;
        issue?: {
          title?: string;
          severity?: string;
          detail?: string;
          startLine?: number | null;
          endLine?: number | null;
        };
      }
    ) =>
      request<CodeAutoFixResponse>("/code/fix", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    createCodePullRequest: (
      token: string,
      data: {
        patch: string;
        repoOwner: string;
        repoName: string;
        baseBranch?: string;
        filePath?: string;
        title?: string;
        body?: string;
        confidence?: number;
        impact?: string | null;
        issue?: {
          title?: string;
          severity?: string;
          detail?: string;
        };
        explanation?: {
          what?: string;
          why?: string;
          impact?: string;
          fix?: string;
        };
      }
    ) =>
      request<CodeInsightPullRequestResult>("/code/pull-request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    repoFile: (
      token: string,
      data: {
        repoOwner: string;
        repoName: string;
        path: string;
        ref?: string;
      }
    ) =>
      request<{
        path: string;
        content: string;
        size: number;
        sha: string;
        language: string;
        lineCount: number;
      }>("/code/repo-file", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    generateTests: (
      token: string,
      data: {
        code: string;
        language?: string;
        repoOwner?: string;
        repoName?: string;
        repoPath?: string;
        ref?: string;
        issue?: {
          title?: string;
          severity?: string;
          detail?: string;
          startLine?: number | null;
          endLine?: number | null;
        };
        analysis?: Partial<CodeRiskAnalysisResponse> | null;
      }
    ) =>
      request<CodeGeneratedTestsResponse>("/tests/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    runTests: (
      token: string,
      data: {
        code: string;
        testCode?: string;
        language?: string;
        repoOwner?: string;
        repoName?: string;
        repoPath?: string;
        defaultBranch?: string;
      }
    ) =>
      request<CodeTestRunResponse>("/tests/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    startSelfHeal: (
      token: string,
      data: {
        code: string;
        testCode?: string;
        language?: string;
        issue?: {
          title?: string;
          severity?: string;
          detail?: string;
          startLine?: number | null;
          endLine?: number | null;
        };
      }
    ) =>
      request<SelfHealJobStatusResponse>("/self-heal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    getSelfHealResult: (token: string, jobId: string) =>
      request<SelfHealJobStatusResponse>(`/self-heal/${jobId}`, {
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

  inspect: {
    start: (
      token: string,
      data: {
        url: string;
        issue?: string;
        issueId?: string;
        jobType?: string;
        context?: {
          page?: string;
          steps?: unknown[];
        };
      }
    ) =>
      request<{
        success: boolean;
        message: string;
        jobId?: string | null;
        inspectionId?: string | null;
      }>("/inspect/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    activity: (
      token: string,
      params?: { issueId?: string; limit?: number }
    ) => {
      const query = new URLSearchParams(
        Object.entries({
          issueId: params?.issueId || "",
          limit: params?.limit ? String(params.limit) : "",
        }).filter(([, value]) => value)
      ).toString();

      return request<{ activity: InspectionActivity[] }>(
        `/inspect/activity${query ? `?${query}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    results: (
      token: string,
      params?: { issueId?: string; limit?: number }
    ) => {
      const query = new URLSearchParams(
        Object.entries({
          issueId: params?.issueId || "",
          limit: params?.limit ? String(params.limit) : "",
        }).filter(([, value]) => value)
      ).toString();

      return request<{ results: InspectionResult[] }>(
        `/inspect/results${query ? `?${query}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
  },

  mobile: {
    status: (token: string, appId?: string) =>
      request<{
        apps: MobileApp[];
        inspections: MobileInspection[];
      }>(`/mobile/status${appId ? `?appId=${encodeURIComponent(appId)}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    results: (token: string, appId?: string) =>
      request<{ results: MobileInspectionResult[] }>(
        `/mobile/results${appId ? `?appId=${encodeURIComponent(appId)}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
    activity: (token: string, limit?: number, appId?: string) => {
      const query = new URLSearchParams(
        Object.entries({
          limit: limit ? String(limit) : "",
          appId: appId || "",
        }).filter(([, value]) => value)
      ).toString();

      return request<{ activity: InspectionActivity[] }>(
        `/mobile/activity${query ? `?${query}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    connect: (token: string, formData: FormData) =>
      request<{
        success: boolean;
        app: MobileApp;
      }>("/mobile/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }),
    inspect: (
      token: string,
      data: {
        appId?: string;
        issue?: string;
        steps?: unknown[];
      }
    ) =>
      request<{
        success: boolean;
        message: string;
        jobId?: string | null;
        inspection?: MobileInspection | null;
      }>("/mobile/inspect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
  },

  mobileInspect: {
    start: (
      token: string,
      data: {
        appId?: string;
        issue?: string;
        steps?: unknown[];
      }
    ) =>
      request<{
        success: boolean;
        message: string;
        jobId?: string | null;
        inspection?: MobileInspection | null;
      }>("/mobile/inspect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    activity: (
      token: string,
      params?: { limit?: number; appId?: string }
    ) => {
      const query = new URLSearchParams(
        Object.entries({
          limit: params?.limit ? String(params.limit) : "",
          appId: params?.appId || "",
        }).filter(([, value]) => value)
      ).toString();

      return request<{ activity: InspectionActivity[] }>(
        `/mobile/activity${query ? `?${query}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    results: (
      token: string,
      params?: { appId?: string; limit?: number }
    ) => {
      const query = new URLSearchParams(
        Object.entries({
          appId: params?.appId || "",
          limit: params?.limit ? String(params.limit) : "",
        }).filter(([, value]) => value)
      ).toString();

      return request<{ results: MobileInspectionResult[] }>(
        `/mobile/results${query ? `?${query}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
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

  agent: {
    status: (token: string) =>
      request<AgentStatus>("/agent/status", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    actions: (token: string) =>
      request<AgentAction[]>("/agent/actions", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    confidence: (token: string, issueId: string) =>
      request<AgentConfidenceResult>(`/agent/confidence/${issueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    anomalies: (token: string) =>
      request<AgentAnomaly[]>("/agent/anomalies", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    predictions: (token: string) =>
      request<AgentPrediction[]>("/agent/predictions", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    trends: (token: string) =>
      request<AgentTrend[]>("/agent/trends", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    priority: (token: string, issueId: string) =>
      request<AgentPriorityResult>(`/agent/priority/${issueId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    executiveSummary: (token: string) =>
      request<AgentExecutiveSummary>("/agent/executive-summary", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    chat: (token: string, message: string) =>
      request<AgentChatResponse>("/agent/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      }),
    feedbackAction: (
      token: string,
      data: { issue_type: string; action: "accept" | "reject" | "edit" }
    ) =>
      request<{
        success: boolean;
        learningStats: AgentLearningStats;
      }>("/agent/feedback-action", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    updateSettings: (token: string, enabled: boolean) =>
      request<AgentStatus>("/agent/settings", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled }),
      }),
  },

  notifications: {
    list: (token: string) =>
      request<{
        notifications: Notification[];
        unreadCount: number;
      }>("/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    markRead: (token: string, ids: string[]) =>
      request<{
        success: boolean;
        notifications: Notification[];
      }>("/notifications/read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      }),
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

  collaboration: {
    workspaces: (token: string) =>
      request<{
        workspaces: WorkspaceSummary[];
        activeWorkspace: WorkspaceSummary | null;
      }>("/collaboration/workspaces", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    createWorkspace: (token: string, name: string) =>
      request<{ workspace: Workspace }>(`/collaboration/workspaces`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      }),
    joinWorkspace: (token: string, inviteCode: string) =>
      request<{ workspace: Workspace }>(`/collaboration/workspaces/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inviteCode }),
      }),
    updateMemberRole: (
      token: string,
      workspaceId: string,
      userId: string,
      role: WorkspaceRole
    ) =>
      request<{ member: WorkspaceMember }>(`/collaboration/workspaces/members`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspaceId, userId, role }),
      }),
    dashboard: (token: string, workspaceId?: string | null) =>
      request<WorkspaceDashboard>(
        `/collaboration/dashboard${
          workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""
        }`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
    issue: (token: string, issueId: string, workspaceId?: string | null) =>
      request<IssueCollaboration>(
        `/collaboration/issues/${issueId}${
          workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""
        }`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      ),
    assignIssue: (
      token: string,
      workspaceId: string,
      issueId: string,
      assigneeUserId: string
    ) =>
      request<{ assignment: IssueAssignment }>(`/collaboration/issues/assign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspaceId, issueId, assigneeUserId }),
      }),
    addComment: (
      token: string,
      workspaceId: string,
      issueId: string,
      body: string
    ) =>
      request<{ comment: IssueComment }>(`/collaboration/issues/comment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workspaceId, issueId, body }),
      }),
    createApproval: (
      token: string,
      payload: {
        workspaceId: string;
        issueId: string;
        actionType: string;
        reasoning?: string;
        payload?: Record<string, unknown>;
      }
    ) =>
      request<{ approval: ApprovalRequest }>(`/collaboration/approvals`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }),
    updateApproval: (
      token: string,
      approvalId: string,
      status: "approved" | "rejected"
    ) =>
      request<{ approval: ApprovalRequest }>(
        `/collaboration/approvals/${approvalId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status }),
        }
      ),
  },

  ai: {
    chat: (token: string, message: string) =>
      request<AiChatResponse>("/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      }),
  },

  codeAgent: {
    analyzeIssue: (
      token: string,
      issueId: string,
      data?: { repoOwner?: string; repoName?: string }
    ) =>
      request<CodeInsightResult>(`/agent-code/issues/${issueId}/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data || {}),
      }),
    chat: (
      token: string,
      issueId: string,
      data: {
        message?: string;
        action?: string;
        filePath?: string;
        repoOwner?: string;
        repoName?: string;
      }
    ) =>
      request<GitHubAssistantResponse>(`/agent-code/issues/${issueId}/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }),
    createPullRequest: (
      token: string,
      issueId: string,
      data: {
        patch: string;
        title?: string;
        body?: string;
        prDescription?: CodeInsightPullRequestDraft;
        generatedTest?: CodeInsightGeneratedTest;
        baseBranch?: string;
        repoOwner?: string;
        repoName?: string;
      }
    ) =>
      request<CodeInsightPullRequestResult>(
        `/agent-code/issues/${issueId}/pull-request`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }
      ),
    validatePatch: (
      token: string,
      issueId: string,
      data: {
        patch: string;
        repoOwner?: string;
        repoName?: string;
        generatedTest?: CodeInsightGeneratedTest;
      }
    ) =>
      request<CodeInsightValidationResult>(
        `/agent-code/issues/${issueId}/validate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        }
      ),
  },
};

export interface Connection {
  id: string;
  provider:
    | "gmail"
    | "google_calendar"
    | "github"
    | "outlook"
    | "instagram"
    | "app-reviews"
    | "google-play"
    | "imap";
  metadata: Record<string, string | number | boolean | null> | null;
  created_at: string;
  status?: string | null;
  last_synced_at?: string | null;
  last_error?: string | null;
  expiry?: string | null;
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
  createdByAgent?: boolean;
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
  createdByAgent?: boolean;
  linkedIssue: { id: string; title: string; priority: string } | null;
  linkedTicket: { id: string; title: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAction {
  id: string;
  userId: string;
  agentId: string;
  actionType: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AgentStatus {
  enabled: boolean;
  state: "active" | "processing" | "idle" | string;
  lastRunAt: string | null;
  latestBanner: string | null;
  latestAction: AgentAction | null;
  actions: AgentAction[];
  listening: boolean;
}

export interface AgentLearningStats {
  id?: string;
  user_id?: string;
  issue_type: string;
  total_cases: number;
  accepted_count: number;
  rejected_count: number;
  edited_count: number;
  last_confidence?: number | null;
  last_updated: string;
}

export type WorkspaceRole = "owner" | "admin" | "developer" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  inviteCode: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary {
  workspace: Workspace;
  role: WorkspaceRole;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  actorUserId: string | null;
  actorType: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface IssueAssignment {
  id: string;
  workspaceId: string;
  issueId: string;
  assigneeUserId: string | null;
  assignedByUserId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignee: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface IssueComment {
  id: string;
  workspaceId: string;
  issueId: string;
  authorUserId: string | null;
  body: string;
  isAi: boolean;
  createdAt: string;
  author: {
    id: string | null;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface ApprovalRequest {
  id: string;
  workspaceId: string;
  issueId: string | null;
  requestedByType: string;
  requestedByUserId: string | null;
  actionType: string;
  status: "pending" | "approved" | "rejected" | string;
  payload: Record<string, unknown>;
  reasoning: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  executedTicketId?: string | null;
  executedReminderId?: string | null;
}

export interface WorkspaceDashboardIssue {
  id: string;
  userId: string;
  title: string;
  summary: string;
  priority: string;
  reportCount: number;
  trendPercent: number;
  createdAt: string;
}

export interface WorkspaceDashboard {
  workspace: Workspace;
  role: WorkspaceRole;
  members: WorkspaceMember[];
  activity: WorkspaceActivity[];
  approvals: ApprovalRequest[];
  issues: WorkspaceDashboardIssue[];
}

export interface SetupStatus {
  complete: boolean;
  productName: string;
  suggestedProductName: string;
  websiteUrl?: string;
  inspectionAccess?: {
    enabled: boolean;
    loginUrl?: string;
    username?: string;
    postLoginSelector?: string;
    passwordConfigured?: boolean;
  };
  repository: {
    owner: string;
    name: string;
  } | null;
  githubConnected: boolean;
}

export interface IssueCollaboration {
  workspace: Workspace;
  role: WorkspaceRole;
  issue: WorkspaceDashboardIssue;
  members: WorkspaceMember[];
  assignments: IssueAssignment[];
  comments: IssueComment[];
  approvals: ApprovalRequest[];
  activity: WorkspaceActivity[];
}

export interface AgentConfidenceResult {
  confidence_score: number;
  confidence_level: "low" | "medium" | "high" | string;
  reasoning: string;
  issue_type: string;
  metrics: {
    frequency_count: number;
    source_count: number;
    similarity_score: number;
    acceptance_rate: number;
  };
}

export interface AgentAnomaly {
  issue_type: string;
  issue_type_label: string;
  spike_detected: boolean;
  spike_level: "low" | "medium" | "high" | "none" | string;
  baseline_hourly_rate: number;
  current_hourly_rate: number;
  last_hour_count: number;
  last_six_hours_count: number;
  spike_ratio: number;
  trend_growth_percent?: number;
}

export interface AgentPrediction {
  issue_type: string;
  issue_type_label: string;
  escalating: boolean;
  current_window_count: number;
  previous_window_count: number;
  trend_delta: number;
  repeated_within_short_interval: boolean;
  prediction: string;
  confidence?: number;
}

export interface AgentTrend {
  issue_type: string;
  issue_type_label: string;
  frequency_count: number;
  resolution_time_hours: number;
  trend_direction: "up" | "down" | "stable" | string;
  trend_growth_percent: number;
  summary: string;
}

export interface AgentPriorityResult {
  issue_id: string;
  priority_score: number;
  priority_level: "critical" | "high" | "medium" | "low" | string;
  reasoning: string;
  confidence: {
    score: number;
    level: "low" | "medium" | "high" | string;
    reasoning: string;
  };
  anomaly: AgentAnomaly;
  trend: AgentTrend;
  prediction: AgentPrediction;
  actions: string[];
  execution_mode: "observe" | "suggest" | "auto" | string;
}

export interface AgentChatResponse {
  answer: string;
  suggestedActions: string[];
  suggestedIssueIds: string[];
  confidence: "high" | "medium" | "low" | string;
  generatedAt: string;
  mode: "demo" | "real" | string;
}

export interface AgentMemoryHighlight {
  id: string;
  memoryType: "issue" | "action" | "decision" | "chat" | string;
  content: Record<string, unknown>;
  importanceScore: number;
  createdAt: string;
}

export interface InspectionActivity {
  id: string;
  message: string;
  status: "queued" | "running" | "success" | "error" | string;
  timestamp: string;
  issueId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface InspectionResult {
  id: string;
  userId?: string;
  projectId?: string | null;
  issueId?: string | null;
  issue: string;
  url?: string | null;
  observedBehavior: string;
  suspectedCause: string;
  suggestedFix: string;
  confidence: number;
  rawData?: Record<string, unknown> | null;
  createdAt: string;
}

export interface MobileApp {
  id: string;
  userId?: string;
  appName: string;
  packageName?: string | null;
  appUrl?: string | null;
  uploadUrl?: string | null;
  platform?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface MobileInspection {
  id: string;
  userId: string;
  appId: string;
  issue: string;
  status: "queued" | "running" | "completed" | "failed" | string;
  resultJson?: Record<string, unknown> | null;
  createdAt: string;
}

export interface MobileInspectionResult {
  id: string;
  userId?: string;
  projectId?: string | null;
  issueId?: string | null;
  issue: string;
  deviceName?: string | null;
  platformName?: string | null;
  platformVersion?: string | null;
  appUrl?: string | null;
  observedBehavior: string;
  suspectedCause: string;
  suggestedFix: string;
  confidence: number;
  rawData?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AgentExecutiveSummary {
  generatedAt: string;
  mode: "demo" | "real" | string;
  summary: string;
  topIssues: Array<{
    id: string;
    title: string;
    priority: string;
    reportCount: number;
    trendPercent: number;
  }>;
  actionsTaken: Array<{
    id: string;
    actionType: string;
    reason: string;
    createdAt: string;
  }>;
  risks: string[];
  recommendations: string[];
  memoryHighlights: AgentMemoryHighlight[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GitHubConnectionStatus {
  connected: boolean;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  codeInsightsEnabled?: boolean;
  repository: {
    owner: string | null;
    name: string | null;
    defaultBranch: string | null;
  } | null;
  connectedAt: string | null;
}

export interface GitHubRepository {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  permissions: Record<string, boolean>;
  updatedAt: string;
}

export interface GitHubWorkspaceSettings {
  codeInsightsEnabled: boolean;
}

export interface GitHubAutomationResult {
  issues: Array<{
    title: string;
    detail?: string;
    severity?: string;
    confidence?: number;
    explanation?: string;
    filePath?: string | null;
  }>;
  patches: Array<{
    path?: string;
    suggestedTestPath?: string;
    confidence?: number;
  }>;
  fixApplied?: boolean;
  testResults?: {
    before: {
      lint: string;
      test: string;
    };
    after: {
      lint: string;
      test: string;
      build: string;
    };
  };
  confidence: number;
  logs: string[] | string;
  summary: string;
  commit?: {
    branchName?: string | null;
    commitSha?: string | null;
    changedPaths?: string[];
  } | null;
  prUrl?: string | null;
}

export interface GitHubAutomationRun {
  type: "codeRiskScan" | "testGapDetection" | "regressionCheck" | "codeQualityPipeline" | string;
  name: string;
  description: string;
  status: "idle" | "running" | "success" | "failed" | string;
  lastRun: string | null;
  issuesFound: number;
  summary: string | null;
  branchName: string | null;
  commitSha: string | null;
  prUrl: string | null;
  changedFiles: string[];
  logs: string[];
}

export interface RepoMapping {
  id: string;
  user_id: string;
  issue_type: string;
  repo_owner: string;
  repo_name: string;
  repo_default_branch: string | null;
  updated_at: string;
}

export interface RepoStructureModule {
  module: string;
  confidence: number;
  matchedKeywords: string[];
}

export interface RepoStructure {
  repoOwner: string;
  repoName: string;
  defaultBranch: string;
  modules: RepoStructureModule[];
  techStack: string[];
  keyFiles: string[];
  fileCount: number;
  analyzedAt: string | null;
}

export interface CodeRiskAnalysisResponse {
  risk_score: number;
  confidence: number;
  issues: Array<{
    title: string;
    source: string;
    severity: "low" | "medium" | "high" | string;
    detail: string;
    startLine: number | null;
    endLine: number | null;
    location: {
      line: number;
      column: number;
    } | null;
  }>;
  suggestions: string[];
  meta: {
    parser: string;
    parse_mode: string;
    ast_issue_count: number;
    llm_issue_count: number;
    llm_fallback: boolean;
    llm_timed_out: boolean;
    complexity_signals: number;
  };
  patch?: CodeAutoFixResponse | null;
  explanation?: {
    what: string;
    why: string;
    impact: string;
    fix: string;
    targeted_lines?: {
      start: number;
      end: number;
    };
    preview?: string;
  } | null;
  fixSummary?: string | null;
  impact?: "low" | "medium" | "high" | "critical" | string | null;
  topIssue?: {
    title: string;
    source: string;
    severity: "low" | "medium" | "high" | string;
    detail: string;
    startLine: number | null;
    endLine: number | null;
    location: {
      line: number;
      column: number;
    } | null;
  } | null;
  completedAt?: string | null;
}

export interface CodeAnalysisJobStartResponse {
  jobId: string;
  status: string;
  result?: CodeRiskAnalysisResponse | null;
  mode?: "inline" | "queue" | string;
}

export interface CodeAnalysisJobStatusResponse {
  id: string;
  status: "waiting" | "active" | "completed" | "failed" | "delayed" | string;
  result: CodeRiskAnalysisResponse | null;
  error: string | null;
  createdAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
}

export interface CodeGeneratedTestsResponse {
  framework: string;
  summary: string;
  testCode: string;
  source: string;
}

export interface CodeTestRunResponse {
  status: "passed" | "failed" | string;
  passed: number;
  failed: number;
  total: number;
  failures: Array<{
    name: string;
    message: string;
  }>;
  logs: string;
}

export interface SelfHealAttempt {
  attempt: number;
  status: "failed" | "passed" | string;
  summary: string;
  passed: number;
  failed: number;
  logs: string;
  confidence: number;
  fixSummary: string | null;
}

export interface SelfHealResult {
  success: boolean;
  attempts: SelfHealAttempt[];
  finalFix: CodeAutoFixResponse | null;
  logs: string;
  analysis: CodeRiskAnalysisResponse | null;
  generatedTests: CodeGeneratedTestsResponse | null;
  finalTestResult: CodeTestRunResponse | null;
  completedAt: string | null;
}

export interface SelfHealJobStatusResponse {
  id: string;
  status: "waiting" | "active" | "completed" | "failed" | string;
  progress: {
    phase?: string;
    message?: string;
    attempt?: number;
    attempts?: SelfHealAttempt[];
  } | null;
  result: SelfHealResult | null;
  error: string | null;
  createdAt: string | null;
  processedAt: string | null;
  completedAt: string | null;
}

export interface CodeAutoFixResponse {
  original: string;
  updated: string;
  patch: string;
  target: {
    nodeType: string;
    startLine: number;
    endLine: number;
    contextCode: string;
    severity: string;
  };
  confidence: number;
  explanation: {
    what: string;
    why: string;
    impact: string;
    fix: string;
    targeted_lines: {
      start: number;
      end: number;
    };
    preview: string;
  };
  meta: {
    llm_fallback: boolean;
    llm_timed_out: boolean;
    syntax_safe: boolean;
  };
}

export interface CodeInsightFile {
  path: string;
  startLine: number;
  endLine: number;
  snippet: string;
}

export interface CodeInsightResult {
  issue: {
    id: string;
    title: string;
    summary: string;
    description: string;
    priority: string;
  };
  repository: {
    owner: string;
    name: string;
    defaultBranch: string;
  };
  repositorySource?: "primary" | "mapping" | "override" | string;
  issueType?: string;
  keywords: string[];
  files: CodeInsightFile[];
  totalLines: number;
  possibleCauses?: string[];
  selectedRootCause?: string;
  rootCause: string;
  rootCauseConfidence?: number;
  patchConfidence?: number;
  reasoningSummary?: string;
  alternativeFixes?: CodeInsightAlternativeFix[];
  prDescription?: CodeInsightPullRequestDraft;
  generatedTest?: CodeInsightGeneratedTest | null;
  targetFiles?: string[];
  changedFileCount?: number;
  changedLineCount?: number;
  patch: string;
  model: string;
  generatedAt: string;
}

export interface CodeInsightAlternativeFix {
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  rank: number;
  recommended: boolean;
}

export interface CodeInsightPullRequestDraft {
  title: string;
  summary: string;
  rootCause: string;
  changes: string[];
  impact: string;
  confidence: number;
}

export interface CodeInsightGeneratedTest {
  path: string;
  content: string;
  rationale: string;
  validationFocus: string;
  frameworkHint: string | null;
  model?: string;
}

export interface CodeInsightValidationSummary {
  status: "passed" | "failed" | "inconclusive" | string;
  summary: string;
  touchedFiles?: string[];
  generatedTestPath?: string | null;
  command?: string | null;
  logs?: string | null;
  installLog?: string | null;
}

export interface CodeInsightPullRequestResult {
  success: boolean;
  branchName: string;
  baseBranch: string;
  repository: {
    owner: string;
    name: string;
  };
  pullRequest?: {
    id: number;
    number: number;
    url: string;
    title: string;
  };
  prDescription?: {
    title: string;
    body: string;
  };
  generatedTest?: CodeInsightGeneratedTest | null;
  validationSummary?: CodeInsightValidationSummary | null;
  ciStatus?: {
    status: "pending" | "passed" | "failed" | string;
    summary: string;
    checks: Array<{
      name: string;
      status: string;
      conclusion: string | null;
      url: string | null;
    }>;
  };
  prNumber?: number;
  prUrl?: string;
  prTitle?: string;
}

export interface CodeInsightValidationResult {
  success: boolean;
  generatedTest: CodeInsightGeneratedTest | null;
  validationSummary: CodeInsightValidationSummary;
}

export interface GitHubAssistantResponse {
  answer: string;
  quickReplies: string[];
  references: {
    repository?: {
      owner: string;
      name: string;
      defaultBranch?: string;
    };
    filePath?: string | null;
    issueId?: string | null;
  };
  generatedAt: string;
}

