# GitWise AI — System Architecture

---

## High-Level Architecture

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
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         Dashboard API               │   │
│  │  /dashboard/stats                   │   │
│  │  /dashboard/activity                │   │
│  │  /dashboard/feed                    │   │
│  └─────────────────────────────────────┘   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│       gpt-oss-120B Inference Service        │
│   (Hugging Face free endpoint or            │
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
│  React 19 + Tailwind v4 — Vercel free       │
│                                             │
│  Landing → Dashboard → Repos → Triage       │
│  Moderation → Recommender → README Gen      │
└─────────────────────────────────────────────┘
```

---

## Frontend → Backend API Map

Every frontend page and what it needs from the backend:

| Page | Backend Calls |
|---|---|
| LandingPage | `GET /auth/github` (OAuth redirect) |
| DashboardPage | `GET /dashboard/stats`, `GET /dashboard/activity?days=7`, `GET /dashboard/feed?limit=6` |
| RepositoriesPage | `GET /repos`, `POST /repos/import`, `POST /repos/{id}/watch`, `DELETE /repos/{id}/watch` |
| IssueTriagePage | `POST /issues/analyze`, `GET /issues`, `POST /issues/{id}/label` |
| ModerationPage | `GET /moderation`, `GET /moderation/{id}`, `POST /moderation/{id}/override`, `POST /webhooks/github` |
| RecommenderPage | `POST /prefs`, `GET /recommend`, `POST /bookmarks`, `DELETE /bookmarks/{id}`, `GET /bookmarks` |
| ReadmeGeneratorPage | `POST /readme/generate`, `POST /readme/pr` |

---

## Component Architecture

```
App.tsx
│  State: isAuthenticated (bool), page (Page)
│  Auth gate: if (!isAuthenticated) → <LandingPage>
│  Logged in: <Layout> wraps all inner pages
│
├── components/Layout.tsx
│     ├── components/Sidebar.tsx        ← nav, badge counts, AI status footer
│     ├── components/Header.tsx         ← page title, demo badge, bell, avatar, logout
│     └── <main className="p-6">{children}</main>
│
├── pages/LandingPage.tsx              ← hero, stats, features, how-it-works, CTA
├── pages/DashboardPage.tsx            ← stat cards, bar chart, health panel, live feed
├── pages/RepositoriesPage.tsx         ← repo cards with monitor toggle
├── pages/IssueTriagePage.tsx          ← analysis form + triaged issues table
├── pages/ModerationPage.tsx           ← event feed with filters + override
├── pages/RecommenderPage.tsx          ← skill profile + ranked issues + bookmarks
└── pages/ReadmeGeneratorPage.tsx      ← config panel + preview/edit/source tabs
```

---

## Auth Service

Handles GitHub OAuth 2.0 end-to-end:

1. `GET /auth/github` — redirects to GitHub with required scopes.
2. `GET /auth/callback` — receives `code`, exchanges for access token, stores encrypted, sets session cookie, redirects to `FRONTEND_URL/dashboard`.
3. `GET /auth/me` — returns `UserProfile` for the current session (used on app load to restore auth state).
4. `POST /auth/logout` — clears server session.

Required OAuth scopes: `repo`, `read:user`, `user:email`, `write:discussion`, `admin:repo_hook`, `pull_requests`.

---

## Webhook Receiver & Event Router

Entry point: `POST /webhooks/github`

1. Validate `X-Hub-Signature-256` against `GITHUB_WEBHOOK_SECRET` — reject with 401 if invalid.
2. Use `X-GitHub-Delivery` as idempotency key — skip if already processed.
3. Return `{ received: true }` with status 200 immediately (before any AI processing).
4. Dispatch to async task queue based on `X-GitHub-Event` header:
   - `issues` → Issue Triage pipeline
   - `pull_request` → Code Moderation + PR Review pipeline
   - `push` → Commit analysis pipeline
   - `issue_comment` / `pull_request_review_comment` → Comment moderation pipeline

---

## AI Orchestration Layer

| Module | Input | Output | GitHub Action |
|---|---|---|---|
| Issue Triage | Issue title + body | `TriagedIssue` (classification, labels, priority, duplicates) | Apply labels, post comment if duplicate/spam |
| Code Moderation | PR diff, commit content, or comment text | `ModerationEvent` (decision, severity, file, line) | Post `REQUEST_CHANGES` or commit status |
| README Generator | `owner/repo`, section options | Markdown string | Optionally create PR via GitHub API |
| Recommender | User skill profile | `RecommendedIssue[]` sorted by matchScore | None (read-only) |
| Comment Analysis | Comment body | PASS / FLAG / BLOCK + explanation | Post warning reply if flagged |

---

## Moderation Decision Flow

```
GitHub Event Received (Webhook POST /webhooks/github)
        │
        ▼
Validate X-Hub-Signature-256
        │
        ▼
Return 200 OK immediately (async everything below)
        │
        ▼
Extract relevant content (diff, message, comment text)
        │
        ▼
Send to gpt-oss-120B moderation pipeline
        │
        ▼
Decision: PASS | FLAG | BLOCK   (+ Severity: CRITICAL | HIGH | MEDIUM | LOW)
        │
   ─────┴──────────────────
  │                        │
PASS                  FLAG / BLOCK
  │                        │
Log event            Post AI comment on GitHub:
(decision: PASS)       - reason
                       - aiExplanation
                       - link to file#LN–LM
                            │
                       If PR:     POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews
                                  (event: REQUEST_CHANGES)
                       If Commit: POST /repos/{owner}/{repo}/statuses/{sha}
                                  (state: failure)
                       If Comment: post reply comment
                            │
                       Save ModerationEvent to DB
```

---

## Deep Links to Exact Problem Location

When AI identifies a fault at a specific file + line, the backend builds:

**Single line:**
```
https://github.com/{owner}/{repo}/blob/{commit_sha}/{file_path}#L{line_number}
```

**Line range:**
```
https://github.com/{owner}/{repo}/blob/{commit_sha}/{file_path}#L{start}-L{end}
```

The `ModerationEvent` schema stores `file`, `lineStart`, `lineEnd`, `commitSha`, and `githubUrl` (the pre-built deep link).

**AI JSON response shape expected from gpt-oss-120B:**
```json
{
  "decision": "BLOCK",
  "severity": "CRITICAL",
  "issues": [
    {
      "type": "security",
      "file": "src/config/database.js",
      "line_start": 42,
      "line_end": 42,
      "description": "Hardcoded API key detected. This credential will be exposed in the public repository.",
      "suggestion": "Use process.env.API_KEY and add this variable to .env.example without the actual value."
    }
  ],
  "explanation": "Full AI-generated explanation for the GitHub comment."
}
```

---

## Severity Levels

| Level | Frontend display | Backend action |
|---|---|---|
| `CRITICAL` | Red dot, red text | Automatic block — PR cannot merge; commit status = failure |
| `HIGH` | Orange dot | Block applied; maintainer can override via dashboard |
| `MEDIUM` | Amber dot | Flag only — comment posted, merge not blocked |
| `LOW` | Zinc dot | Log only — no GitHub action taken |

---

## Priority Scoring (Issue Triage)

```
Priority Score (0–100) =
  Severity signal                35%
  Reproducibility clues          20%
  User impact estimate           25%
  Freshness & recency            10%
  Repo-specific heuristics       10%
```

Displayed as a progress bar in the frontend (violet → fuchsia gradient).

---

## Match Score (Recommender)

```
Match Score (0–100) = base matchScore
  + skill overlap bonus (5 pts per matching language)
  + experience adjustment:
      beginner  → Easy issues +10, others -15
      advanced  → Hard issues +10
      intermediate → neutral
```

Results are sorted descending by adjusted matchScore before being returned.

---

## Database Schema (PostgreSQL / Supabase)

### users
```sql
id          UUID PRIMARY KEY
github_id   INTEGER UNIQUE NOT NULL
login       TEXT NOT NULL
name        TEXT
avatar_url  TEXT
email       TEXT
access_token TEXT  -- encrypted at rest
created_at  TIMESTAMPTZ DEFAULT now()
```

### repositories
```sql
id             UUID PRIMARY KEY
user_id        UUID REFERENCES users(id)
github_id      INTEGER NOT NULL
name           TEXT NOT NULL
owner          TEXT NOT NULL
full_name      TEXT NOT NULL
url            TEXT
description    TEXT
language       TEXT
stars          INTEGER
forks          INTEGER
open_issues    INTEGER
is_monitored   BOOLEAN DEFAULT false
webhook_active BOOLEAN DEFAULT false
webhook_id     INTEGER  -- GitHub webhook ID for deletion
last_updated   TIMESTAMPTZ
```

### triaged_issues
```sql
id              UUID PRIMARY KEY
repo_id         UUID REFERENCES repositories(id)
github_id       INTEGER
title           TEXT
body            TEXT
classification  TEXT  -- IssueClassification enum
priority_score  INTEGER
labels          TEXT[]
is_duplicate    BOOLEAN
duplicate_of    UUID REFERENCES triaged_issues(id)
state           TEXT  -- 'open' | 'closed'
url             TEXT
author          TEXT
created_at      TIMESTAMPTZ
analyzed_at     TIMESTAMPTZ DEFAULT now()
```

### moderation_events
```sql
id             UUID PRIMARY KEY
repo_id        UUID REFERENCES repositories(id)
type           TEXT  -- EventType enum
decision       TEXT  -- 'PASS' | 'FLAG' | 'BLOCK'
severity       TEXT  -- 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
title          TEXT
author         TEXT
author_avatar  TEXT
reason         TEXT
ai_explanation TEXT
file           TEXT
line_start     INTEGER
line_end       INTEGER
commit_sha     TEXT
pr_number      INTEGER
github_url     TEXT
overridden     BOOLEAN DEFAULT false
overridden_by  TEXT
timestamp      TIMESTAMPTZ DEFAULT now()
```

### recommendations
```sql
id           UUID PRIMARY KEY
user_id      UUID REFERENCES users(id)
github_id    INTEGER
title        TEXT
repo         TEXT
url          TEXT
labels       TEXT[]
difficulty   TEXT  -- 'Easy' | 'Medium' | 'Hard'
match_score  INTEGER
languages    TEXT[]
explanation  TEXT
stars        INTEGER
comments     INTEGER
bookmarked   BOOLEAN DEFAULT false
created_at   TIMESTAMPTZ
```

### user_prefs
```sql
id         UUID PRIMARY KEY
user_id    UUID REFERENCES users(id) UNIQUE
skills     TEXT[]
domains    TEXT[]
experience TEXT  -- 'beginner' | 'intermediate' | 'advanced'
```

---

## Vector Database (Qdrant / FAISS)

- Collection: `issue_embeddings`
- Each point: `{ id: issue_uuid, vector: float[1536], payload: { repo, title, github_id } }`
- Duplicate check: cosine similarity threshold = 0.85 (configurable per repo)
- Only the Qdrant point ID is stored in Postgres; full vectors stay in Qdrant

---

## Free Tier Constraints

- **Render cold starts** — implement keep-alive ping every 10 minutes
- **Model inference latency** — queue all webhook events; always return 200 immediately
- **Supabase 500MB limit** — embeddings in Qdrant only


## High-Level Architecture

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

## How Each Piece Works

### Auth Service

Handles the GitHub OAuth 2.0 flow end to end — redirecting to GitHub, receiving the authorization code on callback, exchanging it for an access token, and storing that token encrypted at rest. Once a user is authenticated, everything else in the system knows who they are and what repositories they can access.

### Webhook Receiver & Event Router

This is where all the real-time action comes in. Every GitHub event — a new issue, a PR opened, a commit pushed, a comment posted — arrives at `POST /webhooks/github`. Before anything else happens, the payload signature is checked against `X-Hub-Signature-256` so we know the event genuinely came from GitHub. Then the `X-GitHub-Delivery` header is used as an idempotency key, which means if GitHub delivers the same event twice (it happens occasionally), we only process it once. After that, the event is routed to the right pipeline asynchronously so GitHub gets an instant `200 OK` and the work happens in the background.

### AI Orchestration Layer

This sits between the webhook receiver and the model. It decides what to do with each event, prepares the right prompt or embedding request, sends it to `gpt-oss-120B`, and then acts on the response — posting comments, setting commit statuses, updating the database.

| Module | What it handles |
|---|---|
| Issue Triage | Classification, duplicate detection, priority scoring, label suggestion |
| Code Moderation | PR diff analysis, commit message checks, secret scanning |
| PR Review | Structured PASS / FLAG / BLOCK decision with file and line attribution |
| README Generator | Repository metadata parsing, full README generation |
| Recommender | Skill-based issue ranking for new contributors |
| Comment Analysis | Toxicity detection and spam filtering on issue and PR comments |

### gpt-oss-120B Inference Service

One model handles everything: embeddings for duplicate detection, classification for issue triage, generation for README drafts, and code analysis for PR review. It's called exclusively from the backend — the frontend never touches it directly. An async job queue sits in front of it to absorb any latency from the free GPU tier so the rest of the system stays responsive.

### PostgreSQL (Supabase)

Stores users, repositories, issues, triage results, moderation events, recommendations, and README drafts. Row-level security policies are scoped to each authenticated user, so nobody can see another user's data. One important thing: vectors are **not** stored here — only the Qdrant point IDs that reference them. Keeping embeddings out of Postgres is what lets us stay within Supabase's 500MB free-tier limit.

### Vector Database (Qdrant / FAISS)

Holds the issue embeddings used for semantic duplicate detection. When a new issue comes in, it gets embedded and compared against everything already in the vector store using cosine similarity. The default threshold is `0.85`, but maintainers can tune this per repository since every project has a different tolerance for what counts as a duplicate.

---

## Moderation Decision Flow

When a GitHub event arrives, here's exactly what happens before anything is posted back to GitHub:

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

---

## What Gets Monitored

GitWise AI listens to these GitHub event types and knows what to look for in each one:

| GitHub Event | What the AI looks at |
|---|---|
| Pull Request opened or updated | The full code diff, every commit message, the PR description, and whether it references an open issue |
| Individual Commits | Commit message quality, code changes, and any patterns that look like secrets or credentials |
| Issue Comments | Tone, relevance, spam signals, and potentially harmful language |
| PR Review Comments | Code-level feedback quality, spam, and toxic language |
| Issue Body on submission | Quality, completeness, and whether it's a duplicate of an existing issue |

---

## Deep Links to the Exact Problem

When the AI identifies a fault at a specific file and line, the system builds a direct GitHub link to that exact location. Contributors can click once and land exactly on the problem — no manual searching through the diff.

**Single line:**
```
https://github.com/{owner}/{repo}/blob/{commit_sha}/{file_path}#L{line_number}
```

**Line range:**
```
https://github.com/{owner}/{repo}/blob/{commit_sha}/{file_path}#L{start_line}-L{end_line}
```

The AI returns a structured JSON response for each issue it finds. The backend uses that response to construct the link, embed it in the GitHub comment, and also display it in the dashboard's PR review panel.

**What that AI response looks like internally:**
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

## Severity Levels and What They Trigger

Not every problem warrants the same response. The system uses four levels:

| Level | What happens |
|---|---|
| `CRITICAL` | Automatic block — the PR cannot be merged and the commit status is set to failure |
| `HIGH` | Block applied, but a maintainer can review and override if they disagree |
| `MEDIUM` | Flagged with a bot comment on GitHub, but the merge is not blocked |
| `LOW` | Logged to the moderation history only — no action taken on GitHub |

---

## Scoring Logic

Two different scoring systems run in the background depending on who's looking.

**Issue Priority Score** — used to help maintainers see what needs attention first:

```
Priority Score =
  (severity_signal     × 0.35) +
  (reproducibility     × 0.20) +
  (user_impact         × 0.25) +
  (recency             × 0.10) +
  (repo_heuristics     × 0.10)
```

**Recommendation Score** — used to match new contributors to issues they'll actually be able to tackle:

```
Recommendation Score =
  (skill_match         × 0.40) +
  (difficulty_fit      × 0.25) +
  (label_quality       × 0.20) +
  (activity_freshness  × 0.10) +
  (interest_overlap    × 0.05)
```

---

## Database Schema

Everything in Postgres is normalized around repositories and users. Vectors stay in Qdrant — Postgres only keeps a reference to the Qdrant point ID.

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

## Security

A few things we take seriously regardless of free-tier constraints:

- GitHub OAuth tokens are encrypted before being written to the database — they're never stored in plaintext.
- Every incoming webhook payload is verified with `X-Hub-Signature-256` using a per-repository shared secret. Unverified payloads are rejected immediately.
- `gpt-oss-120B` is only callable from the backend. The frontend never sends data to the model directly.
- Code diffs and repository content are never forwarded to any external logging service.
- Supabase row-level security policies ensure each user can only access their own data, even if a query is somehow misconfigured.

---

## Engineering Challenges and How We're Handling Them

Building on free infrastructure comes with real constraints. Here's what we ran into and how we designed around each one:

| Challenge | What we're doing about it |
|---|---|
| Render free tier cold starts | A keep-alive endpoint gets pinged every 10 minutes by a cron job. When a cold start does happen, users see a clear message rather than a timeout |
| `gpt-oss-120B` latency on free GPU tiers | Webhook events are queued immediately — GitHub gets an instant `200 OK` and the analysis result is posted asynchronously when it's ready |
| GitHub API rate limits | All repository and issue data is cached locally, API calls are batched, and conditional requests use ETags so we only pull what's actually changed |
| Getting the duplicate detection threshold right | We start at a cosine similarity of `0.85` and expose it as a per-repository config variable so maintainers can tighten or loosen it based on how their community files issues |
| Very large PR diffs | For the MVP, diffs are truncated to the first 500 changed lines. PRs beyond that threshold are flagged for manual review with a note explaining why automated analysis was skipped |
| Supabase's 500MB storage cap | Only metadata lives in Postgres. All vectors are in Qdrant, and README drafts are kept compact. We don't store anything in the relational DB that belongs in the vector store |
| False positives blocking legitimate contributions | Every block is overridable. Maintainers get a dedicated override button in the dashboard, and every override is logged with who did it and when |
| Webhook delivery failures | We return `200 OK` to GitHub before any processing begins. If processing fails, events go into a retry queue rather than being silently dropped |
