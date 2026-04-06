# GitWise AI — Unified Project Context

---

## 1. Project Overview

GitWise AI is a unified, AI-powered GitHub companion platform that solves five interconnected open-source collaboration problems:

1. Maintainers waste hours triaging noisy, duplicate, and poorly-labelled issues.
2. New contributors cannot find relevant beginner-friendly issues due to missing skill-based filtering.
3. Repository owners lose adoption because README files are incomplete or outdated.
4. Faulty pull requests, bad commits, and toxic comments slip through without automated review.
5. When automated systems do block something, contributors receive no explanation and no pointer to the exact problem.

GitWise AI addresses all five in one platform, powered exclusively by `gpt-oss-120B`, a fully open-source model with no paid API dependencies.

---

## 2. Frontend Pages & What Each Needs from the Backend

### 2.1 Landing Page (`LandingPage.tsx`)

- No API calls — pure marketing page.
- Has a **Connect GitHub** button that triggers the OAuth flow.
- Backend needed: `GET /auth/github` redirect endpoint.

### 2.2 Dashboard (`DashboardPage.tsx`)

Displays:
- **AI status banner** — model name, avg latency, events processed today, webhook health.
- **4 stat cards** with trend arrows: Issues Analysed, PRs Moderated, Blocked PRs, Active Repos.
- **7-day bar chart** — issues triaged vs moderation events per day.
- **System health panel** — AI Inference uptime, Webhook delivery success, avg triage latency, queue backlog.
- **Live activity feed** — 6 most recent events across all event types.
- **Quick actions** — nav shortcuts to Triage, README Gen, Recommender.
- **Monitored repos mini-list** — repo name, open issues, language, webhook active badge.
- **Recent moderation events table** — title, repo, reason, decision badge, time ago.

Backend endpoints needed:
```
GET /dashboard/stats
  Response: {
    issuesAnalysed: number,
    prsModerated: number,
    blockedPRs: number,
    flaggedPRs: number,
    passedPRs: number,
    activeRepos: number,
    readmesGenerated: number,
    recommendationsServed: number,
    modelLatencyMs: number,
    eventsToday: number,
    allWebhooksHealthy: boolean,
    aiUptime: number,           // 0–100 percentage
    webhookDeliveryRate: number, // 0–100 percentage
    queueBacklog: number
  }

GET /dashboard/activity?days=7
  Response: { day: string, issues: number, events: number }[]

GET /dashboard/feed?limit=6
  Response: {
    type: 'block' | 'triage' | 'flag' | 'pass' | 'readme' | 'batch',
    text: string,
    time: string  // ISO timestamp
  }[]
```

### 2.3 Repositories Page (`RepositoriesPage.tsx`)

Displays a list of all imported repos, grouped into Monitored / Not Monitored. Each card shows:
- `fullName` (owner/repo), description, language (with dot colour), stars, forks, open issues
- External link to GitHub
- Toggle button: **Monitor** / **Stop monitoring** (calls watch/unwatch endpoints)

Backend endpoints needed:
```
GET /repos
  Response: Repository[]

POST /repos/{id}/watch
  Response: Repository  (isMonitored: true, webhookActive: true)

DELETE /repos/{id}/watch
  Response: Repository  (isMonitored: false, webhookActive: false)

POST /repos/import
  Response: Repository[]  (fetches from GitHub /user/repos)
```

### 2.4 Issue Triage Page (`IssueTriagePage.tsx`)

Two-panel layout:
- **Left — Analysis form**: title input, body textarea, Analyse button, Reset button.
- **Right — Result panel**: classification badge, duplicate warning, priority bar (0–100), suggested labels, 3 similar issues with similarity %, AI explanation, copy JSON button.
- **Bottom — Triaged issues table**: all triaged issues with classification filter pills, each row shows title, repo, author, labels, classification badge, priority score, state icon.

The frontend currently simulates analysis client-side (`simulateAnalysis`). The backend must replace this.

Backend endpoints needed:
```
POST /issues/analyze
  Body:    { title: string, body: string, repoId?: string }
  Response: {
    classification: IssueClassification,
    priorityScore: number,              // 0–100
    labels: string[],
    similarIssues: {
      title: string,
      repo: string,
      similarity: number,               // 0–100
      url: string
    }[],
    explanation: string,
    isDuplicate: boolean
  }

GET /issues
  Params: ?repoId&classification&state
  Response: TriagedIssue[]

POST /issues/{id}/label
  Body:    { labels: string[] }
  Response: { success: boolean }
```

### 2.5 Moderation Page (`ModerationPage.tsx`)

Displays:
- **3 stat cards**: Blocked count, Flagged count, Passed count.
- **Filter bar**: Decision (ALL / BLOCK / FLAG / PASS), Type (ALL / pull_request / commit / issue_comment / pr_review_comment / issue).
- **Expandable event cards** — each shows:
  - Type icon, title, repo, author avatar, author name, severity dot + label, decision badge, timestamp.
  - Expanded: AI explanation, file path + line range (deep link to GitHub), override button (maintainer can lift a block).

