# Frontend-Backend Issue List Contract Alignment

## Backend contract baseline (`GET /api/issues`)

From `PLAN.md`, backend issue list contract is an issue-summary response keyed by repo + filters.

Expected issue summary fields (minimum useful subset):

- `id`
- `number`
- `title`
- `state`
- `created_at`
- `html_url`
- `labels`
- `author`
- `comment_count`

## Frontend issue-list expectations before alignment

`IssuesCard` rendering path expected:

- `id`
- `number`
- `title`
- `state` (`open` or `closed`)
- `createdAt` (already humanized string)

Source shape previously came directly from GitHub REST `/repos/{owner}/{repo}/issues` and was transformed inline in `pages/index.js`.

## Mismatch summary

1. **Transport mismatch**
   - Frontend used GitHub REST directly.
   - Backend contract expects frontend to consume app API (`/api/issues`).

2. **Field naming mismatch**
   - Backend contract uses snake_case fields (`created_at`, `comment_count`, `html_url`).
   - UI uses camelCase view fields (`createdAt`) and drops additional metadata.

3. **Envelope mismatch risk**
   - Frontend assumed raw arrays.
   - Backend may return wrapped data (`issues`, `items`, or `data`).

4. **Identifier mismatch risk**
   - Some contracts may use `issue_id`/`issue_number` in downstream summaries.
   - Existing UI expected `id`/`number` only.

## Compatibility strategy added in this branch

Thin adapter layer in `frontend/lib/issueListContract.js`:

- extracts arrays from raw or wrapped payloads
- maps backend issue summary fields to existing card view model
- accepts either `id`/`number` or `issue_id`/`issue_number`
- normalizes issue state for existing open/closed filters
- preserves extra backend fields (`html_url`, `labels`, `author`, `comment_count`) on mapped items for future UI use

Runtime behavior in `pages/index.js`:

- primary source: backend issue-list endpoint (`/api/issues?repo=owner/repo`)
- fallback source: GitHub REST issues endpoint, mapped through same adapter
- fallback emits explicit UI warning string in `issuesError`

## Remaining open contract points

- exact backend response envelope should be frozen and documented in backend docs (`issues[]` vs `data[]`)
- backend filter/query parameter names beyond `repo` are still not implemented in frontend
- backend auth expectation (pass-through GitHub token vs server-side credentialing) needs one clear contract
