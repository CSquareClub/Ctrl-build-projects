from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_similar_issues_service
from app.github.client import (
    GitHubClientError,
    GitHubNotFoundError,
    GitHubRateLimitError,
)
from app.schemas.similar import SimilarIssuesRequest, SimilarIssuesResponse
from app.services.similar_issues import SimilarIssuesService

router = APIRouter(prefix="/similar-issues", tags=["similar-issues"])


@router.post("", response_model=SimilarIssuesResponse)
async def retrieve_similar_issues(
    request: SimilarIssuesRequest,
    service: SimilarIssuesService = Depends(get_similar_issues_service),
) -> SimilarIssuesResponse:
    try:
        return await service.find_similar(request)
    except GitHubNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GitHubRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except GitHubClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
