# PLAN.md

## Execution Update (2026-04-06): Wave 2 semantic embedding correction (MiniLM)

Current goal:

- correct Wave 2 vector indexing so canonical semantic retrieval runs on real `sentence-transformers/all-MiniLM-L6-v2` embeddings (not hashing placeholders)

Exact scope:

- replace default embedding path with real MiniLM provider under existing embedding abstraction
- refine vector store/indexing contracts to track embedding signatures and prevent silent mixed indexes
- implement stale-index invalidation/reindex behavior when repository vectors were built with a different signature
- preserve retrieval metadata for downstream reranking/display while keeping vector layer local + swappable

Files/components likely affected:

- `services/api/app/embeddings/contracts.py`
- `services/api/app/embeddings/service.py`
- `services/api/app/core/settings.py`
- `services/api/app/core/dependencies.py`
- `services/api/app/vectorstore/contracts.py`
- `services/api/app/vectorstore/service.py`
- `services/api/app/vectorindex/contracts.py`
- `services/api/app/vectorindex/service.py`
- `services/api/app/schemas/vector.py`
- `services/api/app/routes/vectors.py`
- `services/api/requirements.txt`
- `services/api/.env.example`
- `services/api/README.md`

Sequencing:

1. inspect current hashing-based embedding and index flow
2. add MiniLM embedding provider and switch default provider config
3. add embedding-signature-aware storage/query/invalidation behavior
4. wire indexing responses to expose reindex/invalidation status clearly
5. validate real MiniLM indexing/query on real normalized issue data

Validation strategy:

- compile backend modules
- run real index+query smoke test against public repo using MiniLM provider
- verify stale hashed/placeholder vectors are excluded or invalidated during reindex

Risks / open questions:

- first MiniLM run may download model weights and can be slower
- local SQLite cosine scan remains MVP-oriented and may not scale to large corpora
- existing pre-correction rows without embedding signatures may become legacy/orphan entries and should not be used for canonical retrieval

Explicitly out of scope:

- duplicate reranking heuristics
- production vector infrastructure
- paid hosted embedding/vector services
- frontend UX work

## Execution Update (2026-04-06): Wave 2 vector indexing foundation

Current goal:

- implement local-first vector indexing and similarity query infrastructure for normalized issues on `feat/w2-vector-indexing`

Exact scope:

- define a concrete, swappable vector store interface implementation (local SQLite)
- implement issue vector upsert and top-k query flows using the embedding provider boundary
- build an indexing pipeline that accepts normalized issues and stores retrieval-ready metadata
- expose lightweight API routes for indexing and querying without coupling retrieval logic to endpoint internals
- keep dependencies local/free and avoid production infra complexity

Files/components likely affected:

- `services/api/app/vectorstore/contracts.py`
- `services/api/app/vectorstore/service.py`
- `services/api/app/embeddings/service.py`
- `services/api/app/core/settings.py`
- `services/api/app/core/dependencies.py`
- `services/api/app/schemas/vector.py` (new)
- `services/api/app/vectorindex/*` (new)
- `services/api/app/routes/vectors.py` (new)
- `services/api/app/api/router.py`
- `services/api/.env.example`
- `services/api/README.md`

Sequencing:

1. inspect current normalization + embedding + vectorstore placeholders and lock interfaces
2. implement concrete local vector store and deterministic local embedding provider
3. implement normalized-issue indexing and similarity query orchestration service
4. wire thin routes that call the orchestration service
5. validate compile + index/query behavior on real normalized GitHub issue data

Validation strategy:

- run Python compile checks
- run a local index+query script against a public repository via existing ingestion normalization
- verify top-k query returns candidates with preserved metadata fields

Risks / open questions:

- hash-based local embeddings are deterministic and free, but quality is lower than transformer embeddings
- SQLite scan-based similarity query is acceptable for MVP scale but not optimized for large corpora
- existing repo has both `schemas/issue.py` and `schemas/issues.py`; this work must avoid widening that mismatch

Explicitly out of scope:

- full duplicate reranking heuristics
- production vector infrastructure
- paid/proprietary embedding APIs
- frontend retrieval UX changes

## Execution Update (2026-04-06): Wave 0 backend foundation

Current goal:

- establish a clean FastAPI backend foundation on `chore/w1-backend-foundation`

Exact scope:

- scaffold `services/api` with app bootstrap, route wiring, and health endpoint
- define explicit config/env loading path
- create stable module boundaries for `schemas`, `core`, `github`, `embeddings`, `vectorstore`, and `triage`
- add lightweight backend run documentation for follow-on branches

Files/components likely affected:

- `services/api/app/main.py`
- `services/api/app/core/*`
- `services/api/app/api/*`
- `services/api/app/schemas/*`
- `services/api/app/github/*`
- `services/api/app/embeddings/*`
- `services/api/app/vectorstore/*`
- `services/api/app/triage/*`
- `services/api/.env.example`
- `services/api/requirements.txt`
- `services/api/README.md`

