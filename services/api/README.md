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

Implementation placeholders raise `NotImplementedError` by design so later branches can add real behavior without fake completion.

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
