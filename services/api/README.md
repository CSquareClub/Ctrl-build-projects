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
- local vector indexing/query route support:
  - `POST /api/vectors/index`
  - `POST /api/vectors/query`
- explainable Wave 3 classification + label suggestion primitives:
  - `app/triage/classification.py`
  - `ClassificationLabelingService` in `app/triage/service.py`

## Vector indexing layer

This branch includes a local, swappable vector indexing path for normalized issues:

- embedding provider boundary (`app/embeddings/contracts.py`)
- canonical semantic embedding implementation (`minilm-local` via `sentence-transformers/all-MiniLM-L6-v2`)
- vector store boundary (`app/vectorstore/contracts.py`)
- local persistent SQLite vector store (`sqlite-local`)
- indexing/query orchestration service (`app/vectorindex/service.py`)

The vector layer is intentionally local/free-first and replaceable for later branches.

### Reindex/invalidation behavior

- Each stored vector row is tagged with an `embedding_signature` (provider + model + dimension).
- Queries only search rows matching the active runtime signature.
- On indexing, if a repository already has rows from a different signature (for example older hashing vectors), the repository slice is cleared before MiniLM upsert continues.
- This prevents mixed placeholder/semantic indexes from silently masquerading as one index.

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

## Index issues and query similar candidates

Index normalized issues from a repository:

```bash
curl -X POST http://127.0.0.1:8000/api/vectors/index \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "vercel",
    "repo": "next.js",
    "state": "open",
    "include_pull_requests": false
  }'
```

Query top-k similar issue candidates:

```bash
curl -X POST http://127.0.0.1:8000/api/vectors/query \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "build fails on arm64",
    "k": 5,
    "owner": "vercel",
    "repo": "next.js"
  }'
```

The index response includes:

- `embedding_provider`
- `embedding_model`
- `embedding_signature`
- `reindex_required`
- `cleared_count`

These fields indicate whether stale rows were invalidated before indexing.

## Wave 3 classification and labels

Wave 3 adds a deterministic, explainable classification layer for the categories:

- `bug`
- `feature_request`
- `documentation`
- `support_question`
- `spam_or_noise`

Design notes:

- uses weighted lexical and issue-structure heuristics (no proprietary model)
- optionally applies conservative neighbor evidence from Wave 2 similar candidates
- keeps output stable with `predicted_type` + `suggested_labels`
- returns UI-friendly reasoning fields (`type_reasoning`, `label_reasoning`, `neighbor_evidence_*`)

Neighbor evidence is intentionally ignored when candidate confidence is weak, to avoid noisy label transfer.
