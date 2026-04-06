# GitWise AI — Tech Stack

Everything in GitWise AI runs on free-tier services. No credit card, no surprise bills.

---

## Full Stack Overview

| Layer | Technology | Version / Notes |
|---|---|---|
| **Frontend** | React | 19.2.3 |
| | Vite | 7.2.4 — dev server + build tool |
| | TypeScript | 5.9.3 |
| | Tailwind CSS | 4.1.17 (via `@tailwindcss/vite` plugin) |
| | lucide-react | 1.7.0 — icons |
| | react-markdown | 10.1.0 — README preview |
| | remark-gfm | 4.0.1 — GitHub Flavoured Markdown tables/checklist |
| | clsx + tailwind-merge | utility for conditional class names |
| | react-router-dom | 7.14.0 (present in package.json, routing done manually via state) |
| **Backend** | Python | 3.11+ |
| | FastAPI | latest stable |
| | Uvicorn | ASGI server |
| | PyGitHub | GitHub REST API client |
| | httpx | async HTTP for webhook delivery and HF inference |
| | python-jose | JWT session tokens |
| | passlib | password / token hashing |
| | asyncpg | async PostgreSQL driver |
| | qdrant-client | Qdrant vector DB client |
| | sentence-transformers | local embedding fallback if HF endpoint is down |
| **AI Model** | `gpt-oss-120B` | Hugging Face Inference Endpoint (free tier) |
| **Vector DB** | Qdrant Cloud | Free tier — 1GB storage, no credit card |
| | FAISS | In-memory fallback if Qdrant is unavailable |
| **Relational DB** | Supabase (PostgreSQL) | Free tier — 500MB, row-level security enabled |
| **Hosting** | Render | Free tier for backend (cold starts expected) |
| | Vercel | Free tier for frontend |

---

## Frontend — Detailed

### Entry Point

```
frontend/
  index.html          ← <div id="root">, loads /src/main.tsx as module
  vite.config.ts      ← plugins: react(), tailwindcss(), viteSingleFile()
                         alias: @/ → src/
  tsconfig.json
  src/
    main.tsx          ← createRoot(#root).render(<StrictMode><App/></StrictMode>)
    App.tsx           ← page state machine + auth gate
    index.css         ← @import "tailwindcss"; + scrollbar + keyframe animations
```

### Routing Model

The frontend uses **manual state-based routing** (not React Router), managing a single `page` state in `App.tsx`:

```typescript
type Page = 'landing' | 'dashboard' | 'repositories' | 'triage' | 'moderation' | 'recommender' | 'readme'

const [page, setPage] = useState<Page>('landing')
const navigate = (p: Page) => setPage(p)
```

`react-router-dom` is installed but currently unused — navigation is prop-drilled via `navigate(page)` from `App.tsx` down through `Layout` and `Sidebar`.

### Tailwind v4 Setup

- Uses `@tailwindcss/vite` plugin (not `tailwind.config.js`)
- CSS entry: `@import "tailwindcss"` in `index.css`
- All custom styles (scrollbar, animations, prose-readme) are also in `index.css`
- No `tailwind.config.js` needed — v4 scans source files automatically

### Custom CSS Classes (index.css)

| Class | Purpose |
|---|---|
| `.animate-fade-in` | `opacity: 0 → 1, translateY(10px → 0)`, 0.35s |
| `.animate-slide-left` | `opacity: 0 → 1, translateX(-12px → 0)`, 0.3s |
| `.animate-scale-in` | `opacity: 0 → 1, scale(0.96 → 1)`, 0.25s |
| `.prose-readme` | Scoped markdown styles for README preview |

### State Management

No Redux, Zustand, or Context API. All state is local to each page component via `useState`. Data flows:
- `App.tsx` → `Layout` → `Sidebar` + `Header` (via props)
- Each page is self-contained and fetches its own data

### Mock Data (replace with real API calls)

`src/data/mockData.ts` exports:

```typescript
MOCK_USER              // UserProfile
MOCK_REPOSITORIES      // Repository[] — 4 repos
MOCK_TRIAGED_ISSUES    // TriagedIssue[] — 6 issues
MOCK_MODERATION_EVENTS // ModerationEvent[] — 5 events
MOCK_RECOMMENDATIONS   // RecommendedIssue[] — 4 issues
```

When connecting the real backend, replace each mock import with a `fetch` / `axios` call to the corresponding endpoint.

---

## Backend — Recommended Structure

```
backend/
  main.py                    ← FastAPI app, CORS, middleware
  run_migrations.py          ← Supabase / asyncpg migration runner
  requirements.txt
  .env.example
  routers/
    auth.py                  ← /auth/github, /auth/callback, /auth/me, /auth/logout
    repos.py                 ← /repos, /repos/import, /repos/{id}/watch
    issues.py                ← /issues, /issues/analyze, /issues/{id}/label
    moderation.py            ← /moderation, /moderation/{id}, /moderation/{id}/override
    webhooks.py              ← /webhooks/github (single entry point)
    recommend.py             ← /prefs, /recommend, /bookmarks
    readme.py                ← /readme/generate, /readme/pr
    dashboard.py             ← /dashboard/stats, /dashboard/activity, /dashboard/feed
  services/
    github.py                ← PyGitHub wrapper — post comments, set statuses, create PRs
    ai.py                    ← gpt-oss-120B calls — classify, embed, generate, moderate
    triage.py                ← Issue triage pipeline
    moderation_pipeline.py   ← PR / commit / comment moderation pipeline
    recommender.py           ← Skill-based ranking logic
    readme_generator.py      ← README generation logic
    vector_store.py          ← Qdrant / FAISS embedding store
  db/
    models.py                ← SQLAlchemy or raw asyncpg table definitions
    migrations/              ← SQL migration files
  middleware/
    auth.py                  ← Session / JWT validation middleware
    webhook_validation.py    ← X-Hub-Signature-256 verification
```

