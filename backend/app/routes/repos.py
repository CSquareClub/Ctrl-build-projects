"""GitHub repository and issues routes"""
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Depends, Header, Query

from app.services.github_service import get_github_service
from app.services.firebase_auth import require_auth

router = APIRouter()


@router.get("/")
async def get_user_repos(
    user: Dict[str, Any] = Depends(require_auth),
    github_token: Optional[str] = Header(None, alias="X-GitHub-Token"),
    per_page: int = Query(30, ge=1, le=100),
    page: int = Query(1, ge=1),
    sort: str = Query("updated", pattern="^(created|updated|pushed|full_name)$")
):
    """
    Fetch repositories for the authenticated user.
    
    Requires:
    - Firebase auth token in Authorization header
    - GitHub token in X-GitHub-Token header
    """
    if not github_token:
        raise HTTPException(
            status_code=400,
            detail="X-GitHub-Token header required"
        )
    
    try:
        github_service = get_github_service(access_token=github_token)
        repos = await github_service.get_user_repos(
            per_page=per_page,
            page=page,
            sort=sort
        )
        
        return {
            "success": True,
            "count": len(repos),
            "repos": repos
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{owner}/{repo}/issues")
async def get_repo_issues(
    owner: str,
    repo: str,
    user: Dict[str, Any] = Depends(require_auth),
    github_token: Optional[str] = Header(None, alias="X-GitHub-Token"),
    state: str = Query("open", pattern="^(open|closed|all)$"),
    per_page: int = Query(30, ge=1, le=100),
    page: int = Query(1, ge=1)
):
    """
    Fetch issues from a specific repository.
    
    Requires:
    - Firebase auth token in Authorization header
    - GitHub token in X-GitHub-Token header (optional for public repos)
    """
    try:
        github_service = get_github_service(access_token=github_token)
        issues = await github_service.get_repo_issues(
            owner=owner,
            repo=repo,
            state=state,
            per_page=per_page,
            page=page
        )
        
        return {
            "success": True,
            "repository": f"{owner}/{repo}",
            "count": len(issues),
            "issues": issues
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{owner}/{repo}/issues/{issue_number}")
async def get_single_issue(
    owner: str,
    repo: str,
    issue_number: int,
    github_token: Optional[str] = Header(None, alias="X-GitHub-Token")
):
    """
    Fetch a single issue from a repository.
    GitHub token optional for public repos.
    """
    try:
        github_service = get_github_service(access_token=github_token)
        issue = await github_service.get_issue(
            owner=owner,
            repo=repo,
            issue_number=issue_number
        )
        
        return {
            "success": True,
            "issue": issue
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
