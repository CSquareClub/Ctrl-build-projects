import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models import Repository, User
from middleware.auth import get_current_user
from services import github as gh_service

router = APIRouter()

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "")


def _repo_to_dict(repo: Repository) -> dict:
    return {
        "id": repo.id,
        "name": repo.name,
        "owner": repo.owner,
        "fullName": repo.full_name,
        "url": repo.url,
        "description": repo.description or "",
        "language": repo.language or "Unknown",
        "stars": repo.stars,
        "forks": repo.forks,
        "openIssues": repo.open_issues,
        "isMonitored": repo.is_monitored,
        "webhookActive": repo.webhook_active,
        "lastUpdated": repo.last_updated.isoformat() if repo.last_updated else None,
    }


@router.post("/import")
async def import_repos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pull all repos from GitHub and save to DB."""
    gh_repos = await gh_service.get_user_repos(current_user.access_token)
    saved = []
    for r in gh_repos:
        result = await db.execute(
            select(Repository).where(
                Repository.github_id == r["github_id"],
                Repository.user_id == current_user.id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.stars = r["stars"]
            existing.forks = r["forks"]
            existing.open_issues = r["open_issues"]
            existing.description = r.get("description", "")
            saved.append(existing)
        else:
            repo = Repository(
                user_id=current_user.id,
                github_id=r["github_id"],
                name=r["name"],
                owner=r["owner"],
                full_name=r["full_name"],
                url=r["url"],
                description=r.get("description", ""),
                language=r.get("language", "Unknown"),
                stars=r["stars"],
                forks=r["forks"],
                open_issues=r["open_issues"],
            )
            db.add(repo)
            saved.append(repo)
    await db.commit()
    return [_repo_to_dict(r) for r in saved]


@router.get("")
async def list_repos(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Repository).where(Repository.user_id == current_user.id))
    repos = result.scalars().all()

    # Auto-import from GitHub if the user has no repos yet
    if not repos and current_user.access_token:
        try:
            gh_repos = await gh_service.get_user_repos(current_user.access_token)
            for r in gh_repos:
                repo = Repository(
                    user_id=current_user.id,
                    github_id=r["github_id"],
                    name=r["name"],
                    owner=r["owner"],
                    full_name=r["full_name"],
                    url=r["url"],
                    description=r.get("description", ""),
                    language=r.get("language", "Unknown"),
                    stars=r["stars"],
                    forks=r["forks"],
                    open_issues=r["open_issues"],
                )
                db.add(repo)
                repos.append(repo)
            await db.commit()
        except Exception:
            pass

    return [_repo_to_dict(r) for r in repos]


@router.post("/{repo_id}/watch")
async def watch_repo(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Repository).where(Repository.id == repo_id, Repository.user_id == current_user.id)
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    webhook_url = f"{BACKEND_URL}/webhooks/github"
    try:
        hook_id = await gh_service.create_webhook(
            current_user.access_token, repo.owner, repo.name, webhook_url, WEBHOOK_SECRET
        )
        repo.webhook_id = hook_id
        repo.webhook_active = True
    except Exception as e:
        # Still mark as monitored even if webhook fails (e.g. no admin access)
        pass

    repo.is_monitored = True
    await db.commit()
    await db.refresh(repo)
    return _repo_to_dict(repo)


@router.delete("/{repo_id}/watch")
async def unwatch_repo(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Repository).where(Repository.id == repo_id, Repository.user_id == current_user.id)
    )
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    if repo.webhook_id:
        try:
            await gh_service.delete_webhook(current_user.access_token, repo.owner, repo.name, repo.webhook_id)
        except Exception:
            pass

    repo.is_monitored = False
    repo.webhook_active = False
    repo.webhook_id = None
    await db.commit()
    await db.refresh(repo)
    return _repo_to_dict(repo)
