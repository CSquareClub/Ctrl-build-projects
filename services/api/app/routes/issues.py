from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query

from app.github.client import (
    GitHubAPIClient,
    GitHubClientError,
    GitHubNotFoundError,
    GitHubRateLimitError,
    extract_bearer_token,
)
from app.github.normalization import normalize_github_issue
from app.schemas.issues import ListIssuesResponse

router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=ListIssuesResponse)
async def list_repo_issues(
    owner: Optional[str] = Query(default=None, min_length=1),
    repo: Optional[str] = Query(default=None, min_length=1),
    state: str = Query("all", pattern="^(open|closed|all)$"),
    include_pull_requests: bool = Query(False),
    token: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None),
) -> ListIssuesResponse:
    parsed_owner, parsed_repo = _resolve_repo_input(owner=owner, repo=repo)
    resolved_token = token or extract_bearer_token(authorization)
    client = GitHubAPIClient(token=resolved_token)

    try:
        raw_issues = await client.fetch_repo_issues(
            owner=parsed_owner,
            repo=parsed_repo,
            state=state,
        )
    except GitHubNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GitHubRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except GitHubClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    normalized_issues = []
    for raw_issue in raw_issues:
        is_pull_request = "pull_request" in raw_issue
        if is_pull_request and not include_pull_requests:
            continue
        normalized_issues.append(normalize_github_issue(raw_issue))

    return ListIssuesResponse(
        owner=parsed_owner,
        repo=parsed_repo,
        state=state,
        include_pull_requests=include_pull_requests,
        total_count=len(normalized_issues),
        issues=normalized_issues,
    )


def _resolve_repo_input(owner: Optional[str], repo: Optional[str]) -> tuple[str, str]:
    has_owner = isinstance(owner, str) and bool(owner.strip())
    has_repo = isinstance(repo, str) and bool(repo.strip())

    if has_owner and has_repo:
        return owner.strip(), repo.strip()

    if not has_repo:
        raise HTTPException(
            status_code=422,
            detail=(
                "Provide either owner+repo query params or repo in 'owner/repo' format."
            ),
        )

    raw_repo = repo.strip()
    if "/" not in raw_repo:
        raise HTTPException(
            status_code=422,
            detail=(
                "Invalid repo query parameter. Expected 'owner/repo' when owner is omitted."
            ),
        )

    parsed_owner, parsed_repo = raw_repo.split("/", 1)
    parsed_owner = parsed_owner.strip()
    parsed_repo = parsed_repo.strip()

    if not parsed_owner or not parsed_repo:
        raise HTTPException(
            status_code=422,
            detail=(
                "Invalid repo query parameter. Expected 'owner/repo' with non-empty parts."
            ),
        )

    return parsed_owner, parsed_repo
