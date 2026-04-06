# AGENTS.md

## 0) Purpose

This repository builds **OpenIssue**, an intelligent GitHub issue triage assistant for maintainers.

The product goal is simple:

- analyze incoming GitHub issues
- classify them
- detect likely duplicates
- assign a transparent priority score
- suggest labels and next actions

This file defines the **universal operating contract** for all coding agents working in this repo, regardless of runtime:

- Codex CLI
- OpenCode
- GitHub Copilot-backed models inside OpenCode
- future compatible terminal/IDE agents

This file is intentionally written to avoid tool-specific assumptions.

---

## 1) Cross-runtime contract

### 1.1 Universal source-of-truth order

Unless a human explicitly overrides it in the prompt, follow this order of precedence:

1. direct human instruction
2. hard constraints in this file
3. `PLAN.md`
4. repo source code and tests
5. README / docs / comments

If `PLANS.md` also exists, treat `PLAN.md` as canonical unless the human says otherwise.

### 1.2 No tool-specific dependency assumptions

Do not assume the current environment supports any specific slash command, mode toggle, built-in planner, or subagent orchestration syntax.

Instead:

- use repo files and plain language
- write/update `PLAN.md` when planning is required
- explain your work in portable terms
- avoid relying on hidden workspace magic

### 1.3 Portable execution rule

When a task is non-trivial, always use this sequence:

1. understand the existing code and docs
2. restate the narrow task internally
3. update `PLAN.md` if the task changes scope, architecture, sequencing, or risks
4. implement the smallest coherent slice
5. validate with real commands if available
6. report what changed, what was run, and what remains open

---

## 2) Hard project constraints

### 2.1 Product scope

This is a **repo-first issue triage assistant**, not a generic GitHub dashboard.

The core product is:

- issue ingestion
- issue analysis
- similar issue retrieval
- priority scoring
- label suggestion
- triage UX for maintainers

Do not drift into unrelated GitHub analytics, social metrics, contributor graphs, or profile-centric features unless explicitly requested.

### 2.2 Model policy

For the current phase, this repository is **fully open-source model only**.

Do not introduce:

- OpenAI embeddings
- proprietary hosted embedding APIs
- paid inference dependencies

Approved direction for now:

- open-source embedding models
- open-source heuristics / reranking
- local or fully free infrastructure

The OpenAI embeddings path is intentionally deferred.

### 2.3 MVP discipline

The 24-hour hackathon MVP must prioritize:

1. issue classification
2. duplicate detection
3. priority scoring

Advanced features are only allowed after the MVP path is functional:

- GitHub webhook bot
- auto-comment suggestions
- auth polish
- deeper analytics

### 2.4 Explainability over black-box magic

Every important output should be explainable.

That means the system should be able to say things like:

- why an issue was marked high priority
- why two issues are considered similar
- why a label was suggested
- what information is missing from a vague issue

Avoid opaque scoring systems with no visible rationale.

---

## 3) Target architecture

Unless explicitly changed by the human, build toward this architecture:

### 3.1 Frontend

- Next.js app
- TypeScript
- triage dashboard UX
- issue list, issue detail, analysis panel

### 3.2 Backend / brain layer

- Python service
- FastAPI
- embedding generation
- vector search
- classification heuristics
- priority heuristics
- duplicate ranking

### 3.3 Storage

- regular metadata store for issue records / cached results
- vector store for semantic retrieval
- local-first / free-first setup

### 3.4 Integration boundary

The frontend should not own the analysis logic.
The backend should return structured analysis results that the frontend renders.

---

## 4) Fixed product decisions

These are currently locked unless the human changes them:

### 4.1 Core user

Maintainers triaging noisy GitHub issues.

### 4.2 Primary flow

- load repo issues
- pick or submit an issue
- analyze it
- show predicted type, priority, duplicate candidates, label suggestions

### 4.3 Analysis philosophy

Use a **hybrid pipeline**:

- semantic retrieval for recall
- heuristics for precision and explainability
- optional reranking if needed
- transparent scoring, not magic

### 4.4 Open-source embedding path

Preferred order:

1. `BAAI/bge-small-en-v1.5` as the primary embedding model
2. `sentence-transformers/all-MiniLM-L6-v2` as lightweight fallback

Do not switch models casually once indexing has started without a clear migration reason.

### 4.5 Duplicate detection philosophy

Do not treat raw cosine similarity as final truth.

Use:

- embedding retrieval for candidate generation
- heuristic reranking for final confidence
- explainable duplicate reasons

### 4.6 Priority philosophy

Priority should be derived from explicit signals such as:

- severity language
- regression indicators
- production impact
- number/strength of similar reports
- presence or absence of reproduction steps, logs, screenshots
- security / auth / crash / data-loss markers

---

## 5) Repo-wide engineering principles

### 5.1 Keep vertical slices coherent

Prefer small end-to-end slices over isolated unfinished layers.

Bad:

- massive frontend shell with fake data and no real analysis
- backend logic with no usable surface
- giant refactors mixed with feature work

Good:

- one real ingestion path
- one real analysis path
- one real frontend panel consuming it

### 5.2 No fake completion claims

Never claim a feature is done because the UI looks polished.
A feature is not done unless:

- the real logic exists
- the expected path executes
- the result is observable
- basic validation has been run

### 5.3 Minimize moving parts

