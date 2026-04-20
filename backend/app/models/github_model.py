from datetime import datetime
from typing import Optional

class GitHubUser:
    """Simple GitHub user model for storing OAuth state"""
    def __init__(self, user_id: str, github_username: str, access_token: str, 
                 token_expires_at: Optional[datetime] = None, refresh_token: Optional[str] = None):
        self.user_id = user_id
        self.github_username = github_username
        self.access_token = access_token
        self.token_expires_at = token_expires_at
        self.refresh_token = refresh_token
        self.created_at = datetime.utcnow()

class LinkedRepository:
    """Model for linked GitHub repositories"""
    def __init__(self, user_id: str, repo_id: int, repo_name: str, 
                 repo_url: str, is_private: bool, stars: int = 0, 
                 last_updated: Optional[datetime] = None):
        self.user_id = user_id
        self.repo_id = repo_id
        self.repo_name = repo_name
        self.repo_url = repo_url
        self.is_private = is_private
        self.stars = stars
        self.last_updated = last_updated or datetime.utcnow()
        self.created_at = datetime.utcnow()

# Simplified in-memory storage for demonstration
# In production, use proper database (PostgreSQL, MySQL, etc.)
github_users_db = {}  # {user_id: GitHubUser}
linked_repos_db = {}  # {user_id: [LinkedRepository]}

def get_github_user(user_id: str) -> Optional[GitHubUser]:
    return github_users_db.get(user_id)

def save_github_user(user: GitHubUser) -> None:
    github_users_db[user.user_id] = user

def get_linked_repos(user_id: str) -> list:
    return linked_repos_db.get(user_id, [])

def save_linked_repo(repo: LinkedRepository) -> None:
    if repo.user_id not in linked_repos_db:
        linked_repos_db[repo.user_id] = []
    linked_repos_db[repo.user_id].append(repo)

def remove_linked_repo(user_id: str, repo_id: int) -> None:
    if user_id in linked_repos_db:
        linked_repos_db[user_id] = [r for r in linked_repos_db[user_id] if r.repo_id != repo_id]

def clear_linked_repos(user_id: str) -> None:
    if user_id in linked_repos_db:
        del linked_repos_db[user_id]
