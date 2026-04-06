# Wave 3 Analyze Contract + UI Alignment

## Mission scope

Freeze a unified analyze response contract from current Wave 2/3 backend outputs and align it with the existing homepage visual system so Wave 4 can add analytics/suggestions with minimal surprise.

## Frontend surfaces inspected

- `frontend/pages/index.js`
- `frontend/pages/_app.js`
- `frontend/styles/globals.css`
- `frontend/tailwind.config.js`
- `frontend/components/Navbar.js`
- `frontend/components/SearchModal.js`
- `frontend/components/UserProfile.js`
- `frontend/components/StatsCard.js`
- `frontend/components/ActivitiesCard.js`
- `frontend/components/PullRequestsCard.js`
- `frontend/components/IssuesCard.js`
- `frontend/lib/issueListContract.js`
- `frontend/lib/similarIssuesContract.js`

## Backend outputs inspected (Wave 2/3 reality)

- `services/api/app/schemas/triage.py`
- `services/api/app/triage/contracts.py`
- `services/api/app/triage/service.py`
- `services/api/app/schemas/similar.py`
- `services/api/app/services/similar_issues.py`
- `services/api/app/schemas/vector.py`
- `services/api/app/vectorindex/service.py`
- `services/api/app/routes/similar.py`
- `services/api/app/routes/vectors.py`

## Existing design language to reuse in Wave 4

### Palette and typography

- Global background: `terminal.bg` (`#0d1117`)
- Card surface: `terminal.surface` (`#161b22`)
- Border baseline: `terminal.border` (`#1a3320`)
- Primary text/accent: `terminal.text` (`#22c55e`)
- Bright emphasis: `terminal.bright` (`#4ade80`)
- Muted copy: `terminal.muted` (`#4a7c59`)
- Warning/error: `terminal.amber` and `terminal.red`
- Typeface: JetBrains Mono stack across shell/cards/modals

### Layout and rhythm

- Fixed left shell nav (`w-64`) + main content offset (`ml-64`)
- Main panel uses `p-6`, max width container, and compact vertical rhythm
- Primary section rhythm:
  1. profile/header block
  2. stats row (`grid-cols-4`, `gap-3`)
  3. card grid (`grid-cols-3`, `gap-4`)
- Card pattern is consistent:
  - `border border-terminal-border rounded bg-terminal-surface`
  - optional command-style title bar with bottom border
  - interior scroll region with compact rows (`text-xs`, `py-2.5`)
  - `terminal-hover` border glow on hover

### Interaction and states

- Loading state uses inline spinner (`Loader2`) or centered terminal copy
- Error state uses red border/text treatment and concise single-line message
- Empty state uses muted command/comment copy (`// no ... found`)
- Filters use tiny bordered pills with active/inactive terminal contrast

## Unified analyze response contract (frozen)

Canonical schema is added in `services/api/app/schemas/analyze.py` as `AnalyzeResponse`.

```json
{
  "issue_id": "string",
  "analysis_version": "string",
  "predicted_type": {
    "label": "string",
    "confidence": "number",
    "reasons": ["string"]
  },
  "suggested_labels": {
    "items": ["string"],
    "reasons": ["string"]
  },
  "duplicate_candidates": {
    "confidence": "number",
    "items": [
      {
        "issue_id": "string",
        "issue_number": "number|null",
        "title": "string",
        "html_url": "string|null",
        "similarity_score": "number|null",
        "rerank_score": "number|null",
        "final_score": "number|null",
        "reasons": ["string"]
      }
    ]
  },
  "priority": {
    "score": "number",
    "band": "string",
    "reasons": ["string"]
  },
  "missing_information": {
    "items": ["string"]
  },
  "explanation": {
    "summary": "string",
    "type_reasons": ["string"],
    "label_reasons": ["string"],
    "duplicate_reasons": ["string"],
    "priority_reasons": ["string"],
    "missing_information_reasons": ["string"]
  }
}
```

### Compatibility with current Wave 3 backend outputs

- `AnalyzeResponse.from_triage_result(...)` maps current `TriageResult` fields into this shape.
- Where Wave 3 currently lacks explicit reasons (`predicted_type.reasons`, `suggested_labels.reasons`), the contract keeps fields but currently maps empty arrays.
- Duplicate reasons are preserved from per-candidate `reasons` and rolled up into `explanation.duplicate_reasons`.

## Frontend contract helper added

`frontend/lib/analyzeContract.js` now provides:

- `mapAnalyzePayload(payload)`:
  - supports canonical nested sections
  - supports legacy flat triage fields
  - supports optional `{ analyze: ... }` envelope
  - normalizes score/number/string fields
  - keeps duplicate score channels (`similarity`, `rerank`, `final`) and computes `primaryScore` for rendering
- `getSectionState({ loading, error, items })`:
  - returns one of `loading | error | empty | ready`

## Required section mapping (contract -> UI card/section)

1. predicted type section
   - Source: `predicted_type`
   - UI: compact command-bar card (same as existing cards) with type badge + confidence + reason list

2. suggested labels section
   - Source: `suggested_labels`
   - UI: chip list card using existing terminal bordered pill style + optional rationale lines

3. duplicate candidates section
   - Source: `duplicate_candidates`
   - UI: scrollable list card reusing `IssuesCard` row rhythm; each row shows issue number/title/primary score/reasons

4. priority section
   - Source: `priority`
   - UI: stat-style emphasis card (same border/surface typography) with score + band + reason bullets

5. missing-information section
   - Source: `missing_information`
   - UI: checklist card with muted copy when empty

6. explanation/reasons section
   - Source: `explanation`
   - UI: narrative summary card with grouped reason subsections; same command title-bar style

## Loading/empty/error expectations (Wave 4 contract)

- Page-level loading: centered terminal loading state (same pattern as homepage)
- Section loading: spinner + terse terminal copy within each card
- Section empty:
  - duplicates: `// no likely duplicates`
  - labels: `// no labels suggested`
  - missing info: `// issue report looks complete`
- Section error: red inline error region inside card; keep other sections renderable
- Page-level error: top alert bar (same as homepage error treatment)

## Backend/frontend mismatches found

1. No public analyze route yet
   - Existing routes: `/api/issues`, `/api/vectors/*`, `/api/similar-issues`
   - Missing: a route returning unified `AnalyzeResponse`

2. Triage reasons gap
   - `IssueClassifier.classify(...)` contract returns reasons tuple
   - `TriageResult` schema currently has no `type_reasons` field
   - Unified contract keeps `predicted_type.reasons` and `explanation.type_reasons`, but Wave 4 backend wiring must populate them

3. Suggested label reason gap
   - `TriageResult` has `suggested_labels` only; no reason channel
   - Unified contract includes `suggested_labels.reasons` and `explanation.label_reasons`; currently defaults empty

4. Duplicate naming mismatch
   - Existing schema uses `similar_issues`; unified contract uses `duplicate_candidates.items`
   - Mapper supports both, but backend should emit canonical nested name for Wave 4

5. Envelope inconsistency risk
   - Prior frontend helper supported multiple envelopes (`root`, `triage`, `result`)
   - Unified mapper now supports canonical root plus optional `{ analyze: ... }`; backend should pick one canonical envelope and keep it stable

## Wave 4 integration checklist (thin)

1. Add backend analyze endpoint returning `AnalyzeResponse` directly.
2. Populate classifier and label reasons in orchestration layer.
3. Build analysis page/section surface reusing existing terminal shell, card, spacing, and state patterns.
4. Wire frontend fetch to `mapAnalyzePayload` and render section-by-section with `getSectionState`.