Override action: calls `POST /moderation/{id}/override` and locally updates `overridden: true`, `overriddenBy: string`.

Backend endpoints needed:
```
GET /moderation
  Params: ?repoId&decision&type
  Response: ModerationEvent[]

GET /moderation/{id}
  Response: ModerationEvent

POST /moderation/{id}/override
  Body:    { overriddenBy: string }
  Response: ModerationEvent  (overridden: true)

POST /webhooks/github
  Headers: X-Hub-Signature-256, X-GitHub-Event, X-GitHub-Delivery
  Body:    raw GitHub webhook payload
  Response: { received: true }  — always 200, process async
```

### 2.6 Recommender Page (`RecommenderPage.tsx`)

Two-panel layout:
- **Left — Skill Profile**: toggle pills for Technologies (12 options) and Domains (7 options), experience level selector (Beginner / Intermediate / Advanced), Find Issues button.
- **Right — Results**: ranked `RecommendedIssue[]` cards sorted by `matchScore`, each shows title, repo, labels, difficulty badge, matchScore bar, languages, AI explanation, star count, comment count, bookmark toggle.
- **Bookmarks tab**: shows all bookmarked issues.

The frontend currently simulates scoring client-side. The backend must replace this.

```
POST /prefs
  Body:    { skills: string[], domains: string[], experience: 'beginner'|'intermediate'|'advanced' }
  Response: { saved: true }

GET /recommend
  Params: ?skills=TypeScript,React&domains=Frontend&experience=intermediate
  Response: RecommendedIssue[]  // sorted by matchScore desc

POST /bookmarks
  Body:    { issueId: string }
  Response: { saved: true }

DELETE /bookmarks/{issueId}
  Response: { removed: true }

GET /bookmarks
  Response: RecommendedIssue[]
```

### 2.7 README Generator Page (`ReadmeGeneratorPage.tsx`)

Two-panel layout:
- **Left — Config**: GitHub URL or `owner/repo` input, section toggles (badges, features, installation, usage, apiRef, contributing, license), Generate button.
- **Right — Preview**: tab bar (Preview / Edit / Source), markdown rendered via `react-markdown` + `remark-gfm`, char/line count.
- **Actions panel** (appears after generation): Copy Markdown, Download README.md, Create GitHub PR.

`Create GitHub PR` calls the backend which creates an actual PR on GitHub with the README content.

```
POST /readme/generate
  Body: {
    repoUrl: string,             // e.g. "https://github.com/owner/repo"
    options: {
      badges: boolean,
      features: boolean,
      installation: boolean,
      usage: boolean,
      apiRef: boolean,
      contributing: boolean,
      license: boolean
    }
  }
  Response: {
    content: string,   // full Markdown string
    repoName: string   // "owner/repo"
  }

POST /readme/pr
  Body: {
    repoName: string,
    content: string
  }
  Response: {
    prUrl: string,
    prNumber: number
  }
```

---

## 3. Authentication Flow (Frontend Perspective)

1. User is on `LandingPage` (not authenticated, state = `landing`).
2. Clicks **Connect GitHub** → `onLogin()` is called in `App.tsx`.
3. Currently `onLogin()` just sets `isAuthenticated = true` and navigates to `dashboard` (mock).
4. **Real flow**: clicking Connect GitHub should redirect to `GET /auth/github` on the backend, which redirects to GitHub OAuth. On return, the backend sets a session cookie and redirects to the frontend dashboard URL.
5. On load, the frontend should call `GET /auth/me` to check if the user is already authenticated and restore the session.

```
App.tsx state:
  isAuthenticated: boolean
  page: Page  // 'landing' | 'dashboard' | 'repositories' | 'triage' | 'moderation' | 'recommender' | 'readme'

MOCK_USER shape (UserProfile):
  login: string
  name: string
  avatarUrl: string
  email: string
  publicRepos: number
  followers: number
```

---

## 4. Data Types (TypeScript → Backend contract)

All types are defined in `frontend/src/types/index.ts`. The backend JSON responses **must** match these shapes.