Choose the simplest stack that can convincingly demo the system.

Avoid unnecessary additions unless they unlock core value.

### 5.4 Preserve replaceability

Code should be structured so the following can be swapped later:

- embedding model
- vector store
- issue source provider
- scoring logic
- reranking logic

Use thin interfaces around these components.

---

## 6) Task sizing and planning protocol

### 6.1 When planning is mandatory

Before editing code, update or consult `PLAN.md` if any of the following are true:

- task will likely touch more than 3 files
- task affects architecture or data flow
- task changes contracts between frontend and backend
- task introduces a new dependency
- task is likely to take more than ~20 minutes
- task is ambiguous, risky, or spans multiple layers

### 6.2 What a valid plan update must contain

A valid plan update should state:

- current goal
- exact scope
- files/components likely affected
- sequencing
- validation strategy
- risks / open questions
- what is explicitly out of scope

### 6.3 Plan-first mode

If the user asks for planning only:

- do not edit code
- produce or refine `PLAN.md`
- identify risks and interfaces
- leave implementation notes that another agent can pick up cleanly

---

## 7) Implementation rules

### 7.1 Before changing code

Always inspect:

- existing repo structure
- relevant docs
- related modules
- tests around the target area
- current data contracts

Do not code from assumptions if inspection is possible.

### 7.2 While changing code

- keep functions focused
- prefer explicit names over clever abstractions
- keep types/schemas clear at boundaries
- avoid premature generalization
- do not introduce a framework rabbit hole

### 7.3 After changing code

Update any impacted:

- docs
- endpoint contracts
- setup instructions
- environment variable docs
- sample payloads
- developer notes

### 7.4 Commit discipline

Prefer small, meaningful, reviewable commits.

Do not create:

- one giant “everything” commit
- noisy micro-commits for every tiny line change

Aim for commits that correspond to coherent slices like:

- issue ingestion service
- embedding provider abstraction
- duplicate scoring pass
- triage result API contract
- dashboard analysis panel

---

## 8) Testing and validation rules

### 8.1 Never bluff validation

Do not say “tested” unless commands were actually run.

If you could not run validation, say so clearly.

### 8.2 Validation order

When available, validate in this order:

1. type/lint checks
2. targeted unit tests
3. integration tests for changed path
4. manual smoke test of the user-visible flow

### 8.3 Minimum acceptable validation

For any non-trivial change, aim to verify:

- code compiles or type-checks
- key path runs
- changed contract still matches caller/callee expectations

### 8.4 If validation fails

Do not hide it.
Report:

- what failed
- likely reason
- whether the issue predates your change
- next suggested fix

---

## 9) Reporting format for every substantial task

At the end of substantial work, report using this structure:

### What changed

- concise summary of implemented or updated pieces

### Files touched

- key files changed and why

### Validation run

- exact commands run
- result of each

### Outcome

- what now works
- what remains incomplete

### Risks / follow-ups

- edge cases
- debt
- recommended next step

Do not produce vague completion summaries.

---

## 10) Product-specific implementation guidance

### 10.1 Canonical issue text for embeddings

Default embedding input should be built from:

- title
- body

Comments are optional and should only be included if there is a deliberate reason.

Do not blindly concatenate huge noisy threads.

### 10.2 Similarity retrieval

Use embeddings to fetch top-k candidate issues.
Then apply a second pass that considers:

- title token overlap
- error/code overlap
- file/module overlap
- label/component overlap
- lexical anchors like package names or version markers

### 10.3 Classification

Issue type classification should be simple and robust first.
Target categories may include:

- bug
- feature request
- documentation
- support/question
- spam/noise

Prefer transparent heuristics and evidence-backed suggestions.

### 10.4 Priority score

Priority must be decomposable into reasons.
Example signal groups:

- severity
- reproducibility
- user impact
- duplication density
- report quality

### 10.5 Missing information detection

The system should detect when issues are weak or incomplete.
Examples:

- no reproduction steps
- no expected vs actual behavior
- no logs
- no environment/version info

This is valuable product behavior. Do not skip it.

---

## 11) UX rules

### 11.1 UX priority

The interface should help maintainers answer:

- what is this issue?
- how urgent is it?
- have we seen this before?
- what should we do next?

### 11.2 Avoid vanity dashboards

Do not spend time on decorative analytics unrelated to triage quality.

### 11.3 Show reasons, not just scores

Every analysis card should prefer structured rationale over raw numbers alone.

---

## 12) Definition of done

A feature is done only if all of the following are true:

1. the real code path exists
2. the user can trigger it
3. the output is visible in the product
4. the contract is documented if needed
5. basic validation has been run or the lack of validation is clearly disclosed

Polish alone does not equal done.

---

## 13) Anti-patterns to avoid

Do not:

- overbuild auth before core triage works
- overbuild GitHub profile visualization
- use embeddings as the only source of truth
- hardcode magic thresholds with no explanation
- scatter business logic across frontend components
- introduce paid APIs during the open-source-only phase
- fake real-time or fake intelligence with seeded static outputs unless explicitly marked as demo-only

---

## 14) If you are unsure

When uncertain:

- narrow scope
- inspect code/docs first
- update `PLAN.md`
- choose the smallest real slice
- leave the repo in a cleaner state
- state assumptions explicitly

Do not improvise large hidden design changes.
