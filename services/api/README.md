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
  - `POST /api/similar-issues`
- classification + label suggestion route support:
  - `POST /api/classification`
- unified analyze route support:
  - `POST /api/analyze`
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

## Classify issue type and suggest labels

Classify one issue and return explainable type/label reasoning:

```bash
curl -X POST http://127.0.0.1:8000/api/classification \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "vercel",
    "repo": "next.js",
    "k": 5,
    "target_issue": {
      "title": "Build crashes on Node 22",
      "body": "Steps to reproduce: run next build on Node 22. Actual behavior: process exits with error.",
      "labels": []
    }
  }'
```

Response includes a stable `predicted_type` in:

- `bug`
- `feature_request`
- `documentation`
- `support_question`
- `spam_or_noise`

Neighbor evidence note:

- retrieval evidence is used for label hints only
- type classification stays lexical-first for stability and explainability

## Analyze issue (Wave 4 integration)

`POST /api/analyze` now returns the canonical analyze payload used by frontend contract helpers.

Example request:

```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "vercel",
    "repo": "next.js",
    "k": 5,
    "target_issue": {
      "title": "Build crashes on Node 22",
      "body": "Steps to reproduce: run next build on Node 22. Actual behavior: process exits with error.",
      "labels": []
    }
  }'
```

Response shape uses canonical nested sections:

- `predicted_type`
- `suggested_labels`
- `duplicate_candidates`
- `priority`
- `missing_information`
- `explanation`

This route does not introduce an alternate envelope; it returns `AnalyzeResponse` at the root.

## Issue list query compatibility

`GET /api/issues` accepts either:

- `owner` + `repo` query params
- `repo=owner/repo` (frontend-compatible shorthand)

If both are omitted or malformed, the endpoint returns HTTP `422` with a clear contract error message.

## Duplicate candidate reranking (Wave 3)

`POST /api/similar-issues` now performs a two-stage duplicate retrieval flow:

1. semantic candidate generation from MiniLM cosine similarity in the vector store
2. explicit reranking with overlap-based heuristics and explainable reasons

Rerank signals include:

- title token overlap
- body keyword overlap
- exception/error token overlap
- file/module token overlap
- version marker overlap
- label overlap
- semantic similarity from MiniLM retrieval
- state and recency adjustments

Each candidate now includes:

- `similarity_score` (raw semantic cosine from vector retrieval)
- `rerank_score` (weighted lexical/metadata rerank score)
- `final_score` (rerank score after state/recency adjustments)
- `duplicate_confidence` (bounded confidence used for duplicate cards)
- `reasons` (structured signal explanations with strengths)

The response also includes top-level `duplicate_confidence` and
`calibration_notes` to clarify that MiniLM score ranges can vary by repository
and no hard duplicate threshold is enforced yet.

Design notes:

- uses weighted lexical and issue-structure heuristics (no proprietary model)
- optionally applies conservative neighbor evidence from Wave 2 similar candidates
- keeps output stable with `predicted_type` + `suggested_labels`
- returns UI-friendly reasoning fields (`type_reasoning`, `label_reasoning`, `neighbor_evidence_*`)

Neighbor evidence is intentionally ignored when candidate confidence is weak, to avoid noisy label transfer.

## Unified analyze response

Run end-to-end issue analysis in one request:

```bash
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "psf",
    "repo": "requests",
    "k": 5,
    "target_issue": {
      "title": "Requests crashes with proxy auth header",
      "body": "Steps to reproduce: configure proxy auth and call requests.get. Actual behavior: raises ProxyError and stack trace.",
      "labels": []
    }
  }'
```

Response uses canonical `AnalyzeResponse` sections:

- `predicted_type`
- `suggested_labels`
- `duplicate_candidates`
- `priority`
- `missing_information`
- `explanation`
