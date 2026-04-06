# Similar Issues Contract Alignment (Frontend Fitment)

## Mission scope

This pass aligns the backend similar-issues contract with the current frontend shape without introducing a new triage UI.

## Frontend surfaces inspected

- `frontend/pages/index.js`
- `frontend/components/IssuesCard.js`
- `frontend/components/PullRequestsCard.js`
- `frontend/components/ActivitiesCard.js`
- `frontend/components/SearchModal.js`
- `frontend/components/Navbar.js`
- `frontend/components/UserProfile.js`
- `frontend/components/StatsCard.js`
- `frontend/lib/issueListContract.js`

## Backend similarity contract inspected

`services/api/app/schemas/triage.py` defines:

- `TriageResult.similar_issues: SimilarIssueCandidate[]`
- `SimilarIssueCandidate` fields:
  - `issue_id`
  - `issue_number`
  - `title`
  - `html_url`
  - `similarity_score`
  - `rerank_score`
  - `final_score`
  - `reasons[]`

Retrieval note:

- Candidate retrieval is expected to be backed by real embedding search (MiniLM-class model) rather than deterministic placeholder hashing, so score distribution and ordering confidence can change by data and model behavior.

## Alignment findings

1. **No frontend consumer surface yet for similarity candidates**
   - Current frontend has list cards (`commits`, `pull requests`, `issues`) only.
   - There is no issue-detail panel, side analysis panel, or candidate list component yet.

2. **Contract naming mismatch (snake_case backend vs camelCase frontend view models)**
   - Backend uses `issue_id`, `issue_number`, `html_url`, `*_score`.
   - Existing frontend card models use camelCase naming (`createdAt`, `htmlUrl`, etc.).

3. **Identity shape mismatch risk**
   - Similar candidates key identity as `issue_id` (string in backend schema).
   - Existing issue list path primarily keys by `id` (number from GitHub normalization).
   - Adapter must accept both to reduce breakage during integration.

4. **Envelope ambiguity risk**
   - Similar candidates can appear as:
     - direct array
     - `similar_issues` on root object
    - nested under triage containers
    - A thin extractor is needed before UI binding.

5. **Score semantics/range stability risk after MiniLM shift**
   - With real embeddings, `similarity_score`/`rerank_score`/`final_score` may be absent in some paths or vary in range and calibration across model/index versions.
   - Frontend should avoid brittle assumptions such as fixed thresholds, exact expected score magnitudes, or strict reliance on one score key.

6. **No public backend route exposed yet for triage payload**
   - Similarity contract exists at schema layer.
   - There is no wired route returning `TriageResult` yet, so frontend integration is staged.

## Thin compatibility layer added

Added `frontend/lib/similarIssuesContract.js` with:

- `extractSimilarIssueCandidates(payload)`
  - accepts array, `payload.similar_issues`, `payload.triage.similar_issues`, and `payload.result.similar_issues`
- `mapSimilarIssueCandidate(candidate)`
  - maps backend candidate to a frontend-safe view model
  - normalizes number fields
  - preserves individual score channels as nullable (`similarityScore`, `rerankScore`, `finalScore`)
  - computes stable `primaryScore` + `primaryScoreKind` for rendering without forcing a fixed score source
  - preserves explainability fields (`reasons`, per-score values)
- `mapSimilarIssuesPayload(payload)`
  - end-to-end extraction + mapping + invalid filtering
  - preserves backend retrieval order via `sourceRank`
- `extractSimilarityMetadata(payload)`
  - extracts stable analysis metadata (`analysisVersion`, `duplicateConfidence`) from root or nested envelopes

## Minimum next changes to enable frontend consumption later

1. Add a backend triage endpoint returning `TriageResult` with `similar_issues`.
2. In frontend fetch orchestration (`pages/index.js` successor or analysis flow), map triage payload via `mapSimilarIssuesPayload`.
3. Render candidates in a dedicated issue-detail/analysis surface owned by frontend team, reusing mapped fields:
   - `title`, `issueNumber`, `primaryScore`, `primaryScoreKind`, `reasons`, `htmlUrl`, `sourceRank`.

## Open risks

- Until triage route is exposed, breakage detection is limited to payload-shape tests/mocks.
- Backend currently defines candidate `issue_id` as `str`; if numeric IDs are emitted by future implementations, adapter handles them only when sent as string/number-compatible values.
- If model/index calibration changes, UI ordering should use backend return order (`sourceRank`) unless product explicitly defines client-side re-sorting.
