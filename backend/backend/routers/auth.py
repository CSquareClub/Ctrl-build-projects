import os
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models import User
from middleware.auth import create_access_token, get_current_user

router = APIRouter()

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
GITHUB_SCOPES = "repo read:user user:email write:discussion admin:repo_hook"


@router.get("/github")
async def github_login():
    """Redirect the user to GitHub OAuth."""
    params = urlencode({
        "client_id": GITHUB_CLIENT_ID,
        "scope": GITHUB_SCOPES,
        "redirect_uri": f"{os.environ.get('BACKEND_URL', 'http://localhost:8000')}/auth/callback",
    })
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/callback")
async def github_callback(
    response: Response,
    db: AsyncSession = Depends(get_db),
    code: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
):
    """Exchange OAuth code for access token, create/update user, return JWT."""
    # User cancelled or GitHub returned an error
    if error or not code:
        return RedirectResponse(f"{FRONTEND_URL}?auth_error=cancelled")
    # Exchange code for GitHub access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="GitHub OAuth failed")

    # Fetch user profile from GitHub
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        )
    gh_user = user_resp.json()

    # Upsert user in DB
    result = await db.execute(select(User).where(User.github_id == gh_user["id"]))
    user = result.scalar_one_or_none()
    if user:
        user.login = gh_user.get("login", "")
        user.name = gh_user.get("name") or gh_user.get("login", "")
        user.avatar_url = gh_user.get("avatar_url", "")
        user.email = gh_user.get("email") or ""
        user.access_token = access_token
        user.public_repos = gh_user.get("public_repos", 0)
        user.followers = gh_user.get("followers", 0)
    else:
        user = User(
            github_id=gh_user["id"],
            login=gh_user.get("login", ""),
            name=gh_user.get("name") or gh_user.get("login", ""),
            avatar_url=gh_user.get("avatar_url", ""),
            email=gh_user.get("email") or "",
            access_token=access_token,
            public_repos=gh_user.get("public_repos", 0),
            followers=gh_user.get("followers", 0),
        )
        db.add(user)
    await db.commit()
    await db.refresh(user)

    jwt_token = create_access_token(user.id)
    # Redirect to frontend with token in query param (frontend stores it)
    return RedirectResponse(f"{FRONTEND_URL}/dashboard?token={jwt_token}")


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "login": current_user.login,
        "name": current_user.name,
        "avatarUrl": current_user.avatar_url,
        "email": current_user.email,
        "publicRepos": current_user.public_repos,
        "followers": current_user.followers,
    }


@router.post("/logout")
async def logout():
    return {"logged_out": True}