Sequencing:

1. create backend directory structure and package markers
2. implement settings/config and app bootstrap
3. wire API router and health route
4. add boundary interfaces/stubs for future ingestion, embeddings, vectorstore, and triage logic
5. validate import/startup/health behavior with local commands

Validation strategy:

- run Python bytecode compile for backend package
- run FastAPI app startup command if dependencies are available
- call health route via local HTTP request

Risks / open questions:

- local environment may not have FastAPI dependencies installed yet
- avoid overcommitting to long-term interfaces before Wave 1/2 implementation details settle

Explicitly out of scope:

- real GitHub ingestion implementation
- real embedding generation/indexing
- triage heuristic logic and scoring internals
- deployment/infra automation

## Project

OpenIssue (current repo still uses some legacy `Synapse` naming in frontend UI)

## Goal for this branch

Freeze Wave 1 contracts against the repository as it exists **today**, with a strong focus on:

- repo input contract
- normalized issue list contract
- frontend-to-backend mapping
- explicit mismatch documentation

This branch is contract/documentation alignment only. No deep feature implementation.

---

## 1) Repo reality check (source of truth: current code)

### 1.1 Current structure in repo

- `frontend/` (Next.js + React + Tailwind, JavaScript)
- `AGENTS.md` (agent operating contract)
- `PLAN.md` (this file)
- `openSource-1.md` (hackathon prompt)
- root `README.MD` (minimal)

### 1.2 What is implemented right now

The app in `frontend/pages/index.js` is a GitHub repository viewer that fetches directly from GitHub REST API in the browser:

- repo metadata: `GET /repos/{owner}/{repo}`
- owner profile: `GET /users/{owner}`
- commit list: `GET /repos/{owner}/{repo}/commits`
- pull request list: `GET /repos/{owner}/{repo}/pulls`
- issue list: `GET /repos/{owner}/{repo}/issues` filtered to non-PRs

No backend service exists yet in this repository.

### 1.3 Frontend data surfaces actually consumed

From `frontend/pages/index.js` and child components:

- `repoData` fields used: `full_name`, `description`, `stargazers_count`, `forks_count`, `watchers_count`, `open_issues_count`
- `repoOwner` fields used via `UserProfile`: `login`, `avatar_url`, `followers`, `following`, `bio`, `company`, `location`, `blog`
- commit item shape used by `ActivitiesCard`: `sha`, `message`, `author`, `timestamp` (already relative time string)
- pull request item shape used by `PullRequestsCard`: `id`, `number`, `title`, `state`, `createdAt` (already relative time string)
- issue item shape used by `IssuesCard`: `id`, `number`, `title`, `state`, `createdAt` (already relative time string)

This is the real baseline for Wave 1 contract alignment.

---

## 2) Wave 1 scope lock (contracts only)

### 2.1 In scope

- define stable repo input contract for issue listing
- define stable normalized issue list contract
- define mapping from backend payload to current frontend issue list expectations
- document current mismatches and compatibility rules

### 2.2 Out of scope

- classification logic
- duplicate detection logic
- priority scoring logic
- embedding/vector implementation
- paid API integration
- frontend redesign/rebuild

---

## 3) Contract freeze: repo input

Wave 1 issue-list requests will use a simple repo locator input.

### 3.1 Canonical input contract

`RepoRefInput`

```json
{
  "owner": "string",
  "repo": "string",
  "token": "string|null",
  "source": "github"
}
```

Rules:

- `owner`: required GitHub owner/org name
- `repo`: required repository name
- `token`: optional personal access token (or omitted if server-side token strategy is used)
- `source`: fixed to `github` for Wave 1

### 3.2 Accepted frontend entry forms

Frontend currently accepts:

- `owner/repo`
- full URL containing `github.com/{owner}/{repo}`

Backend contract remains normalized to `{ owner, repo }`.

---

## 4) Contract freeze: normalized issue list

Wave 1 canonical list item shape for backend responses:

### 4.1 `NormalizedIssueListItem`

```json
{
  "id": "number",
  "number": "number",
  "title": "string",
  "state": "open|closed",
  "created_at": "ISO-8601 string",
  "updated_at": "ISO-8601 string",
  "author_login": "string|null",
  "html_url": "string",
  "labels": [
    {
      "name": "string",
      "color": "string|null"
    }
  ],
  "comment_count": "number",
  "is_pull_request": false,
  "canonical_text": "string",
  "metadata": {
    "repository": "owner/repo",
    "source": "github"
  }
}
```

Wave 1 list endpoint returns:

```json
{
  "repo": {
    "owner": "string",
    "name": "string",
    "full_name": "string"
  },
  "issues": ["NormalizedIssueListItem"],
  "total": "number"
}
```

