from __future__ import annotations

from collections.abc import Mapping
from typing import Optional

import httpx

from app.core.settings import get_settings


class GitHubClientError(Exception):
    pass


class GitHubNotFoundError(GitHubClientError):
    pass


class GitHubRateLimitError(GitHubClientError):
    pass


class GitHubAPIClient:
    def __init__(self, token: Optional[str] = None) -> None:
        settings = get_settings()
        self.base_url = settings.github_api_base_url.rstrip("/")
        self.timeout_seconds = settings.github_timeout_seconds
        self.token = token or settings.github_token

    def _headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def fetch_repo_issues(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        per_page: int = 100,
        max_pages: int = 3,
    ) -> list[Mapping]:
        issues: list[Mapping] = []

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            for page in range(1, max_pages + 1):
                response = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/issues",
                    params={"state": state, "per_page": per_page, "page": page},
                    headers=self._headers(),
                )

                if response.status_code == 404:
                    raise GitHubNotFoundError(f"Repository not found: {owner}/{repo}")

                if response.status_code == 403:
                    message = _extract_error_message(response)
                    if "rate limit" in message.lower():
                        raise GitHubRateLimitError(message)
                    raise GitHubClientError(message)

                if response.is_error:
                    raise GitHubClientError(_extract_error_message(response))

                payload = response.json()
                if not isinstance(payload, list):
                    raise GitHubClientError(
                        "Unexpected GitHub response for issues list"
                    )

                issues.extend(item for item in payload if isinstance(item, Mapping))

                if len(payload) < per_page:
                    break

        return issues


def _extract_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
        if isinstance(payload, Mapping):
            message = payload.get("message")
            if isinstance(message, str) and message.strip():
                return message
    except Exception:
        pass

    return f"GitHub API request failed with status {response.status_code}"
