from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models import ModerationEvent, Repository, User
from middleware.auth import get_current_user

router = APIRouter()


def _event_to_dict(e: ModerationEvent) -> dict:
    return {
        "id": e.id,
        "type": e.type,
        "decision": e.decision,
        "severity": e.severity,
        "repo": e.repository.full_name if e.repository else e.repo_id,
        "prNumber": e.pr_number,
        "commitHash": e.commit_sha[:7] if e.commit_sha else None,
        "commitSha": e.commit_sha,
        "title": e.title,
        "author": e.author or "",
        "authorAvatar": e.author_avatar or "",
        "reason": e.reason or "",
        "file": e.file,
        "lineStart": e.line_start,
        "lineEnd": e.line_end,
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "aiExplanation": e.ai_explanation or "",
        "githubUrl": e.github_url,
        "overridden": e.overridden,
        "overriddenBy": e.overridden_by,
    }


@router.get("")
async def list_events(
    repoId: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    q = select(ModerationEvent).options(selectinload(ModerationEvent.repository))
    # Scope to current user's repos
    q = q.where(ModerationEvent.repo_id.in_(select(Repository.id).where(Repository.user_id == current_user.id)))
    if repoId:
        q = q.where(ModerationEvent.repo_id == repoId)
    if decision:
        q = q.where(ModerationEvent.decision == decision)
    if type:
        q = q.where(ModerationEvent.type == type)
    result = await db.execute(q.order_by(ModerationEvent.timestamp.desc()))
    events = result.scalars().all()
    return [_event_to_dict(e) for e in events]


@router.get("/{event_id}")
async def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ModerationEvent)
        .options(selectinload(ModerationEvent.repository))
        .where(ModerationEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_to_dict(event)


class OverrideRequest(BaseModel):
    reason: str


@router.post("/{event_id}/override")
async def override_event(
    event_id: str,
    body: OverrideRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ModerationEvent)
        .options(selectinload(ModerationEvent.repository))
        .where(ModerationEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.overridden = True
    event.overridden_by = f"{current_user.login}: {body.reason}"
    await db.commit()
    await db.refresh(event)
    return _event_to_dict(event)