```typescript
// Pages the router understands
type Page = 'landing' | 'dashboard' | 'repositories' | 'triage' | 'moderation' | 'recommender' | 'readme';

type EventDecision = 'PASS' | 'FLAG' | 'BLOCK';
type EventType = 'pull_request' | 'commit' | 'issue_comment' | 'pr_review_comment' | 'issue';
type Severity   = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type IssueClassification = 'BUG' | 'FEATURE_REQUEST' | 'DOCUMENTATION' | 'QUESTION' | 'SPAM' | 'UNCLEAR';

interface Repository {
  id: string;
  name: string;          // short name, e.g. "react"
  owner: string;         // e.g. "facebook"
  fullName: string;      // e.g. "facebook/react"
  url: string;           // GitHub URL
  description: string;
  language: string;      // primary language
  stars: number;
  forks: number;
  isMonitored: boolean;  // user has selected this repo to watch
  webhookActive: boolean;// backend has registered the webhook
  openIssues: number;
  lastUpdated: string;   // ISO 8601
}

interface ModerationEvent {
  id: string;
  type: EventType;
  decision: EventDecision;
  severity: Severity;
  repo: string;          // fullName e.g. "facebook/react"
  prNumber?: number;
  commitHash?: string;
  title: string;
  author: string;
  authorAvatar: string;  // GitHub avatar URL
  reason: string;        // short human reason
  file?: string;         // file path where fault was found
  lineStart?: number;
  lineEnd?: number;
  commitSha?: string;
  timestamp: string;     // ISO 8601
  aiExplanation: string; // full AI-generated explanation
  githubUrl?: string;    // direct link to PR / commit / comment
  overridden: boolean;
  overriddenBy?: string; // login of maintainer who overrode
}

interface TriagedIssue {
  id: string;
  githubId: number;
  repo: string;          // fullName
  title: string;
  body: string;
  classification: IssueClassification;
  priorityScore: number; // 0–100
  labels: string[];
  duplicateOf?: string;  // id of the original issue if duplicate
  isDuplicate: boolean;
  createdAt: string;     // ISO 8601
  state: 'open' | 'closed';
  url: string;
  author: string;
}

interface RecommendedIssue {
  id: string;
  githubId: number;
  title: string;
  repo: string;          // fullName
  url: string;
  labels: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  matchScore: number;    // 0–100
  languages: string[];   // e.g. ["TypeScript", "React"]
  explanation: string;   // AI rationale for the match
  stars: number;
  bookmarked: boolean;
  createdAt: string;     // ISO 8601
  comments: number;
}

interface UserProfile {
  login: string;
  name: string;
  avatarUrl: string;
  email: string;
  publicRepos: number;
  followers: number;
}

interface DashboardStats {
  issuesAnalyzed: number;
  prsModerated: number;
  blockedPRs: number;
  flaggedPRs: number;
  passedPRs: number;
  activeRepos: number;
  readmesGenerated: number;
  recommendationsServed: number;
}
```

---

## 5. Mock Data (Seed Values for Database)

The frontend ships with mock data in `src/data/mockData.ts`. Use these as database seed fixtures.

### MOCK_USER
```json
{ "login": "krypthos-dev", "name": "Krypthos Dev", "avatarUrl": "https://avatars.githubusercontent.com/u/9919?v=4", "email": "dev@krypthos.io", "publicRepos": 42, "followers": 128 }
```

### MOCK_REPOSITORIES (4 repos)
```
facebook/react      — monitored, webhook active, 842 open issues
vercel/next.js      — monitored, webhook active, 3200 open issues
tailwindlabs/tailwindcss — NOT monitored
vitejs/vite         — monitored, webhook NOT active
```

### MOCK_TRIAGED_ISSUES (6 issues)
- BUG · priority 87 — facebook/react · useEffect cleanup runs twice
- FEATURE_REQUEST · priority 72 — vercel/next.js · React Server Components streaming
- DOCUMENTATION · priority 45 — vitejs/vite · update getting started README
- BUG · priority 93 — facebook/react · memory leak with WebSocket
- QUESTION · priority 38 — tailwindlabs/tailwindcss · dark mode system preference
- SPAM · priority 5 — vercel/next.js · "FREE BITCOIN GENERATOR"

### MOCK_MODERATION_EVENTS (5 events)
- BLOCK · CRITICAL — facebook/react PR #4401 · hardcoded API key
- FLAG · HIGH — vercel/next.js commit a3f8e1c · SQL injection risk
- FLAG · MEDIUM — tailwindlabs/tailwindcss issue comment · toxic language (overridden)
- PASS · LOW — vitejs/vite PR #881 · docs-only change
- BLOCK · HIGH — facebook/react PR #4410 · telemetry without consent

### MOCK_RECOMMENDATIONS (4 issues)
- Easy · matchScore 96 — vitejs/vite · update README (bookmarked)
- Easy · matchScore 88 — tailwindlabs/tailwindcss · dark mode docs
- Medium · matchScore 79 — facebook/react · error boundary logging
- Hard · matchScore 65 — vercel/next.js · GraphQL schema validation

---

## 6. GitHub OAuth Scopes Required

```
repo                  Read and write access to repositories
read:user             Read user profile data
user:email            Access user email address
write:discussion      Post comments on issues and pull requests
admin:repo_hook       Create and manage webhooks on repositories
pull_requests         Read and write pull request data
```

---

## 7. Hosting Strategy — Free Tier Only

| Layer | Free Option |
|---|---|
| Frontend | Vercel (free tier) or Netlify |
| Backend API | Render (free tier) or Railway |
| Model Inference | Hugging Face Inference Endpoints (free tier) |
| Vector Database | Qdrant Cloud (free tier) or FAISS in-memory |
| Relational Database | Supabase (free tier — PostgreSQL) |
| Webhooks | Handled by the backend endpoint on Render/Railway |

