# GitWise AI — Tech Stack

Everything in GitWise AI runs on free-tier services. No credit card, no surprise bills, no locked-in vendor. Here's how each piece fits together and why we chose it.

---

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
