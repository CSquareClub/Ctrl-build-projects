# PLAN.md

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

OpenIssue

## Objective

Build a convincing, end-to-end GitHub issue triage assistant that helps maintainers process noisy issues faster through:

- issue classification
- duplicate detection
- priority scoring
- label suggestion
- missing-information detection

This plan assumes a **fully open-source model path** for the current phase.

---

# 1) Product framing

## 1.1 Core problem

Maintainers waste time on:

- duplicate issues
- vague bug reports
- unprioritized issue queues
- missing labels
- noisy low-quality reports

## 1.2 Core promise

Given a GitHub issue, OpenIssue should help answer:

- What kind of issue is this?
- How urgent is it?
- Is it likely a duplicate?
- What labels should be applied?
- What information is missing?

## 1.3 Primary target user

Repository maintainers.

## 1.4 Non-goals for MVP

Out of scope unless explicitly re-added later:

- generic GitHub profile analytics
- contributor social graphs
- broad repo health dashboards
- complex RBAC systems
- enterprise audit/logging platforms
- multi-provider issue systems beyond GitHub

---

# 2) Locked technical decisions

## 2.1 Frontend

- Next.js
- TypeScript
- dashboard-style triage UX

## 2.2 Backend

- Python
- FastAPI
- modular analysis pipeline

## 2.3 Embeddings

Primary:

- `BAAI/bge-small-en-v1.5`

Fallback:

- `sentence-transformers/all-MiniLM-L6-v2`

## 2.4 Vector search

Use a free/local vector solution with persistent storage.
Keep the vector layer swappable behind an interface.

## 2.5 Analysis strategy

Hybrid, not embedding-only:

- semantic retrieval for candidate recall
- heuristics for classification and priority
- heuristic reranking for duplicate precision
- optional reranker model later if needed

## 2.6 API style

Structured JSON contracts between frontend and backend.
The frontend should never contain hidden business logic for analysis.

---

# 3) System design

## 3.1 High-level flow

1. ingest GitHub issues from a repository
2. normalize issue text
3. generate/store embeddings for historical issues
4. analyze a target issue
5. retrieve similar historical issues
6. classify issue type
7. compute priority score
8. generate label suggestions
9. detect missing information
10. return structured triage result to frontend

## 3.2 Architecture

Frontend (Next.js)
→ Backend API (FastAPI)
→ Issue ingestion layer
→ Embedding provider
→ Vector retrieval layer
→ Heuristic analysis layer
→ Result formatter
→ Frontend render

---

# 4) Core modules

## 4.1 GitHub ingestion module

Responsibilities:

- fetch issues for a repo
- fetch issue details
- normalize issue payloads
- filter out pull requests if needed
- cache issue metadata for analysis

Inputs:

- repo owner
- repo name
- optional auth token

Outputs:

- normalized issue records

## 4.2 Normalization module

Responsibilities:

- construct canonical issue text
- strip obvious noise
- preserve important lexical cues
- extract structured metadata

Canonical text default:

- title
- body

Extracted metadata examples:

- labels
- created_at
- updated_at
- state
- comment_count
- author
- whether template fields exist

## 4.3 Embedding provider module

Responsibilities:

- create embeddings for issue text
- support provider swapping without changing callers

Initial provider:

- BGE small

Fallback provider:

- MiniLM

Suggested interface:

- `embed_one(text) -> vector`
- `embed_many(texts) -> vectors`
- `provider_name() -> str`
- `vector_dim() -> int`

## 4.4 Vector index module

Responsibilities:

- upsert issue vectors
- retrieve top-k similar issues
- support metadata filtering
- expose similarity scores

Suggested interface:

- `upsert(issue_id, vector, metadata)`
- `query(vector, k, filters=None)`
- `delete(issue_id)`

## 4.5 Duplicate analysis module

Responsibilities:

- generate candidate duplicates
- rerank candidates
- assign duplicate confidence
- explain why candidates are similar

Pipeline:

1. retrieve top-k by vector similarity
2. compute rerank features
3. produce final ordered duplicate list

Rerank features may include:

- title token overlap
- shared stack trace fragments
- shared error code / exception name
- shared filenames / modules
- shared version strings
- shared labels / components
- recency / status adjustments

## 4.6 Classification module

Responsibilities:

- predict issue type
- suggest labels
- explain evidence

Initial categories:

- bug
- feature_request
- documentation
- support_question
- spam_or_noise

Classification signals:

- lexical phrases
- template completeness
- historical nearest labeled issues
- issue structure quality
- metadata clues