**Important constraints:**
- Render free backends spin down after inactivity — implement a keep-alive ping.
- Free GPU tiers have latency — queue webhook events and process asynchronously; always return `200 OK` immediately.
- Supabase 500MB limit — store embeddings in Qdrant, not Postgres.


GitWise AI is a unified, AI-powered GitHub companion platform that solves three interconnected open-source collaboration problems in a single product:

- Maintainers waste hours triaging noisy, duplicate, and poorly labeled issues.
- New contributors cannot find relevant beginner-friendly issues due to missing skill-based filtering.
- Repository owners lose adoption because README files are incomplete, inconsistent, or outdated.

Beyond triage and documentation, GitWise AI acts as an active code quality guardian — it monitors Pull Requests, commits, comments, and other GitHub events in real time, stops faulty or policy-violating activity before it merges, and posts clear AI-generated explanations directly on GitHub so contributors always know why something was blocked and where the fault lives in the code.

---

## 2. AI Backend — Open Source Model

**Model:** `gpt-oss-120B` (open-source, self-hostable)

All AI features — classification, duplicate detection, priority scoring, README generation, code moderation, comment analysis, and PR review — are powered exclusively by `gpt-oss-120B`. There is no dependency on any paid proprietary API such as OpenAI or Anthropic.

**Why this matters:**
- Zero per-token cost at runtime.
- Full data privacy — no code or issue content leaves the self-hosted environment.
- The model handles all NLP tasks: embeddings, classification, generation, and code review in a single unified backend.

---

## 3. Hosting Strategy — Free Tier Only

Because there is no paid hosting budget, every service must run on a free hosting tier. The approved stack is:

| Layer | Free Hosting Option |
|---|---|
| Frontend | Vercel (free tier) or Netlify (free tier) |
| Backend API | Render (free tier) or Railway (free tier) |
| Model Inference | Hugging Face Inference Endpoints (free tier) or self-hosted on a free GPU provider such as Google Colab persistent instance or Kaggle |
| Vector Database | Qdrant Cloud (free tier) or FAISS in-memory (no external host needed) |
| Relational Database | Supabase (free tier) or PlanetScale (free tier) |
| GitHub Webhooks | Handled via the backend endpoint deployed on Render or Railway |

**Constraints to keep in mind:**
- Free tier backends on Render will spin down after inactivity — implement a keep-alive ping or warn users about cold start delays.
- Model inference on free GPU tiers may have latency — queue requests and return async job status where needed.
- Supabase free tier has a 500MB database limit — keep embeddings in the vector DB, not the relational DB.

---

## 4. Core Problem Statement

Open-source growth is blocked by five connected failures:

1. Maintainers lose velocity triaging noisy, duplicate, or vague issues.
2. Beginners cannot discover relevant first contributions.
3. Projects lose trust and adoption from poor documentation.
4. Faulty pull requests, bad commits, and toxic or off-topic comments slip through without automated review.
5. When automated systems do block something, contributors receive no explanation and no pointer to the exact location of the problem.

GitWise AI addresses all five in one platform.

---

## 5. Target Users

| User Type | Primary Need |
|---|---|
| Maintainers | Fast issue triage, duplicate detection, faulty PR blocking |
| New Contributors | Personalized first-issue discovery matched to skill level |
| Repository Owners | Auto-generated, high-quality README documentation |
| All Contributors | Clear AI feedback when a PR, commit, or comment is blocked |

---

## 6. GitHub OAuth and Repository Import

### 6.1 OAuth Flow

1. User clicks **Connect GitHub** on the GitWise AI dashboard.
2. App redirects to GitHub OAuth authorization page with the required scopes.
3. GitHub redirects back with an authorization code.
4. Backend exchanges the code for an access token and stores it securely against the user record.
5. User is now authenticated and their GitHub identity is confirmed.

**Required OAuth Scopes**

```
repo                  - Read and write access to repositories
read:user             - Read user profile data
user:email            - Access user email address
write:discussion      - Post comments on issues and pull requests
admin:repo_hook       - Create and manage webhooks on repositories
pull_requests         - Read and write pull request data
```

### 6.2 Repository Import

After OAuth:

1. Backend calls `GET /user/repos` from the GitHub API using the stored token.
2. All repositories (public and private within scope) are fetched and paginated.
3. Each repository is stored in the `Repository` table with metadata: name, owner, URL, primary language, stars, forks, last updated.
4. User selects which repositories to actively monitor.
5. For each selected repository, the backend registers a GitHub Webhook pointing to the GitWise AI webhook endpoint.
6. On first import, the system does a full backfill of existing open issues and pull requests.

---

## 7. Core Functionalities

### 7.1 Issue Intelligence (Triage Engine)

- **Classification:** Each issue is classified into one of: `bug`, `feature request`, `documentation`, `question`, `spam`, or `unclear`.
- **Duplicate Detection:** Issue text is embedded using `gpt-oss-120B` and compared against existing issue embeddings in the vector DB using cosine similarity. Issues above the configured threshold are flagged as potential duplicates.
- **Priority Scoring:** A weighted score is computed as follows:
  - Severity signal: 35%
  - Reproducibility clues: 20%
  - User impact estimate: 25%
  - Freshness and recency: 10%
  - Repository-specific heuristics: 10%
