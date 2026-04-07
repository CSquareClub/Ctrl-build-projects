import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models import TriagedIssue, User, Repository
from middleware.auth import get_current_user
from services import triage as triage_service, github as gh_service
from services.moderation_pipeline import _triage_comment

router = APIRouter()


class AnalyzeRequest(BaseModel):
    title: str
    body: str = ""
    repoId: Optional[str] = None
    issueNumber: Optional[int] = None
    repoFullName: Optional[str] = None


def _issue_to_dict(issue: TriagedIssue) -> dict:
    return {
        "id": issue.id,
        "githubId": issue.github_id,
        "repo": issue.repo_id,
        "title": issue.title,
        "body": issue.body or "",
        "classification": issue.classification,
        "priorityScore": issue.priority_score,
        "labels": json.loads(issue.labels or "[]"),
        "isDuplicate": issue.is_duplicate,
        "duplicateOf": issue.duplicate_of,
        "createdAt": issue.created_at.isoformat() if issue.created_at else None,
        "state": issue.state,
        "url": issue.url or "",
        "author": issue.author or "",
    }


@router.post("/analyze")
async def analyze_issue(
    body: AnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await triage_service.analyze_issue(db, body.title, body.body, body.repoId)

    # Push labels and post triage comment to GitHub if caller provided context
    if body.issueNumber and body.repoFullName and current_user.access_token:
        parts = body.repoFullName.split("/", 1)
        if len(parts) == 2:
            owner, repo_name = parts
            labels = result.get("labels", [])
            if labels:
                try:
                    await gh_service.apply_issue_labels(
                        current_user.access_token, owner, repo_name, body.issueNumber, labels
                    )
                except Exception:
                    pass
            comment_body = _triage_comment(result)
            try:
                await gh_service.post_issue_comment(
                    current_user.access_token, owner, repo_name, body.issueNumber, comment_body
                )
            except Exception:
                pass

    return result


@router.get("")
async def list_issues(
    repoId: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(TriagedIssue)
    # Scope to current user's repos
    q = q.where(TriagedIssue.repo_id.in_(select(Repository.id).where(Repository.user_id == current_user.id)))
    if repoId:
        q = q.where(TriagedIssue.repo_id == repoId)
    if classification:
        q = q.where(TriagedIssue.classification == classification)
    if state:
        q = q.where(TriagedIssue.state == state)
    result = await db.execute(q.order_by(TriagedIssue.analyzed_at.desc()))
    issues = result.scalars().all()
    return [_issue_to_dict(i) for i in issues]


class LabelRequest(BaseModel):
    labels: list[str]


@router.post("/{issue_id}/label")
async def apply_labels(
    issue_id: str,
    body: LabelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TriagedIssue).where(TriagedIssue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue.labels = json.dumps(body.labels)
    await db.commit()

    # Push labels to GitHub if we have enough context
    if issue.github_id and current_user.access_token:
        repo_result = await db.execute(select(Repository).where(Repository.id == issue.repo_id))
        repo = repo_result.scalar_one_or_none()
        if repo and body.labels:
            try:
                await gh_service.apply_issue_labels(
                    current_user.access_token, repo.owner, repo.name, issue.github_id, body.labels
                )
            except Exception:
                pass  # DB is updated regardless; GitHub push is best-effort

    return {"success": True}
