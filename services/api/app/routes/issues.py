from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.github.client import (
    GitHubAPIClient,
    GitHubClientError,
    GitHubNotFoundError,
    GitHubRateLimitError,
)
from app.github.normalization import normalize_github_issue
from app.schemas.issues import ListIssuesResponse

router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=ListIssuesResponse)
async def list_repo_issues(
    owner: str = Query(..., min_length=1),
    repo: str = Query(..., min_length=1),
    state: str = Query("all", pattern="^(open|closed|all)$"),
    include_pull_requests: bool = Query(False),
    token: Optional[str] = Query(default=None),
) -> ListIssuesResponse:
    client = GitHubAPIClient(token=token)

    try:
        raw_issues = await client.fetch_repo_issues(owner=owner, repo=repo, state=state)
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
        owner=owner,
        repo=repo,
        state=state,
        include_pull_requests=include_pull_requests,
        total_count=len(normalized_issues),
        issues=normalized_issues,
    )