### 4.2 Canonical text rule (locked)

`canonical_text` is built from:

- `title`
- `body` (if present)

Comments are not included in Wave 1 canonical text.

---

## 5) Mapping: current frontend expectations vs backend payload

Current `IssuesCard` expects this lightweight shape:

```json
{
  "id": 123,
  "number": 42,
  "title": "Issue title",
  "state": "open",
  "createdAt": "2h ago"
}
```

Backend should return normalized issues (Section 4). Frontend adapter mapping for list card:

- `id` <- `issues[i].id`
- `number` <- `issues[i].number`
- `title` <- `issues[i].title`
- `state` <- `issues[i].state`
- `createdAt` <- derived client/server display string from `issues[i].created_at`

Compatibility note:

- frontend currently uses preformatted relative time (`createdAt`)
- normalized contract stores source-of-truth timestamp (`created_at`)
- rendering layer should compute relative label to avoid data drift and locale issues

---

## 6) Explicit mismatches (frontend vs backend target)

### 6.1 Data source boundary mismatch

- Current: frontend calls GitHub API directly from browser.
- Target: frontend calls backend issue-list endpoint using normalized contracts.

Impact:

- token handling currently client-side (`localStorage`)
- rate-limit behavior tied to client token state
- no stable backend-owned contract yet

### 6.2 Time field mismatch

- Current UI list items expect `createdAt` already humanized (`2h ago`).
- Contract target uses `created_at` ISO timestamp.

Impact:

- adapter needed when integrating list endpoint

### 6.3 Scope mismatch in current UI vs triage product direction

- Current UI surfaces commit history and pull requests alongside issues.
- Wave 1 contract focus is issue ingestion/listing for triage.

Impact:

- commits/PR payloads should not block issue-list contract rollout
- keep them optional/separate from issue-list contract

### 6.4 Naming mismatch

- Current frontend branding and package naming still reference `Synapse` / `github-profile-frontend`.
- Product/docs target `OpenIssue` triage assistant.

Impact:

- documentation must continue to state canonical product intent; rename work can be separate

### 6.5 Runtime stack mismatch with long-term architecture target

- Current repo has no Python/FastAPI service yet.
- AGENTS target architecture includes Python backend.

Impact:

- contracts must remain language-agnostic JSON and swappable

---

## 7) Simple swappable architecture boundary (Wave 1)

Keep boundary minimal and replaceable:

- frontend consumes HTTP JSON only
- backend owns GitHub ingestion + normalization
- normalization output is stable, independent of embedding/scoring modules

Do not couple Wave 1 contract to:

- any specific embedding provider implementation
- vector database schema
- downstream analysis score fields

---

## 8) Suggested endpoint for Wave 1 handoff

Primary list endpoint contract for later branches:

`POST /api/repos/issues`

Request:

```json
{
  "owner": "vercel",
  "repo": "next.js",
  "token": null,
  "source": "github"
}
```

Response:

```json
{
  "repo": {
    "owner": "vercel",
    "name": "next.js",
    "full_name": "vercel/next.js"
  },
  "issues": [
    {
      "id": 1,
      "number": 123,
      "title": "Build fails on arm64",
      "state": "open",
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-01T12:00:00Z",
      "author_login": "octocat",
      "html_url": "https://github.com/vercel/next.js/issues/123",
      "labels": [{ "name": "bug", "color": "d73a4a" }],
      "comment_count": 4,
      "is_pull_request": false,
      "canonical_text": "Build fails on arm64\n...",
      "metadata": {
        "repository": "vercel/next.js",
        "source": "github"
      }
    }
  ],
  "total": 1
}
```

---

## 9) Sequencing for next branches

1. Implement backend endpoint that returns Section 4 shape exactly.
2. Add frontend adapter from `created_at` -> `createdAt` for current `IssuesCard`.
3. Switch issue list source from direct GitHub call to backend endpoint.
4. Keep PR/commit panels unchanged until dedicated contracts are defined.

---

## 10) Validation strategy for this contract phase

For this branch (docs/contracts only):

- verify all contracts are internally consistent in this file
- verify mapping fields match currently consumed frontend props
- verify mismatches are explicitly listed (no hidden assumptions)

For implementation branches:

- add contract tests or response-shape assertions
- run frontend build and lint after wiring adapter
- smoke-test with at least one public repository

---

## 11) Risks / open follow-ups

- root docs and frontend docs still describe profile-viewer behavior; triage-focused docs consolidation needed in a later docs pass
- token strategy is currently browser-local; backend auth/token handling needs a secure approach before production
- if frontend switches to TypeScript later, define shared runtime schema validation to prevent drift

This file is now the Wave 1 contract baseline and should be treated as canonical unless explicitly changed by human instruction.
