# GitWise AI

> Your open-source GitHub companion — triages issues, catches bad PRs before they merge, helps newcomers find their first contribution, and writes your README for you. No paid APIs. Ever.

---

## What is GitWise AI?

Maintaining an open-source project is hard. Issues pile up unlabeled, duplicates slip through, new contributors get lost, and documentation always falls behind. GitWise AI fixes all of that in one place.

Connect it to GitHub via OAuth and it quietly goes to work:

- **Maintainers** stop drowning in issue noise — every new issue gets classified, scored for priority, and checked against existing ones automatically.
- **New contributors** get a personalised feed of issues that match their skill level, experience, and domains.
- **Repository owners** generate a complete professional README in seconds.
- **Everyone** gets a clear explanation with a direct link to the exact line of code whenever a PR or commit gets flagged.

Everything runs on `gpt-oss-120B`, a fully open-source model you can self-host. No OpenAI. No Anthropic. No per-token bill.

---

## What it Can Do

| Feature | What it actually does |
|---|---|
| Issue Triage | Classifies every new issue (BUG / FEATURE_REQUEST / DOCUMENTATION / QUESTION / SPAM / UNCLEAR), checks for duplicates, scores priority 0–100, suggests GitHub labels |
| PR & Commit Moderation | Scans code diffs and commit messages for secrets, vulnerabilities, policy violations, and toxic content before anything merges |
| AI Block Notifications | Posts a structured comment on GitHub with PASS / FLAG / BLOCK decision, severity level, AI explanation, and deep link to the faulty line |
| First Issue Recommender | Scores open issues by skill match, experience level (beginner / intermediate / advanced), and domain preference; updates live as profile changes |
| README Generator | Takes a GitHub URL, generates a full Markdown README with badges, features, install steps, usage examples, API reference, contributing guide, and license; supports Preview / Edit / Source view and one-click PR creation |
| Dashboard | Live AI status banner, 7-day activity bar chart, system health panel, live feed, moderation event table, quick nav |

---

## Frontend Structure

```
frontend/
  src/
    App.tsx               # Root — page state machine, auth gate, routing
    main.tsx              # React DOM mount
    index.css             # Tailwind v4 + custom scrollbar + keyframe animations
    components/
      GithubIcon.tsx      # SVG GitHub logo
      Header.tsx          # Top bar: page title, demo badge, notification bell, user avatar, logout
      Sidebar.tsx         # Nav with active indicator, badge counts, AI status footer
      Layout.tsx          # Shell: Sidebar + Header + <main p-6>
    pages/
      LandingPage.tsx     # Public marketing page — hero, stats, features, CTA
      DashboardPage.tsx   # Post-login home — stat cards, bar chart, health panel, live feed
      RepositoriesPage.tsx# List all repos; toggle monitoring per repo
      IssueTriagePage.tsx # Manual issue analysis form + triaged-issues table with filters
      ModerationPage.tsx  # Moderation event feed with decision/type filters and override action
      RecommenderPage.tsx # Skill profile builder + issue recommendations with bookmark
      ReadmeGeneratorPage.tsx # README generator with preview/edit/source tabs and PR creation
    data/
      mockData.ts         # All mock data: MOCK_USER, MOCK_REPOSITORIES, MOCK_TRIAGED_ISSUES,
                          #               MOCK_MODERATION_EVENTS, MOCK_RECOMMENDATIONS
    types/
      index.ts            # All shared TypeScript types (see Data Types section below)
    utils/
      cn.ts               # clsx + tailwind-merge helper
```

---

## Architecture (short version)

```
GitHub (Webhooks + OAuth + Status API)
        ↓
GitWise AI Backend (FastAPI on Render)
        ↓
gpt-oss-120B Inference (Hugging Face free endpoint)
        ↓
PostgreSQL (Supabase)  +  Vector DB (Qdrant / FAISS)
        ↓
React + Tailwind Dashboard (Vercel)
```