---

## AI Model Integration

**Model:** `gpt-oss-120B` via Hugging Face Inference API

```python
# All AI calls go through services/ai.py
import httpx

HF_ENDPOINT = os.environ["GPT_OSS_MODEL_ENDPOINT"]
HF_TOKEN    = os.environ["GPT_OSS_MODEL_API_KEY"]

async def classify_issue(title: str, body: str) -> dict:
    ...

async def embed_text(text: str) -> list[float]:
    ...

async def moderate_content(content: str) -> dict:
    # Returns: { decision, severity, issues: [{type, file, line_start, line_end, description, suggestion}], explanation }
    ...

async def generate_readme(repo_name: str, options: dict) -> str:
    ...
```

---

## Environment Variables

```env
# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=

# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                    # postgres:// for asyncpg

# Vector Database
QDRANT_URL=
QDRANT_API_KEY=

# AI Model
GPT_OSS_MODEL_ENDPOINT=         # Hugging Face inference endpoint for gpt-oss-120B
GPT_OSS_MODEL_API_KEY=          # Hugging Face token (free account)

# App
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
SESSION_SECRET=
JWT_SECRET=
```

---

## CORS Configuration

The frontend runs on `http://localhost:5173` in development and the Vercel domain in production. The backend must allow:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ["FRONTEND_URL"]],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Free Tier Considerations

| Constraint | Mitigation |
|---|---|
| Render backend cold starts (15s+) | Keep-alive ping every 10 min; show loading state in frontend |
| HF inference latency on free tier | Queue all webhook processing; return 200 immediately; poll for results |
| Supabase 500MB limit | All embeddings in Qdrant; only IDs and metadata in Postgres |
| Qdrant 1GB free | Prune embeddings for closed issues older than 90 days |
| GitHub API rate limit (5000 req/hr) | Cache repo metadata; batch label applications |


## What's Running Under the Hood

| Layer | Technology | Why we picked it |
|---|---|---|
| Frontend | React + Tailwind CSS, deployed on Vercel free tier | Vercel's free tier is genuinely good — fast deploys, global CDN, no config |
| Backend | Python + FastAPI, deployed on Render free tier | FastAPI handles async webhooks cleanly and Render's free tier is reliable enough for a hackathon |
| AI Model | `gpt-oss-120B` via Hugging Face free inference endpoint | Fully open-source, self-hostable, and we don't pay a cent per request |
| Embeddings | `gpt-oss-120B` embedding output or Sentence-Transformers | The same model we're already running can produce embeddings — no separate API needed |
| Vector DB | Qdrant Cloud free tier or FAISS in-memory | Qdrant has a generous free tier; FAISS is a zero-cost fallback that lives entirely in memory |
| Relational DB | Supabase free tier (PostgreSQL) | Managed Postgres with a solid free tier and built-in row-level security |
| GitHub Integration | PyGitHub + GitHub REST API + Webhook listener | PyGitHub makes the API pleasant to work with; webhooks handle all the real-time event routing |
| Markdown Parser | Python `mistune` or `markdown-it` | Lightweight and battle-tested for rendering README previews |

---

## Hosting — The Whole Thing Runs Free

We made a deliberate decision: every layer of this stack must have a zero-cost deployment path. Here's what that looks like in practice:

| Layer | Free Option |
|---|---|
| Frontend | Vercel (free tier) or Netlify (free tier) |
| Backend API | Render (free tier) or Railway (free tier) |
| Model Inference | Hugging Face Inference Endpoints (free tier) or self-hosted on a free GPU provider like Google Colab or Kaggle |
| Vector Database | Qdrant Cloud (free tier) or FAISS in-memory — no external host needed |
| Relational Database | Supabase (free tier) or PlanetScale (free tier) |
| GitHub Webhooks | Handled directly by the backend endpoint on Render or Railway |

---

## The AI Model

**Model:** `gpt-oss-120B` (open-source, fully self-hostable)

One model does everything: classification, embedding, generation, code review, comment analysis. We're not stitching together five different APIs — it all goes through `gpt-oss-120B`, which means:

- **Zero per-token cost** at runtime — we pay nothing each time the model runs.
- **Full data privacy** — your code and issue content never leave your own infrastructure.
- **One backend to maintain** — embeddings, classification, generation, and code review all come from the same endpoint.

There's no OpenAI dependency. No Anthropic dependency. Nothing proprietary.

---

## Things to Know About Free Tier Limits

Free tiers come with trade-offs. We've designed around them, but it's worth knowing what they are:

- **Render cold starts** — the backend will spin down after a period of inactivity. We handle this with a keep-alive ping every 10 minutes. First requests after a cold start may be slow — we warn users when this happens.
- **Model inference latency** — free GPU tiers aren't always fast. Webhook events are queued and processed asynchronously, so GitHub gets an instant `200 OK` and the actual analysis happens in the background.
- **Supabase's 500MB limit** — we don't store embeddings in Postgres. All vectors go to Qdrant. Postgres only holds metadata, IDs, and text content.

---

## Environment Variables

Everything the app needs to run lives in `.env`. Copy `.env.example` and fill in your own values:

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
