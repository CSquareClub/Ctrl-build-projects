from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from db.database import get_db
from db.models import (
    ActivityFeedEntry,
    ModerationEvent,
    Repository,
    TriagedIssue,
    User,
)
from middleware.auth import get_current_user

router = APIRouter()


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Subquery: repo IDs belonging to the current user
    user_repo_ids = select(Repository.id).where(Repository.user_id == current_user.id).scalar_subquery()

    # Count triaged issues (only for user's repos)
    issues_result = await db.execute(
        select(func.count(TriagedIssue.id)).where(TriagedIssue.repo_id.in_(select(Repository.id).where(Repository.user_id == current_user.id)))
    )
    issues_analysed = issues_result.scalar() or 0

    # Count moderation events (only for user's repos)
    events_result = await db.execute(
        select(func.count(ModerationEvent.id)).where(ModerationEvent.repo_id.in_(select(Repository.id).where(Repository.user_id == current_user.id)))
    )
    prs_moderated = events_result.scalar() or 0

    user_mod_filter = ModerationEvent.repo_id.in_(select(Repository.id).where(Repository.user_id == current_user.id))
    blocked = await db.execute(select(func.count(ModerationEvent.id)).where(ModerationEvent.decision == "BLOCK", user_mod_filter))
    flagged = await db.execute(select(func.count(ModerationEvent.id)).where(ModerationEvent.decision == "FLAG", user_mod_filter))
    passed = await db.execute(select(func.count(ModerationEvent.id)).where(ModerationEvent.decision == "PASS", user_mod_filter))

    # Active repos
    active_result = await db.execute(
        select(func.count(Repository.id)).where(Repository.is_monitored == True, Repository.user_id == current_user.id)
    )
    active_repos = active_result.scalar() or 0

    # Events today (scoped to user's repos)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(
        select(func.count(ModerationEvent.id)).where(ModerationEvent.timestamp >= today_start, user_mod_filter)
    )
    events_today = today_result.scalar() or 0

    return {
        "issuesAnalysed": issues_analysed,
        "prsModerated": prs_moderated,
        "blockedPrs": blocked.scalar() or 0,
        "flaggedPrs": flagged.scalar() or 0,
        "passedPrs": passed.scalar() or 0,
        "activeRepos": active_repos,
        "readmesGenerated": 0,
        "recommendationsServed": 0,
        "modelLatencyMs": 12,
        "eventsToday": events_today,
        "allWebhooksHealthy": True,
        "aiUptime": 98.0,
        "webhookDeliveryRate": 99.8,
        "queueBacklog": 0,
    }


@router.get("/activity")
async def get_activity(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns per-day triage and moderation counts for the last N days."""
    user_repo_filter_issues = TriagedIssue.repo_id.in_(select(Repository.id).where(Repository.user_id == current_user.id))
    user_repo_filter_events = ModerationEvent.repo_id.in_(select(Repository.id).where(Repository.user_id == current_user.id))

    result = []
    now = datetime.now(timezone.utc)
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        issues_count = await db.execute(
            select(func.count(TriagedIssue.id)).where(
                TriagedIssue.analyzed_at >= day_start,
                TriagedIssue.analyzed_at < day_end,
                user_repo_filter_issues,
            )
        )
        events_count = await db.execute(
            select(func.count(ModerationEvent.id)).where(
                ModerationEvent.timestamp >= day_start,
                ModerationEvent.timestamp < day_end,
                user_repo_filter_events,
            )
        )
        result.append({
            "day": day_start.strftime("%a"),
            "issues": issues_count.scalar() or 0,
            "events": events_count.scalar() or 0,
        })
    return result


@router.get("/feed")
async def get_feed(
    limit: int = Query(6, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ActivityFeedEntry)
        .where(ActivityFeedEntry.user_id == current_user.id)
        .order_by(ActivityFeedEntry.time.desc())
        .limit(limit)
    )
    entries = result.scalars().all()
    def _severity(t: str) -> str | None:
        if t in ("block", "BLOCK"):
            return "BLOCK"
        if t in ("flag", "FLAG"):
            return "FLAG"
        return None

    return [
        {
            "id": e.id,
            "type": e.type,
            "message": e.text,
            "timestamp": e.time.isoformat() if e.time else None,
            "severity": _severity(e.type),
        }
        for e in entries
    ]