Full details: [architecture.md](architecture.md) · [tech-stack.md](tech-stack.md) · [context.md](context.md)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Tailwind CSS v4, Vite 7, TypeScript 5, lucide-react, react-markdown + remark-gfm |
| Backend | Python 3.11 + FastAPI (Render free tier) |
| AI Model | `gpt-oss-120B` (Hugging Face free endpoint) |
| Vector DB | Qdrant Cloud free tier / FAISS in-memory |
| Relational DB | Supabase free tier (PostgreSQL) |
| GitHub Integration | PyGitHub + REST API + Webhooks |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- GitHub OAuth App ([create here](https://github.com/settings/developers))
- Free [Supabase](https://supabase.com) account
- Free [Qdrant Cloud](https://cloud.qdrant.io) account
- Free [Hugging Face](https://huggingface.co) account with access to `gpt-oss-120B`

### 1. Clone the repository

```bash
git clone https://github.com/your-org/gitwise-ai.git
cd gitwise-ai
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all variables — see tech-stack.md for the full list
```

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt
python run_migrations.py
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 5. Connect a webhook

In your GitHub repo **Settings → Webhooks**:

- **Payload URL:** `http://localhost:8000/webhooks/github` (or your deployed URL)
- **Content type:** `application/json`
- **Secret:** value of `GITHUB_WEBHOOK_SECRET` in `.env`
- **Events:** Issues, Pull requests, Push, Issue comments, Pull request review comments

---

## API Reference

> All endpoints require `Authorization: Bearer <access_token>` except `/auth/*` and `/webhooks/github`.

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/github` | Redirect to GitHub OAuth |
| `GET` | `/auth/callback` | GitHub OAuth callback — exchanges code for token, sets session |
| `GET` | `/auth/me` | Returns current `UserProfile` |
| `POST` | `/auth/logout` | Clears session |

### Repositories

| Method | Endpoint | Body / Params | Returns |
|---|---|---|---|
| `POST` | `/repos/import` | — | `Repository[]` — pulls all repos from GitHub |
| `GET` | `/repos` | — | `Repository[]` — all imported repos |
| `POST` | `/repos/{id}/watch` | — | `Repository` — registers webhook, sets `isMonitored: true` |
| `DELETE` | `/repos/{id}/watch` | — | `Repository` — removes webhook, sets `isMonitored: false` |

### Issue Triage

| Method | Endpoint | Body / Params | Returns |
|---|---|---|---|
| `POST` | `/issues/analyze` | `{ title, body, repoId? }` | `TriagedIssue` — classification, priority, labels, duplicates |
| `GET` | `/issues` | `?repoId&classification&state` | `TriagedIssue[]` |
| `GET` | `/issues/similar` | `?issueId&threshold=0.85` | `{ title, repo, similarity, url }[]` |
| `POST` | `/issues/{id}/label` | `{ labels: string[] }` | Applies labels on GitHub via API |

### Moderation

| Method | Endpoint | Body / Params | Returns |
|---|---|---|---|
| `POST` | `/webhooks/github` | GitHub webhook payload (raw) | `{ received: true }` — always 200 |
| `GET` | `/moderation` | `?repoId&decision&type` | `ModerationEvent[]` |
| `GET` | `/moderation/{id}` | — | `ModerationEvent` (full detail with deep links) |
| `POST` | `/moderation/{id}/override` | `{ overriddenBy: string }` | `ModerationEvent` with `overridden: true` |

### Recommender

| Method | Endpoint | Body / Params | Returns |
|---|---|---|---|
| `POST` | `/prefs` | `{ skills, domains, experience }` | Saves user profile |
| `GET` | `/recommend` | `?skills&domains&experience` | `RecommendedIssue[]` sorted by matchScore |
| `POST` | `/bookmarks` | `{ issueId: string }` | Adds bookmark |
| `DELETE` | `/bookmarks/{issueId}` | — | Removes bookmark |
| `GET` | `/bookmarks` | — | `RecommendedIssue[]` |

### README Generation

| Method | Endpoint | Body / Params | Returns |
|---|---|---|---|
| `POST` | `/readme/generate` | `{ repoUrl, options: ReadmeOptions }` | `{ content: string, repoName: string }` |
| `POST` | `/readme/pr` | `{ repoName, content }` | `{ prUrl: string, prNumber: number }` — creates PR on GitHub |

---

## Data Types

All types live in `frontend/src/types/index.ts`. The backend must return JSON that matches these shapes exactly.

See [context.md](context.md) for the full schema definitions.


## What is GitWise AI?

Maintaining an open-source project is hard. Issues pile up unlabeled, duplicates slip through, new contributors get lost, and documentation always falls behind. GitWise AI was built to fix all of that in one place.

Connect it to GitHub via OAuth and it quietly goes to work:

- **Maintainers** stop drowning in issue noise — every new issue gets classified, scored for priority, and checked against existing ones automatically.
- **New contributors** get a personalized feed of issues that actually match their skill level, so they can start contributing without digging through hundreds of tickets.
- **Repository owners** can generate a complete, professional README from their codebase in seconds instead of hours.
- **Everyone** gets a clear explanation with a direct link to the exact line of code whenever a PR or commit gets flagged — no silent failures, ever.

Everything runs on `gpt-oss-120B`, a fully open-source model you can self-host. No OpenAI. No Anthropic. No per-token bill.

---

## What it Can Do

| Feature | What it actually does |
|---|---|
| Issue Triage | Reads every new issue and classifies it, checks for duplicates, scores its priority, and suggests or applies labels — no human needed |
| PR & Commit Moderation | Scans code diffs and commit messages for security holes, hardcoded secrets, policy violations, and sloppy messages before anything merges |
| AI Block Notifications | When something gets blocked, the bot posts a detailed comment on GitHub explaining exactly why, with a clickable link to the specific line of code |
| First Issue Recommender | Scores open issues by how well they match a contributor's skills, experience level, and interests — surfaces the ones most likely to be a good fit |
| README Generator | Parses your repo's structure, dependencies, and scripts, then generates a full README draft ready to preview and export |
| Dashboard | One place to see your triage results, moderation history, and contributor recommendations across all monitored repositories |

---

## How it's Built

For the full breakdown — system diagram, component details, database schema, scoring logic, and moderation flow — see [architecture.md](architecture.md).

The short version:

```
GitHub (Webhooks + OAuth + Status API)
        ↓
GitWise AI Backend (FastAPI on Render)
        ↓
gpt-oss-120B Inference (Hugging Face free endpoint)
        ↓
PostgreSQL (Supabase)  +  Vector DB (Qdrant / FAISS)
        ↓
React + Tailwind Dashboard (Vercel)
```

---

## Tech Stack

Every piece of this runs on a free tier — no credit card required anywhere. Full details at [tech-stack.md](tech-stack.md).

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS (Vercel) |
| Backend | Python + FastAPI (Render) |
| AI Model | `gpt-oss-120B` (Hugging Face free endpoint) |
| Vector DB | Qdrant Cloud free tier / FAISS in-memory |
| Relational DB | Supabase free tier (PostgreSQL) |
| GitHub Integration | PyGitHub + REST API + Webhooks |

---

## Getting Started

The whole thing should be running locally in under 10 minutes. Here's what you'll need before you start:

### Prerequisites

- Python 3.11+
- Node.js 18+
- A GitHub OAuth App — [create one here](https://github.com/settings/developers), it takes about 2 minutes
- A free [Supabase](https://supabase.com) account for the database
- A free [Qdrant Cloud](https://cloud.qdrant.io) account for the vector store
- A free [Hugging Face](https://huggingface.co) account with access to `gpt-oss-120B`

### 1. Clone the repository

```bash
git clone https://github.com/your-org/gitwise-ai.git
cd gitwise-ai
```

### 2. Set up your environment

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

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
GPT_OSS_MODEL_ENDPOINT=
GPT_OSS_MODEL_API_KEY=

# App
FRONTEND_URL=
BACKEND_URL=
SESSION_SECRET=
```

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt
python run_migrations.py
uvicorn main:app --reload
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be live at `http://localhost:3000`.

### 5. Connect your first webhook

With the backend running, head to your repository's **Settings → Webhooks** and add a new one:

- **Payload URL:** `https://your-backend-url/webhooks/github`
- **Content type:** `application/json`
- **Secret:** whatever you set as `GITHUB_WEBHOOK_SECRET` in your `.env`
- **Events:** Issues, Pull requests, Push, Issue comments, Pull request review comments

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/github` | GitHub OAuth callback — exchanges the authorization code for an access token |
| `GET` | `/auth/me` | Returns the currently authenticated user's profile |

### Repository Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/repos/import` | Pulls in all repositories from the authenticated GitHub account |
| `GET` | `/repos` | Lists everything that's been imported and which repos are actively monitored |
| `POST` | `/repos/{id}/watch` | Registers a webhook on that repo and starts monitoring it |
| `DELETE` | `/repos/{id}/watch` | Stops monitoring a repository and removes the webhook |

### Issue Intelligence

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze` | Classifies an issue, scores its priority, checks for duplicates, and suggests labels |
| `GET` | `/issues` | Returns all tracked issues across every monitored repository |
| `GET` | `/similar` | Finds semantically similar issues to a given issue ID |
| `POST` | `/label` | Applies suggested labels directly to a GitHub issue via the API |

### Code Moderation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/webhooks/github` | The single entry point for all incoming GitHub webhook events |
| `GET` | `/moderation/log` | Returns the full moderation history for a repository |
| `GET` | `/moderation/{event_id}` | Returns the full detail for a specific moderation decision, including deep links |

### Recommendations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/prefs` | Saves the user's skill profile and contribution preferences |
| `GET` | `/recommend` | Returns a ranked list of recommended issues for the current user |
| `POST` | `/bookmark` | Saves an issue to the user's bookmarks |
| `GET` | `/bookmarks` | Returns all of the user's bookmarked issues |

### README Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/generate-readme` | Generates a README from a repository URL or a connected repo ID |
| `GET` | `/readme/preview` | Returns the rendered markdown preview |
| `POST` | `/readme/pr` | Opens a pull request on GitHub with the generated README |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard` | Returns a combined summary — triage stats, moderation log, and recommendations |

---

## How People Use It

### Maintainer — Keeping Issues Under Control

1. Connect GitHub via OAuth and pick which repositories to monitor
2. GitWise AI registers webhooks and backfills all your existing open issues on first run
3. From that point on, every new issue that comes in gets classified, scored, and checked for duplicates automatically
4. Labels are applied or queued for your review — whichever you prefer
5. If something's a duplicate or spam, the bot posts a comment on GitHub explaining why so the author isn't left guessing
6. Check the dashboard any time to see the full triage picture across all your repos

### Contributor — Submitting a Pull Request

1. Open a Pull Request on any monitored repository
2. GitWise AI picks up the webhook, pulls the diff, and runs it through the moderation pipeline
3. If something's wrong: a bot comment goes up on the PR immediately — with the exact reason, the file name, the line number, and a clickable link right to that line on GitHub
4. If everything looks good: the commit status flips to ✅ success and the PR is clear to review

### New Contributor — Finding the Right First Issue

1. Log in with GitHub OAuth
2. Fill out a quick skill profile — languages, frameworks, how long you've been coding
3. Get back a ranked list of open issues that actually match what you know, with a short explanation for each match
4. Bookmark the ones that interest you and jump straight to GitHub when you're ready

### Repository Owner — Generating Documentation

1. Pick a connected repository or paste in any public repo URL
2. GitWise AI parses the folder structure, dependencies, and scripts
3. `gpt-oss-120B` writes a complete README — title, description, install steps, usage, API reference, contributing guide, license
4. Preview and tweak it, then export the markdown or let GitWise AI open a PR with it directly

---

## Project Structure

```
gitwise-ai/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── auth/                   # GitHub OAuth handlers
│   ├── webhooks/               # Webhook receiver and event router
│   ├── triage/                 # Issue classification and scoring
│   ├── moderation/             # PR, commit, and comment moderation
│   ├── recommender/            # Skill-based issue ranking
│   ├── readme_gen/             # README generation pipeline
│   ├── db/                     # Database models and migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/              # Dashboard, triage, moderation, recommend
│   │   ├── components/         # Shared UI components
│   │   └── api/                # API client
│   └── package.json
├── .env.example
├── README.md
├── architecture.md
└── tech-stack.md
```

---

## Edge Cases We've Thought About

- **Empty repository** — shows a clean empty state; README generation still works fine even with no issues.
- **Binary-only PR diff** — nothing to analyze, so the PR gets an automatic pass with a note explaining why.
- **Non-English comments** — language detection runs first so the model doesn't mistakenly flag a perfectly reasonable comment just because it's not in English.
- **Contributor submits no skill profile** — the recommendation engine falls back to popularity signals: star count, `good first issue` labels, and recent activity.
- **Large repositories with thousands of issues** — imports are paginated and processed in batches of 50 to avoid timeouts and rate limits.
- **Duplicate webhook deliveries** — GitHub occasionally sends the same event twice; the `X-GitHub-Delivery` header is used as an idempotency key so the same event is never processed more than once.
- **AI inference endpoint is down** — code moderation fails open (the PR is not blocked) so contributors aren't punished for infrastructure issues. The failure is logged and the maintainer is notified.
- **Maintainer wants to override a block** — there's a dedicated override button in the dashboard that dismisses the block and records who overrode it and when.

---

## Contributing

Contributions are welcome. Here's how:

1. Fork the repo and create a feature branch from `main`.
2. Make your changes — add tests where it makes sense.
3. Open a Pull Request and describe what changed and why.

GitWise AI will automatically review the PR when you open it. Practice what we preach.

---

## License

MIT — see `LICENSE` for the full text.

---

*Built for open-source maintainers, contributors, and anyone who's ever stared at a backlog and wondered where to start. Powered by `gpt-oss-120B`. Entirely free to run.*