- **Label Suggestions:** Based on classification and priority, the system suggests GitHub labels for maintainer review or applies them automatically via the GitHub API.
- **Auto-comment:** If a duplicate is detected or an issue is classified as spam or unclear, the bot posts a comment on the GitHub issue explaining the finding.

---

### 7.2 AI Code Moderation — Stopping Faulty Activity

This is a primary core feature. GitWise AI actively monitors the following GitHub event types via webhooks and can block or flag them:

**Monitored Event Types**

| GitHub Event | What AI Reviews |
|---|---|
| Pull Request opened or updated | Code diff, commit messages, PR description, linked issue |
| Individual Commits | Commit message quality, code changes, potential secrets or vulnerabilities |
| Issue Comments | Tone, relevance, spam detection, toxic language |
| PR Review Comments | Code-level feedback quality, spam, toxic language |
| Issue Body on submission | Quality, completeness, duplicate check |

**Moderation Decision Flow**

```
GitHub Event Received (Webhook)
        |
        v
Extract relevant content (diff, message, comment text)
        |
        v
Send to gpt-oss-120B moderation pipeline
        |
        v
Decision: PASS | FLAG | BLOCK
        |
   _____|______
  |            |
PASS         BLOCK or FLAG
  |            |
Allow         Post AI explanation comment on GitHub
              |
              v
         If PR: Request Changes (blocking merge)
         If Commit: Mark commit status as "failure"
         If Comment: Post warning reply
              |
              v
         Include direct link to the faulty code block or line
```

**What Triggers a Block**

*Pull Requests:*
- Code introduces obvious security vulnerabilities (hardcoded secrets, SQL injection patterns, exposed credentials).
- PR description is empty or does not reference an issue when the repo policy requires it.
- Commit messages in the PR are non-descriptive (e.g., `"fix"`, `"aaa"`, `"test123"`).
- Code diff contains patterns flagged by the AI as breaking changes without documentation.
- PR targets the wrong base branch (e.g., direct push to `main` when policy requires `develop`).

*Commits:*
- Commit message fails quality standards.
- Commit contains files that match secret or credential patterns (`.env` with values, private keys, API tokens in source files).

*Comments and Issue Bodies:*
- Toxic, harassing, or discriminatory language.
- Spam or off-topic content.
- Issue body is too vague to act on (missing reproduction steps for a bug report).

---

### 7.3 GitHub Notifications When AI Blocks Something

When the AI blocks or flags any activity, it must post a notification directly on GitHub. This is non-negotiable — contributors should never be silently blocked.

**For Blocked Pull Requests**

The bot posts a PR review with status `REQUEST_CHANGES` and a comment structured as:

```
🚫 GitWise AI — Pull Request Blocked

This pull request was automatically stopped by GitWise AI because the 
following issue was detected:

**Reason:** Hardcoded API key detected in source file.

**Faulty Location:**
- File: `src/config/database.js`
- Line: 42
- [View this line on GitHub →](https://github.com/owner/repo/blob/{commit_sha}/src/config/database.js#L42)

**What to do:**
Remove the hardcoded credential and use an environment variable instead. 
Reference: [Managing secrets in GitHub](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

This block was applied automatically. If you believe this is incorrect, 
contact a maintainer to review and override.

— GitWise AI (powered by gpt-oss-120B)
```

**For Flagged Commits**

The bot sets the commit status via the GitHub Commit Status API:
- **State:** `failure`
- **Description:** Short reason (e.g., `"GitWise AI: Non-descriptive commit message detected."`)
- **Target URL:** Link back to the GitWise AI dashboard showing the full explanation.

**For Blocked or Flagged Comments**

The bot replies directly in the comment thread:

```
⚠️ GitWise AI — Comment Flagged

This comment was flagged by GitWise AI for the following reason:

**Reason:** The content appears to violate the repository's code of conduct 
(potentially harmful language detected).

The comment has been noted. A maintainer will review this thread.

— GitWise AI (powered by gpt-oss-120B)
```

---

### 7.4 Redirect to Faulty Code Block on GitHub

When the AI identifies a fault in a specific file and line, it generates a direct deep link to that exact location on GitHub.

**Link Format**

Single line:
```
https://github.com/{owner}/{repo}/blob/{commit_sha}/{file_path}#L{line_number}
```

Line range:
```
https://github.com/{owner}/{repo}/blob/{commit_sha}/{file_path}#L{start_line}-L{end_line}
```

**How It Works**

1. When `gpt-oss-120B` analyzes a PR diff, it returns a structured JSON response that includes the file name, line number, and a short explanation for each identified fault.
2. The backend constructs the GitHub deep link using the PR's head commit SHA, the file path, and the line number from the AI response.
3. This link is embedded in the GitHub comment posted by the bot so the contributor can click directly to the exact line of code.
4. The same link is shown in the GitWise AI dashboard under the PR review panel.

