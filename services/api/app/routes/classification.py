from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_classification_service
from app.github.client import (
    GitHubClientError,
    GitHubNotFoundError,
    GitHubRateLimitError,
)
from app.schemas.classification import (
    IssueClassificationRequest,
    IssueClassificationResponse,
)
from app.services.classification import ClassificationService

router = APIRouter(prefix="/classification", tags=["classification"])


@router.post("", response_model=IssueClassificationResponse)
async def classify_issue(
    request: IssueClassificationRequest,
    service: ClassificationService = Depends(get_classification_service),
) -> IssueClassificationResponse:
    try:
        return await service.classify(request)
    except GitHubNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GitHubRateLimitError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except GitHubClientError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
