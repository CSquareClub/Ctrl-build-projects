# OpenIssue Backend Service (`services/api`)

This folder hosts the FastAPI backend foundation for OpenIssue.

## What exists in this branch

- app bootstrap (`app/main.py`)
- explicit settings loading via `pydantic-settings` (`app/core/settings.py`)
- API router wiring (`app/api/router.py`)
- health route (`GET /api/health`)
- contract-first module boundaries for:
  - `app/schemas`
  - `app/core`
  - `app/github`
  - `app/embeddings`
  - `app/vectorstore`
  - `app/triage`

Embedding providers now support open-source local inference with:

- primary: `sentence-transformers/all-MiniLM-L6-v2`
- fallback: `BAAI/bge-small-en-v1.5`

## Quick start

1. Create a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy env template and adjust if needed:

```bash
cp .env.example .env
```

4. Start the service:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Check health route:

```bash
curl http://127.0.0.1:8000/api/health
```

Expected response shape:

```json
{
  "status": "ok",
  "service": "OpenIssue API",
  "version": "0.1.0",
  "environment": "development"
}
```

## Embeddings configuration

Use `.env` to select providers:

```env
OPENISSUE_EMBEDDINGS_PROVIDER=minilm-l6
OPENISSUE_EMBEDDINGS_FALLBACK_PROVIDER=bge-small
```

Provider keys:

- `minilm-l6` -> `sentence-transformers/all-MiniLM-L6-v2`
- `bge-small` -> `BAAI/bge-small-en-v1.5`

Provider behavior:

- embeddings are L2-normalized (`normalize_embeddings=True`)
- tokenizer sequence length is capped at 256 tokens (`max_seq_length=256`)
- MiniLM output dimension is 384 vectors per text

## Runtime assumptions

- first provider load downloads model files from Hugging Face and caches locally
- local dev requires Python environment that can install `sentence-transformers` and its torch dependency
- embedding calls are synchronous and CPU-compatible; GPU acceleration is optional