## 4.7 Priority scoring module

Responsibilities:

- assign a numeric score
- map score to priority band
- return reasons

Example score bands:

- 0–24: low
- 25–49: medium
- 50–74: high
- 75–100: critical

Initial score signal groups:

- severity indicators
- user impact indicators
- regression indicators
- duplication density
- report quality
- reproduction quality
- security/auth/data-loss/crash markers

## 4.8 Missing-info detector

Responsibilities:

- detect when an issue is too vague
- suggest what the reporter should add

Checks:

- reproduction steps missing
- expected vs actual behavior missing
- logs/screenshots absent
- environment/version absent
- overly short / generic body

## 4.9 Result formatting module

Responsibilities:

- convert analysis outputs into stable API responses
- keep response contracts frontend-friendly

---

# 5) Suggested data contracts

## 5.1 NormalizedIssue

Fields:

- `id`
- `number`
- `title`
- `body`
- `state`
- `labels`
- `created_at`
- `updated_at`
- `html_url`
- `author`
- `comment_count`
- `canonical_text`
- `metadata`

## 5.2 SimilarIssueCandidate

Fields:

- `issue_id`
- `issue_number`
- `title`
- `html_url`
- `similarity_score`
- `rerank_score`
- `final_score`
- `reasons`

## 5.3 TriageResult

Fields:

- `issue_id`
- `predicted_type`
- `type_confidence`
- `priority_score`
- `priority_band`
- `priority_reasons`
- `duplicate_confidence`
- `similar_issues`
- `suggested_labels`
- `missing_information`
- `summary`
- `analysis_version`

---

# 6) API plan

## 6.1 `POST /api/repos/index`

Purpose:

- ingest and index issues for a repository

Input:

- owner
- repo
- token (optional or server-managed)
- reindex mode (optional)

Output:

- total issues seen
- total indexed
- skipped count
- provider used
- warnings

## 6.2 `POST /api/issues/analyze`

Purpose:

- analyze a single target issue

Input:

- repo reference
- issue number or normalized issue payload

Output:

- `TriageResult`

## 6.3 `GET /api/issues/similar`

Purpose:

- fetch similar issues for a target issue

Input:

- repo
- issue number
- k

Output:

- ordered similar issue candidates

## 6.4 `GET /api/issues`

Purpose:

- list available issues for the frontend

Input:

- repo
- filters

Output:

- issue summaries

## 6.5 Optional later: `POST /api/webhooks/github`

Purpose:

- react to newly opened issues
- auto-run triage

Not required for MVP.

---

# 7) Directory target

Suggested repo structure:

- `apps/web/` → Next.js frontend
- `services/api/` → FastAPI backend
- `services/api/app/core/` → config, settings, shared infra
- `services/api/app/github/` → ingestion + normalization
- `services/api/app/embeddings/` → provider abstraction + model loading
- `services/api/app/vectorstore/` → vector DB adapter
- `services/api/app/triage/` → duplicate, classification, priority, missing-info logic
- `services/api/app/schemas/` → pydantic models / contracts
- `docs/` → architecture notes, API examples, evaluation notes
- `PLAN.md` → living execution plan
- `AGENTS.md` → agent operating rules

If a different structure is chosen later, keep the same separation of concerns.

---

# 8) Wave plan

## Wave 0 — Foundation and contracts

Goal:

- lock architecture and interfaces before coding deep logic

Deliverables:

- repo structure
- backend/frontend boundary
- API schemas
- env var contract
- initial docs

Exit criteria:

- everyone can point to the same architecture
- no ambiguity about model policy or MVP scope

## Wave 1 — GitHub ingestion

Goal:

- fetch and normalize real repository issues

Deliverables:

- repo connection flow
- issue fetcher
- normalization logic
- issue listing endpoint

Exit criteria:

- real issues can be loaded and viewed
- canonical issue text exists

## Wave 2 — Embedding + vector indexing

Goal:

- generate embeddings and retrieve nearest issues

Deliverables:

- embedding provider abstraction
- BGE provider
- MiniLM fallback provider
- vector store adapter
- indexing endpoint or workflow
- top-k retrieval working

Exit criteria:

- a target issue returns semantically similar candidates

## Wave 3 — Brain layer v1

Goal:

- implement analysis logic beyond raw similarity

Deliverables:

- duplicate rerank heuristics
- classification heuristics
- priority scoring
- missing-information detector
- structured result object

Exit criteria:

- analysis output looks meaningfully useful, not just numeric

## Wave 4 — Frontend integration

