import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models import Recommendation, User, UserPrefs
from middleware.auth import get_current_user
from services import recommender as rec_service

router = APIRouter()


class PrefsRequest(BaseModel):
    skills: list[str] = []
    domains: list[str] = []
    experience: str = "beginner"


@router.post("/prefs")
async def save_prefs(
    body: PrefsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await rec_service.save_prefs(db, current_user, body.skills, body.domains, body.experience)
    return {"saved": True}


@router.get("/recommend")
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Load saved prefs
    prefs_result = await db.execute(
        select(UserPrefs).where(UserPrefs.user_id == current_user.id)
    )
    prefs = prefs_result.scalar_one_or_none()
    skills = json.loads(prefs.skills) if prefs else []
    domains = json.loads(prefs.domains) if prefs else []
    experience = prefs.experience if prefs else "beginner"

    return await rec_service.get_recommendations(db, current_user, skills, domains, experience)


@router.post("/bookmarks")
async def add_bookmark(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    issue_id = body.get("issueId")
    if not issue_id:
        raise HTTPException(status_code=400, detail="issueId is required")
    result = await db.execute(
        select(Recommendation).where(Recommendation.id == issue_id, Recommendation.user_id == current_user.id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.bookmarked = True
    await db.commit()
    return {"saved": True}


@router.delete("/bookmarks/{issue_id}")
async def remove_bookmark(
    issue_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Recommendation).where(Recommendation.id == issue_id, Recommendation.user_id == current_user.id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.bookmarked = False
    await db.commit()
    return {"removed": True}


@router.get("/bookmarks")
async def list_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Recommendation).where(
            Recommendation.user_id == current_user.id,
            Recommendation.bookmarked == True,
        )
    )
    recs = result.scalars().all()
    return [
        {
            "id": r.id,
            "githubId": r.github_id,
            "title": r.title,
            "repo": r.repo,
            "url": r.url,
            "labels": json.loads(r.labels or "[]"),
            "difficulty": r.difficulty,
            "matchScore": r.match_score,
            "languages": json.loads(r.languages or "[]"),
            "explanation": r.explanation,
            "stars": r.stars,
            "bookmarked": r.bookmarked,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
            "comments": r.comments,
        }
        for r in recs
    ]
