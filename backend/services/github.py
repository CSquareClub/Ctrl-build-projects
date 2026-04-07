import os
from github import Github, GithubException


def _client(access_token: str) -> Github:
    return Github(access_token)


async def get_user_repos(access_token: str) -> list[dict]:
    """Fetch all repos the authenticated user has access to."""
    g = _client(access_token)
    user = g.get_user()
    repos = []
    for repo in user.get_repos(type="all", sort="updated"):
        repos.append({
            "github_id": repo.id,
            "name": repo.name,
            "owner": repo.owner.login,
            "full_name": repo.full_name,
            "url": repo.html_url,
            "description": repo.description or "",
            "language": repo.language or "Unknown",
            "stars": repo.stargazers_count,
            "forks": repo.forks_count,
            "open_issues": repo.open_issues_count,
            "last_updated": repo.updated_at.isoformat() if repo.updated_at else None,
        })
    return repos


async def create_webhook(access_token: str, owner: str, name: str, webhook_url: str, secret: str) -> int:
    """Register a webhook on a GitHub repo — returns the webhook ID."""
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    hook = repo.create_hook(
        name="web",
        config={
            "url": webhook_url,
            "content_type": "json",
            "secret": secret,
            "insecure_ssl": "0",
        },
        events=["issues", "pull_request", "push", "issue_comment", "pull_request_review_comment"],
        active=True,
    )
    return hook.id


async def delete_webhook(access_token: str, owner: str, name: str, webhook_id: int) -> None:
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    hook = repo.get_hook(webhook_id)
    hook.delete()


async def post_issue_comment(access_token: str, owner: str, name: str, issue_number: int, body: str) -> None:
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    issue = repo.get_issue(issue_number)
    issue.create_comment(body)


async def apply_issue_labels(access_token: str, owner: str, name: str, issue_number: int, labels: list[str]) -> None:
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    issue = repo.get_issue(issue_number)
    issue.set_labels(*labels)


async def request_pr_changes(access_token: str, owner: str, name: str, pr_number: int, body: str) -> None:
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    pr = repo.get_pull(pr_number)
    pr.create_review(body=body, event="REQUEST_CHANGES")


async def set_commit_status(
    access_token: str, owner: str, name: str, sha: str,
    state: str, description: str, context: str = "gitwise-ai/moderation"
) -> None:
    """state: 'success' | 'failure' | 'pending' | 'error'"""
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    commit = repo.get_commit(sha)
    commit.create_status(state=state, description=description, context=context)


async def post_commit_comment(access_token: str, owner: str, name: str, sha: str, body: str) -> None:
    """Post a general comment on a specific commit."""
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    commit = repo.get_commit(sha)
    commit.create_comment(body)


async def create_readme_pr(access_token: str, owner: str, name: str, content: str) -> dict:
    """Create a branch with the generated README and open a pull request."""
    g = _client(access_token)
    repo = g.get_repo(f"{owner}/{name}")
    default_branch = repo.default_branch
    source = repo.get_branch(default_branch)
    branch_name = "gitwise/update-readme"

    # Create or reset branch
    try:
        ref = repo.get_git_ref(f"heads/{branch_name}")
        ref.edit(sha=source.commit.sha, force=True)
    except GithubException:
        repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=source.commit.sha)

    # Upsert README.md
    try:
        existing = repo.get_contents("README.md", ref=branch_name)
        repo.update_file("README.md", "docs: update README via GitWise AI", content, existing.sha, branch=branch_name)
    except GithubException:
        repo.create_file("README.md", "docs: add README via GitWise AI", content, branch=branch_name)

    # Open pull request
    pr = repo.create_pull(
        title="docs: update README (GitWise AI)",
        body="This README was generated automatically by [GitWise AI](https://gitwise.ai).",
        head=branch_name,
        base=default_branch,
    )
    return {"prUrl": pr.html_url, "prNumber": pr.number}
