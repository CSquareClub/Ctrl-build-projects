# GitWise AI — System Architecture

This document covers how GitWise AI is put together — the system diagram, how each component works, the database schema, the moderation decision flow, and how we've thought about the hard engineering problems.

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
