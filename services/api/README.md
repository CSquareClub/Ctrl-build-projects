# OpenIssue Backend Service (`services/api`)

This folder hosts the FastAPI backend foundation for OpenIssue.

## What exists in this branch

- app bootstrap (`app/main.py`)
- explicit settings loading via `pydantic-settings` (`app/core/settings.py`)
- API router wiring (`app/api/router.py`)
- health route (`GET /api/health`)
- similar issues retrieval route (`POST /api/similar-issues`)
- contract-first module boundaries for:
  - `app/schemas`
  - `app/core`
  - `app/github`
  - `app/embeddings`
  - `app/vectorstore`
  - `app/triage`

Some modules still intentionally expose `NotImplementedError` placeholders where Wave 2/3 work is pending.

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

## Similar issues retrieval

`POST /api/similar-issues`

This endpoint runs a real retrieval path:

1. fetch and normalize repository issues from GitHub
2. embed issue canonical text through the embedding provider layer
3. upsert vectors into the vector store adapter
4. embed the target issue (by issue number or payload)
5. query top-k vector neighbors and return stable candidate objects

Canonical embedding path:

- default provider: `OPENISSUE_EMBEDDING_PROVIDER=minilm`
- model: `sentence-transformers/all-MiniLM-L6-v2`

Explicit non-canonical fallback:

- `OPENISSUE_EMBEDDING_PROVIDER=hashing`
- only for local/debug fallback when MiniLM is unavailable

Response includes:

- `embedding_provider` (actual provider/model used)
- `vector_index` (vector index implementation identity)
- `embedding_path` (`canonical-minilm` or `non-canonical-fallback`)

Example request using a repository issue as target:

```json
{
  "owner": "microsoft",
  "repo": "vscode",
  "issue_number": 1,
  "k": 5,
  "state": "all"
}
```

Example request using a normalized payload as target:

```json
{
  "owner": "microsoft",
  "repo": "vscode",
  "target_issue": {
    "title": "Crash when opening settings",
    "body": "VS Code crashes after update when opening Settings UI",
    "labels": ["bug"],
    "state": "open"
  },
  "k": 5,
  "state": "all"
}
```

Candidate responses include stable fields intended for Wave 3 reranking:

- `issue_id`
- `issue_number`
- `title`
- `html_url`
- `api_url`
- `similarity_score`
- `state`
- `labels`
- `metadata` (source, timestamps, comment count, author, raw metadata)
