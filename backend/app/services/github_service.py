"""GitHub API Service for repository and issue operations"""
import os
from typing import Any, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None


class GitHubService:
    """Service for GitHub API interactions"""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self, access_token: Optional[str] = None):
        """Initialize GitHub service with optional access token"""
        self.access_token = access_token
        self._client: Optional[Any] = None
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for GitHub API requests"""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "OpenIssue-App"
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict] = None
    ) -> Optional[Any]:
        """Make an async HTTP request to GitHub API"""
        if httpx is None:
            raise RuntimeError("httpx not installed")
        
        url = f"{self.BASE_URL}{endpoint}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self._get_headers(),
                    params=params
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                print(f"GitHub API error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                print(f"GitHub request error: {e}")
                raise
    
    async def get_user_repos(
        self, 
        per_page: int = 30, 
        page: int = 1,
        sort: str = "updated",
        visibility: str = "all"
    ) -> List[Dict[str, Any]]:
        """Fetch repositories for the authenticated user"""
        params = {
            "per_page": per_page,
            "page": page,
            "sort": sort,
            "visibility": visibility
        }
        
        repos = await self._make_request("GET", "/user/repos", params)
        
        # Return simplified repo data
        return [
            {
                "id": repo["id"],
                "name": repo["name"],
                "full_name": repo["full_name"],
                "description": repo.get("description"),
                "private": repo["private"],
                "html_url": repo["html_url"],
                "language": repo.get("language"),
                "stargazers_count": repo.get("stargazers_count", 0),
                "open_issues_count": repo.get("open_issues_count", 0),
                "updated_at": repo.get("updated_at"),
            }
            for repo in repos
        ]
    
    async def get_repo_issues(
        self,
        owner: str,
        repo: str,
        state: str = "open",
        per_page: int = 30,
        page: int = 1,
        sort: str = "created",
        direction: str = "desc"
    ) -> List[Dict[str, Any]]:
        """Fetch issues from a repository"""
        params = {
            "state": state,
            "per_page": per_page,
            "page": page,
            "sort": sort,
            "direction": direction
        }
        
        issues = await self._make_request(
            "GET", 
            f"/repos/{owner}/{repo}/issues",
            params
        )
        
        # Return simplified issue data (filter out PRs)
        return [
            {
                "id": issue["id"],
                "number": issue["number"],
                "title": issue["title"],
                "body": issue.get("body", ""),
                "state": issue["state"],
                "html_url": issue["html_url"],
                "labels": [label["name"] for label in issue.get("labels", [])],
                "created_at": issue["created_at"],
                "updated_at": issue["updated_at"],
                "user": {
                    "login": issue["user"]["login"],
                    "avatar_url": issue["user"]["avatar_url"]
                }
            }
            for issue in issues
            if "pull_request" not in issue  # Exclude pull requests
        ]
    
    async def get_issue(
        self,
        owner: str,
        repo: str,
        issue_number: int
    ) -> Optional[Dict[str, Any]]:
        """Get a single issue"""
        issue = await self._make_request(
            "GET",
            f"/repos/{owner}/{repo}/issues/{issue_number}"
        )
        
        return {
            "id": issue["id"],
            "number": issue["number"],
            "title": issue["title"],
            "body": issue.get("body", ""),
            "state": issue["state"],
            "html_url": issue["html_url"],
            "labels": [label["name"] for label in issue.get("labels", [])],
            "created_at": issue["created_at"],
            "updated_at": issue["updated_at"],
            "user": {
                "login": issue["user"]["login"],
                "avatar_url": issue["user"]["avatar_url"]
            }
        }


def get_github_service(access_token: Optional[str] = None) -> GitHubService:
    """Create a GitHub service instance"""
    return GitHubService(access_token=access_token)