**AI Response Format for Code Issues (Internal)**

```json
{
  "decision": "BLOCK",
  "issues": [
    {
      "type": "security",
      "severity": "critical",
      "file": "src/config/database.js",
      "line_start": 42,
      "line_end": 42,
      "description": "Hardcoded API key detected. This credential will be exposed in the public repository.",
      "suggestion": "Use process.env.API_KEY and add this variable to .env.example without the actual value."
    }
  ]
}
```

---

### 7.5 First Issue Recommender

1. User submits a skill profile: programming languages, frameworks, domains, and experience level.
2. System fetches open issues from the user's connected repositories or a curated public list.
3. Each issue is scored and ranked using:
   - Skill match: 40%
   - Difficulty fit: 25%
   - Label quality (`good first issue`, `help wanted`): 20%
   - Activity freshness: 10%
   - Contributor interest overlap: 5%
4. User receives a ranked list of recommended issues with a match explanation for each.
5. Issues can be bookmarked for later.

---

### 7.6 README Generator

1. User provides a repository URL or selects a connected repo.
2. Parser extracts: primary language, dependencies, folder structure, scripts, existing partial documentation, and open issues as signals.
3. `gpt-oss-120B` generates a full README draft including: project title, description, badges, installation steps, usage examples, API reference (if applicable), contribution guidelines, and license section.
4. Output is returned as a Markdown file available for preview and export.
5. Optional: one-click PR creation to add the generated README directly to the repository.

---

## 8. End-to-End User Flows

**Flow 1 — Maintainer Triage**

```
1. Maintainer connects GitHub via OAuth
2. Selects repositories to monitor
3. System registers webhooks and backfills existing issues
4. New issue is submitted on GitHub
5. Webhook fires → system classifies, scores, and checks for duplicates
6. Labels are applied automatically or suggested for review
7. If issue is a duplicate or spam → bot comments on GitHub with explanation
8. Maintainer views triage results on the GitWise AI dashboard
```

**Flow 2 — PR and Commit Moderation**

```
1. Contributor opens a Pull Request on a monitored repository
2. Webhook fires with the PR payload including the code diff
3. Backend sends the diff to gpt-oss-120B for analysis
4. AI returns a structured decision: PASS, FLAG, or BLOCK
5. If BLOCK:
   a. Bot posts a PR review requesting changes
   b. Comment includes reason, faulty file/line, and a direct GitHub deep link
   c. Merge is blocked until the contributor resolves the issue
6. If PASS: commit status is set to success
7. Dashboard shows the full moderation log for maintainer review
```

**Flow 3 — New Contributor Onboarding**

```
1. User logs in with GitHub OAuth
2. User fills out a skill profile form
3. System fetches candidate issues from connected and public repos
4. Ranking engine scores issues and returns a personalized list
5. User views recommendations with match explanations
6. User can bookmark issues and click through to GitHub
```

**Flow 4 — Documentation Generation**

```
1. User selects a connected repository or enters a public repo URL
2. Parser extracts metadata and project signals
3. gpt-oss-120B generates a complete README draft
4. User previews, edits sections, and exports markdown
5. Optional: system creates a PR on GitHub with the new README
```

---

## 9. System Architecture

```
┌─────────────────────────────────────────────┐
│              GitHub Platform                │
│  Issues · PRs · Commits · Comments          │
│  Webhooks · OAuth · Status API              │
└────────────────────┬────────────────────────┘
                     │ Webhooks + API calls
                     ▼
┌─────────────────────────────────────────────┐
│           GitWise AI Backend                │
│         (FastAPI — free tier host)          │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Auth Service│  │  Webhook Receiver    │ │
│  │ GitHub OAuth│  │  Event Router        │ │
│  └─────────────┘  └──────────────────────┘ │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         AI Orchestration Layer      │   │
│  │                                     │   │
│  │  Issue Triage  │  Code Moderation   │   │
│  │  PR Review     │  README Generator  │   │
│  │  Recommender   │  Comment Analysis  │   │
│  └─────────────────────────────────────┘   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│       gpt-oss-120B Inference Service        │
│   (Hugging Face free endpoint or           │
│    self-hosted on free GPU tier)            │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌──────────────────┐
│ PostgreSQL  │  │  Vector DB       │
│ (Supabase   │  │  (Qdrant Cloud   │
│  free tier) │  │   free tier or   │
│             │  │   FAISS in-mem)  │
└─────────────┘  └──────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│           GitWise AI Frontend               │
│      (React + Tailwind — Vercel free)       │
│                                             │
│  Dashboard: Triage | Moderation | Recommend │
│             README Preview | PR Log         │
└─────────────────────────────────────────────┘
```

---

