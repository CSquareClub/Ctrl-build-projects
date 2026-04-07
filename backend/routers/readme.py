import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import User, ActivityFeedEntry
from middleware.auth import get_current_user
from services import readme_generator, github as gh_service

router = APIRouter()


class GenerateRequest(BaseModel):
    repoUrl: str
    options: dict = {}


class PRRequest(BaseModel):
    repoName: str
    content: str


@router.post("/generate")
async def generate_readme(
    body: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await readme_generator.build_readme(body.repoUrl, body.options)

    db.add(ActivityFeedEntry(
        user_id=current_user.id,
        type="readme",
        text=f"README generated for {result['repoName']}",
    ))
    await db.commit()

    return result


@router.post("/pr")
async def create_pr(
    body: PRRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Parse owner/repo
    parts = body.repoName.strip("/").split("/")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="repoName must be 'owner/repo'")
    owner, name = parts

    try:
        result = await gh_service.create_readme_pr(
            current_user.access_token, owner, name, body.content
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result