Goal:

- surface real backend results in a usable triage UX

Deliverables:

- issue list
- issue detail panel
- analysis panel
- similar issue cards
- priority explanation
- suggested labels section

Exit criteria:

- user can click an issue and see real analysis

## Wave 5 — Polish and hackathon readiness

Goal:

- improve credibility and demo quality

Deliverables:

- README setup
- screenshots / demo prep
- better empty/loading/error states
- clearer explanations
- optional webhook or auto-comment draft if time permits

Exit criteria:

- app is demoable end-to-end
- mandatory deliverables are ready

---

# 9) Backend-first implementation sequence

This section is the preferred work order when backend/brain work is prioritized.

## Step 1

Define normalized issue schema and canonical text builder.

## Step 2

Implement GitHub ingestion + list endpoint.

## Step 3

Implement embedding provider abstraction.

## Step 4

Integrate BGE embedding generation.

## Step 5

Implement vector upsert/query path.

## Step 6

Return top-k similar issues for one issue.

## Step 7

Add duplicate reranking heuristics.

## Step 8

Add classification heuristics.

## Step 9

Add priority scoring heuristics.

## Step 10

Add missing-info detection.

## Step 11

Unify all analysis outputs under one response contract.

## Step 12

Integrate frontend panel against real API output.

---

# 10) Heuristic design notes

## 10.1 Duplicate detection heuristics

Candidate features:

- title n-gram overlap
- body keyword overlap
- exception/error token overlap
- filename/module overlap
- version overlap
- label overlap
- semantic similarity
- issue state/recency adjustments

Output should include reasons such as:

- “same exception name”
- “same module path”
- “very similar title phrasing”
- “same version range mentioned”

## 10.2 Classification heuristics

Examples:

- bug → words like error, crash, broken, expected/actual, reproduce
- feature_request → request, proposal, add support, enhancement
- documentation → docs, typo, readme, guide, example
- support_question → how do I, help, usage question, configuration question
- spam_or_noise → very short, off-topic, promotional, incoherent

Historical nearest neighbors can strengthen category evidence.

## 10.3 Priority heuristics

High-value positive signals:

- crash
- auth failure
- security issue
- regression
- data loss
- production broken
- many similar issues
- strong repro steps

Negative or dampening signals:

- low-information request
- support-style question
- vague issue with no evidence
- cosmetic/non-blocking language

## 10.4 Missing-info heuristics

Flags:

- no repro steps
- no expected/actual split
- no environment info
- no version info
- no logs/screenshots for error issue
- body too short

---

# 11) Evaluation plan

## 11.1 What “good” means for MVP

The system should be judged on whether it helps a maintainer make a faster decision.

A good result should:

- identify a plausible type
- surface useful duplicate candidates
- assign a reasonable urgency
- explain itself
- feel actionable

## 11.2 Manual evaluation checklist

For sample issues, ask:

- are top duplicate candidates reasonable?
- is the priority band defensible?
- are suggested labels plausible?
- does the system catch weak issue reports?
- do explanations feel trustworthy?

## 11.3 Demo-quality threshold

Do not chase benchmark purity at the cost of shipping.
A believable, explainable, usable system beats an overbuilt one.

---

# 12) Risks and mitigations

## Risk 1: embedding quality is not enough

Mitigation:

- use heuristic reranking
- preserve lexical anchors
- tune candidate generation
- keep model swappable

## Risk 2: GitHub issues are noisy

Mitigation:

- normalize input
- strip obvious clutter
- focus on title + body first
- detect low-information issues explicitly

## Risk 3: too much time spent on infra

Mitigation:

- keep stack minimal
- avoid overbuilding auth or deployment
- choose local-first free tooling

## Risk 4: frontend becomes a fake shell

Mitigation:

- integrate only against real backend responses
- prefer one real panel over many fake pages

## Risk 5: scope drift

Mitigation:

- return to the three MVP pillars
- classify
- detect duplicates
- score priority

---

# 13) Definition of success for the hackathon

Success is not “we built a lot.”

Success is:

- real GitHub issue ingestion
- real analysis path
- real similar-issue retrieval
- real priority scoring
- real triage UI
- clean README and setup
- convincing demo story

---

# 14) Open follow-ups for later

Not for current implementation unless explicitly prioritized:

- webhook-triggered auto triage
- auto-comment suggestion generator
- reranker model beyond heuristics
- feedback loops from maintainer label corrections
- multi-repo indexing
- better issue-template parsing
- auth polish
- hosted deployment hardening