## 10. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Tailwind CSS, deployed on Vercel free tier | Fast dashboard, free hosting |
| Backend | Python + FastAPI, deployed on Render free tier | Async support, lightweight |
| AI Model | `gpt-oss-120B` via Hugging Face free inference endpoint | Open source, no cost |
| Embeddings | `gpt-oss-120B` embedding output or Sentence-Transformers | Free, no external API needed |
| Vector DB | Qdrant Cloud free tier or FAISS in-memory | Semantic search for duplicates |
| Relational DB | Supabase free tier (PostgreSQL) | Free managed Postgres |
| GitHub Integration | PyGitHub + GitHub REST API + Webhook listener | OAuth, repo import, event handling |
| Markdown Parser | Python `mistune` or `markdown-it` | README preview rendering |

---

## 11. API Design

```
Authentication
POST   /auth/github              GitHub OAuth callback, exchange code for token
GET    /auth/me                  Return current authenticated user

Repository Management
POST   /repos/import             Import all repositories from authenticated GitHub account
GET    /repos                    List all imported and monitored repositories
POST   /repos/{id}/watch         Register webhook and start monitoring a repository
DELETE /repos/{id}/watch         Stop monitoring a repository

Issue Intelligence
POST   /analyze                  Classify issue, score priority, detect duplicates, suggest labels
GET    /issues                   List all tracked issues across monitored repositories
GET    /similar                  Return semantically similar issues for a given issue ID
POST   /label                    Apply suggested labels to a GitHub issue via API

Code Moderation
POST   /webhooks/github          Central webhook receiver for all GitHub events
GET    /moderation/log           Return full moderation history for a repository
GET    /moderation/{event_id}    Return detail for a specific moderation decision including links

Recommendations
POST   /prefs                    Save user skill profile and preferences
GET    /recommend                Return ranked issue recommendations for current user
POST   /bookmark                 Bookmark an issue for later
GET    /bookmarks                Return all bookmarked issues

README Generation
POST   /generate-readme          Generate README from repository URL or imported repo ID
GET    /readme/preview           Return rendered markdown preview
POST   /readme/pr                Create a pull request on GitHub with the generated README

Dashboard
GET    /dashboard                Return combined summary: triage stats, moderation log, recommendations
```

---

## 12. Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id VARCHAR NOT NULL UNIQUE,
  github_handle VARCHAR NOT NULL,
  email VARCHAR,
  github_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Preferences (for recommendation engine)
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  skills_json JSONB,
  interests_json JSONB,
  experience_level VARCHAR,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Repositories
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  github_url VARCHAR NOT NULL,
  language_stats_json JSONB,
  stars INT,
  forks INT,
  webhook_id VARCHAR,
  is_monitored BOOLEAN DEFAULT FALSE,
  last_synced TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Issues
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id),
  github_issue_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  labels_json JSONB,
  state VARCHAR,
  github_url VARCHAR,
  created_at TIMESTAMP,
  synced_at TIMESTAMP DEFAULT NOW()
);

-- Issue Triage Results
CREATE TABLE triage_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id),
  classification VARCHAR,
  priority_score FLOAT,
  duplicate_candidates_json JSONB,
  suggested_labels_json JSONB,
  ai_explanation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Embeddings (reference only — vectors stored in Qdrant)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id),
  qdrant_point_id VARCHAR,
  model_name VARCHAR,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Moderation Events
