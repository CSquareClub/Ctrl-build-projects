export type Page =
  | 'landing'
  | 'dashboard'
  | 'repositories'
  | 'triage'
  | 'moderation'
  | 'recommender'
  | 'readme'
  | 'settings';

export type EventDecision = 'PASS' | 'FLAG' | 'BLOCK';
export type EventType =
  | 'pull_request'
  | 'commit'
  | 'issue_comment'
  | 'pr_review_comment'
  | 'issue';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueClassification =
  | 'BUG'
  | 'FEATURE_REQUEST'
  | 'DOCUMENTATION'
  | 'QUESTION'
  | 'SPAM'
  | 'UNCLEAR';

export interface Repository {
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

export interface ModerationEvent {
  id: string;
  type: EventType;
  decision: EventDecision;
  severity: Severity;
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

export interface TriagedIssue {
  id: string;
  githubId: number;
  repo: string;
  title: string;
  body: string;
  classification: IssueClassification;
  priorityScore: number;
  labels: string[];
  duplicateOf?: string;
  isDuplicate: boolean;
  createdAt: string;
  state: 'open' | 'closed';
  url: string;
  author: string;
}

export interface RecommendedIssue {
  id: string;
  githubId: number;
  title: string;
  repo: string;
  url: string;
  labels: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  matchScore: number;
  languages: string[];
  explanation: string;
  stars: number;
  bookmarked: boolean;
  createdAt: string;
  comments: number;
}

export interface UserProfile {
  login: string;
  name: string;
  avatarUrl: string;
  email: string;
  publicRepos: number;
  followers: number;
}

export interface DashboardStats {
  issuesAnalyzed: number;
  prsModerated: number;
  blockedPRs: number;
  flaggedPRs: number;
  passedPRs: number;
  activeRepos: number;
  readmesGenerated: number;
  recommendationsServed: number;
}
