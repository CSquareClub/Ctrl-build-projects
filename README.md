# OpenIssue — AI-Assisted GitHub Issue Triage for Open Source Teams

OpenIssue helps maintainers quickly fetch, analyze, and prioritize GitHub issues (plus detect potential duplicates) using a FastAPI + React workflow built for Ctrl + Build (6–7 April 2026).

![Hackathon](https://img.shields.io/badge/Ctrl%20%2B%20Build-2026-blue)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-61DAFB)

## Problem

- Open-source repositories receive issues with inconsistent quality and unclear priority.
- Maintainers lose time manually triaging and identifying duplicate reports.
- Hackathon teams need a clear, demo-ready, reproducible project with strong GitHub collaboration hygiene.

## Solution Overview

- Fetch issues from any GitHub repository using `owner/repo` input format.
- Analyze each issue for optional classification, priority score, and duplicate likelihood.
- Provide a clean UI so maintainers can review triage suggestions quickly.
- Keep setup simple so judges can run locally in under 10 minutes.

## Key Features

### MVP

- Repository issue fetch by `owner/repo`
- Issue analysis endpoint with:
  - classification (optional)
  - priority scoring
  - similar/duplicate issue suggestions
- Frontend dashboard for issue list + analysis results
- Health check + API-first design for easy testing/demo

### Optional / Advanced

- Configurable similarity engine:
  - baseline text similarity (default)
  - embeddings-based similarity (if enabled/configured)
- Token-authenticated GitHub API calls for higher limits and reliability

### Known Limitations

- Duplicate detection quality depends on issue text quality and selected similarity mode.
- GitHub unauthenticated requests are rate-limited more aggressively.
- Priority scoring is assistive, not a final maintainer decision.

## Architecture

```text
[React + Tailwind UI]
        |
        v
 [FastAPI Backend/API]
   |      |       |
   |      |       +--> AI/Scoring Logic (classification, priority, similarity)
   |      |
   +----> GitHub Issues Fetcher (GitHub REST API)
```

The frontend collects repo + issue input, the backend fetches GitHub issues and runs analysis logic, then returns structured triage insights to the UI.

## Tech Stack

- **Backend:** Python, FastAPI
- **Frontend:** React, Tailwind CSS
- **Data Source:** GitHub REST API
- **AI/Triage Logic:** classification + priority + duplicate similarity (baseline/embeddings by config)

## Quick Demo

1. Start backend and frontend locally.
2. Open the frontend app in your browser.
3. Enter repository as `owner/repo` (example: `facebook/react`).
4. Click **Fetch Issues** and select an issue from the list.
5. Click **Analyze** to view classification (if enabled), priority score, and potential duplicates.
6. Use results to decide triage action.

## Local Setup

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Git
- (Recommended) GitHub Personal Access Token for better API rate limits

### Clone

```bash
git clone <YOUR_REPO_URL>
cd Ctrl-build-projects
```

### Backend setup (venv, install, run)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend setup (install, run)

```bash
cd frontend
npm install
npm run dev
```

### Environment variables

#### `backend/.env` (example)

```env
# Required app settings
API_HOST=0.0.0.0
API_PORT=8000

# GitHub (recommended to avoid low rate limits)
GITHUB_TOKEN=ghp_your_token_here

# Optional model/similarity configuration
SIMILARITY_MODE=baseline   # baseline | embeddings
EMBEDDINGS_PROVIDER=your_provider_if_used
EMBEDDINGS_API_KEY=your_embeddings_api_key_here
```

#### `frontend/.env` (example)

```env
VITE_API_BASE_URL=http://localhost:8000
```

> **Token requirement:** You can run without `GITHUB_TOKEN`, but rate limits are much stricter.  
> **Repo input format:** always use `owner/repo` (e.g., `microsoft/vscode`).

## API Endpoints

### `GET /health`

Check API status.

```bash
curl -X GET "http://localhost:8000/health"
```

### `POST /issues`

Fetch issues for a repository.

```bash
curl -X POST "http://localhost:8000/issues" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "owner/repo",
    "state": "open",
    "limit": 20
  }'
```

### `POST /analyze`

Analyze a single issue for classification (optional), priority, and duplicates.

```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "owner/repo",
    "issue_number": 123,
    "include_classification": true,
    "similarity_mode": "baseline"
  }'
```

## Screenshots / GIFs

- App Home: `/docs/screenshots/home.png`
- Issue List Loaded: `/docs/screenshots/issues-list.png`
- Analysis Result View: `/docs/screenshots/analysis-result.png`
- Demo Flow GIF: `/docs/gifs/demo-flow.gif`

## Project Structure

```text
.
├── backend
│   ├── app
│   ├── requirements.txt
│   └── .env.example
├── frontend
│   ├── src
│   ├── package.json
│   └── .env.example
├── docs
│   ├── screenshots
│   └── gifs
└── README.md
```

## Contributing

### Branching model

- Create feature branches from `main`:
  - `feature/<short-name>`
  - `fix/<short-name>`
- Open PRs for all changes (no direct pushes to `main`).
- Require at least one review before merge.

### Commit message convention

Use conventional prefixes:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`
- `test: ...`

### How to run tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm test
```
##Made by: Team AsLongAsItWorks
###Members:
1. Priyanshu (Delegation, Pitch && Backend)
2. Khyat Ghosh (UI & Frontend)
3. Parth Sharma (AI Login and Integration)

## License

This project is released under the **MIT License**. See `LICENSE` for details.

## Acknowledgements

- Built during **Ctrl + Build Hackathon (6–7 April 2026)**.
- Thanks to the open-source ecosystem and maintainers.
- Libraries/frameworks used: **FastAPI**, **React**, **Tailwind CSS**, and the **GitHub API**.