CREATE TABLE moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id),
  event_type VARCHAR NOT NULL,        -- pull_request | commit | comment | issue
  github_event_id VARCHAR,
  decision VARCHAR NOT NULL,          -- PASS | FLAG | BLOCK
  reason TEXT,
  faulty_file VARCHAR,
  faulty_line_start INT,
  faulty_line_end INT,
  github_deep_link TEXT,
  github_comment_id VARCHAR,
  commit_sha VARCHAR,
  ai_response_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  issue_id UUID REFERENCES issues(id),
  score FLOAT,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookmarks
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  issue_id UUID REFERENCES issues(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- README Drafts
CREATE TABLE readme_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repositories(id),
  content_md TEXT,
  version INT DEFAULT 1,
  github_pr_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 13. Scoring and Ranking Logic

**Issue Priority Score (for Maintainers)**

```
Priority Score = 
  (severity_signal     × 0.35) +
  (reproducibility     × 0.20) +
  (user_impact         × 0.25) +
  (recency             × 0.10) +
  (repo_heuristics     × 0.10)
```

**Recommendation Score (for Contributors)**

```
Recommendation Score =
  (skill_match         × 0.40) +
  (difficulty_fit      × 0.25) +
  (label_quality       × 0.20) +
  (activity_freshness  × 0.10) +
  (interest_overlap    × 0.05)
```

**Moderation Severity Levels**

```
CRITICAL  → Automatic BLOCK, PR merge prevented, commit status failure
HIGH      → BLOCK with mandatory maintainer review to override
MEDIUM    → FLAG, bot comment posted, merge not blocked but warned
LOW       → LOG only, stored in moderation log, no GitHub action taken
```

---

## 14. Engineering Challenges and Mitigations

| Challenge | Mitigation |
|---|---|
| Free tier backend cold starts on Render | Implement a keep-alive endpoint pinged every 10 minutes via a cron job |
| `gpt-oss-120B` inference latency on free GPU | Use async job queues — webhook receives event, queues job, posts result when ready |
| GitHub API rate limits | Cache all repo and issue data locally, batch API calls, use conditional requests with ETags |
| Embedding similarity threshold tuning | Start with cosine similarity threshold of 0.85, expose as a config variable per repo |
| Large repository diffs for PR review | Truncate diffs to the first 500 changed lines for MVP, flag large PRs for manual review |
| Supabase 500MB free tier limit | Store only metadata in Postgres, keep all vectors in Qdrant, keep README drafts compact |
| False positives in code moderation | Every block is reversible by a maintainer — provide an override mechanism and feedback button |
| Webhook delivery failures | Respond to webhooks with HTTP 200 immediately, process asynchronously, implement retry queue |

---

## 15. Edge Cases

- **Repository has zero issues** — gracefully show empty state, still allow README generation.
- **PR diff is empty or binary files only** — skip code analysis, pass with a note.
- **Comment is in a non-English language** — pass to AI with language detection, avoid false blocks.
- **User submits no skills in recommendation flow** — fall back to popularity-based ranking using star count and `good first issue` labels.
- **Very large repository with thousands of issues** — paginate imports, process in batches of 50.
- **Duplicate webhooks delivered twice by GitHub** — use `X-GitHub-Delivery` header as idempotency key.
- **AI model inference endpoint is down** — fail open for code moderation (do not block), log the failure, alert maintainer.
- **Maintainer wants to override an AI block** — provide a maintainer-only override button in the dashboard that dismisses the block and logs the override decision.

---

## 16. Security Considerations

- GitHub OAuth tokens are stored encrypted at rest.
- Webhook payloads are verified using the `X-Hub-Signature-256` header and a shared secret per repository.
- The `gpt-oss-120B` inference endpoint is never exposed directly to the frontend — all model calls go through the backend.
- No code diff content or repository data is logged to external services.
- Free tier Supabase uses row-level security policies scoped to the authenticated user.

---

## 17. MVP Delivery Scope

**Must Have (Day 1)**
- [ ] GitHub OAuth login and full repository import
- [ ] Webhook registration on monitored repositories
- [ ] Issue classification, duplicate detection, and priority scoring
- [ ] PR code moderation — detect, block, and post AI comment on GitHub
- [ ] Deep link to faulty file and line in every block notification
- [ ] Commit message quality check with commit status API
- [ ] README generation from repository metadata
- [ ] Basic dashboard showing triage results, moderation log, and recommendations

**Nice to Have (If Time Allows)**
- [ ] Comment toxicity detection and flagged reply
- [ ] Personalized contributor recommendation feed
- [ ] Bookmarking system for saved issues
- [ ] Editable README preview with Markdown editor
- [ ] One-click PR creation for generated README
- [ ] Maintainer override button for AI blocks
- [ ] Repo health score summary on dashboard

---

## 18. Build Plan

```
Hour 01–03   Project scaffold, monorepo setup, environment config, database migrations
Hour 04–06   GitHub OAuth flow, repository import, webhook registration
Hour 07–10   Issue triage service — classification, duplicate detection, priority scoring
Hour 11–14   PR and commit moderation — webhook handler, gpt-oss-120B integration, GitHub comment posting
Hour 15–16   Deep link generation for faulty code blocks
Hour 17–19   Recommendation engine — skill profile, scoring, ranking
Hour 20–22   README generator — parser, gpt-oss-120B generation, markdown export
Hour 23–24   Frontend dashboard integration, end-to-end testing, demo prep
```

---

## 19. Mandatory Deliverables

- [ ] Full source code in a public GitHub repository (monorepo with `/frontend` and `/backend` folders)
- [ ] `.env.example` file with all required environment variables documented
- [ ] `README.md` with architecture overview, setup instructions runnable in under 10 minutes, and API usage examples
- [ ] Demo script covering all four user flows: triage, moderation with GitHub block notification, recommendation, README generation
- [ ] Sample test data: at least 5 sample issues, 2 sample PRs (one that passes, one that gets blocked), and one repository for README generation

---

## 20. Environment Variables Required

```env
# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=

# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vector Database
QDRANT_URL=
QDRANT_API_KEY=

# AI Model
GPT_OSS_MODEL_ENDPOINT=        # Hugging Face inference endpoint for gpt-oss-120B
GPT_OSS_MODEL_API_KEY=         # Hugging Face token (free account)

# App
FRONTEND_URL=
BACKEND_URL=
SESSION_SECRET=
```

---

## 21. One-Line Pitch

GitWise AI connects to your GitHub via OAuth, imports all your repositories, triages your issues with AI, blocks faulty pull requests and commits before they merge, posts clear explanations with direct links to the exact line of code on GitHub, recommends the right first issues to new contributors, and generates professional README documentation — all running on open-source `gpt-oss-120B` with zero paid infrastructure.
