const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Token storage ───────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('gitwise_token');
export const setToken = (t: string) => localStorage.setItem('gitwise_token', t);
export const clearToken = () => localStorage.removeItem('gitwise_token');

// ── Base fetch ──────────────────────────────────────────────────────────────
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Skip ngrok browser-warning interstitial
    'ngrok-skip-browser-warning': '1',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

const get  = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
const del  = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// ── Auth ────────────────────────────────────────────────────────────────────
export const loginUrl = () => `${API_URL}/auth/github`;

export interface UserProfile {
  login: string;
  name: string;
  avatarUrl: string;
  email: string;
  publicRepos: number;
  followers: number;
}

export const getMe = () => get<UserProfile>('/auth/me');
export const apiLogout = () => post('/auth/logout');

// ── Repositories ────────────────────────────────────────────────────────────
export interface ApiRepo {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  isMonitored: boolean;
  webhookActive: boolean;
  openIssues: number;
  lastUpdated: string;
}

export const getRepos = () => get<ApiRepo[]>('/repos');
export const importRepos = () => post<ApiRepo[]>('/repos/import');
export const watchRepo = (id: string) => post(`/repos/${id}/watch`);
export const unwatchRepo = (id: string) => del(`/repos/${id}/watch`);

// ── Issue Triage ─────────────────────────────────────────────────────────────
export interface AnalyzePayload {
  title: string;
  body: string;
  repoFullName?: string;
  issueNumber?: number;
}

export interface TriageResult {
  id: string;
  classification: string;
  priorityScore: number;
  labels: string[];
  isDuplicate: boolean;
  duplicateOf?: string;
  explanation: string;
  similarIssues: { title: string; repo: string; similarity: number; url: string }[];
}

export const analyzeIssue = (payload: AnalyzePayload) => post<TriageResult>('/issues/analyze', payload);
export const getIssues = () => get<TriageResult[]>('/issues');
export const applyLabels = (id: string, labels: string[]) =>
  post(`/issues/${id}/label`, { labels });

// ── Moderation ───────────────────────────────────────────────────────────────
export interface ApiModerationEvent {
  id: string;
  type: string;
  decision: string;
  severity: string;
  repo: string;
  prNumber?: number;
  commitHash?: string;
  title: string;
  author: string;
  authorAvatar: string;
  reason: string;
  file?: string;
  lineStart?: number;
  lineEnd?: number;
  commitSha?: string;
  timestamp: string;
  aiExplanation: string;
  githubUrl?: string;
  overridden: boolean;
  overriddenBy?: string;
}

export const getModeration = () => get<ApiModerationEvent[]>('/moderation');
export const overrideModeration = (id: string, reason: string) =>
  post(`/moderation/${id}/override`, { reason });

// ── Recommender ──────────────────────────────────────────────────────────────
export interface PrefsPayload {
  skills: string[];
  domains: string[];
  experience: string;
}

export interface ApiRecommendation {
  id: string;
  githubId: number;
  title: string;
  repo: string;
  url: string;
  labels: string[];
  difficulty: string;
  matchScore: number;
  languages: string[];
  explanation: string;
  stars: number;
  bookmarked: boolean;
  createdAt: string;
  comments: number;
}

export const savePrefs = (prefs: PrefsPayload) => post('/prefs', prefs);
export const getRecommendations = () => get<ApiRecommendation[]>('/recommend');
export const addBookmark = (id: string) => post(`/bookmarks`, { issueId: id });
export const removeBookmark = (id: string) => del(`/bookmarks/${id}`);

// ── README Generator ──────────────────────────────────────────────────────────
export interface ReadmePayload {
  repoUrl: string;
  options?: Record<string, boolean>;
}

export interface ReadmeResult {
  content: string;
  repoFullName: string;
}

export const generateReadme = (payload: ReadmePayload) =>
  post<ReadmeResult>('/readme/generate', payload);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  issuesAnalysed: number;
  prsModerated: number;
  blockedPrs: number;
  flaggedPrs: number;
  passedPrs: number;
  activeRepos: number;
  readmesGenerated: number;
  modelLatencyMs: number;
  eventsToday: number;
  allWebhooksHealthy: boolean;
  aiUptime: number;
  webhookDeliveryRate: number;
  queueBacklog: number;
}

export interface FeedEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  severity?: string;
}

export interface ActivityDay {
  day: string;
  issues: number;
  events: number;
}

export const getDashboardStats = () => get<DashboardStats>('/dashboard/stats');
export const getDashboardFeed = (limit = 6) => get<FeedEntry[]>(`/dashboard/feed?limit=${limit}`);
export const getDashboardActivity = (days = 7) => get<ActivityDay[]>(`/dashboard/activity?days=${days}`);
