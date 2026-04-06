import json
from pathlib import Path
from typing import Any, Dict, List, Optional


class IssueStorage:
    """Persistent issue storage backed by a JSON file."""

    def __init__(self, file_path: Optional[Path] = None):
        backend_root = Path(__file__).resolve().parents[2]
        self.file_path = file_path or (backend_root / "data" / "issues.json")
        self.issues: Dict[str, Dict[str, Any]] = {}
        self.load_issues()

    def load_issues(self) -> List[Dict[str, Any]]:
        """Load all issues from disk into memory cache."""
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

        if not self.file_path.exists():
            self.issues = {}
            self.save_issues()
            return []

        try:
            raw = self.file_path.read_text(encoding="utf-8").strip()
            data = json.loads(raw) if raw else []
        except (OSError, json.JSONDecodeError):
            self.issues = {}
            self.save_issues()
            return []

        if isinstance(data, dict):
            # Accept both list and dict payloads for backward compatibility.
            self.issues = {
                issue_id: issue
                for issue_id, issue in data.items()
                if isinstance(issue, dict)
            }
        elif isinstance(data, list):
            self.issues = {
                issue["id"]: issue
                for issue in data
                if isinstance(issue, dict) and issue.get("id")
            }
        else:
            self.issues = {}

        return list(self.issues.values())

    def save_issues(self) -> None:
        """Persist current issues cache to disk."""
        try:
            payload = list(self.issues.values())
            self.file_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except OSError as exc:
            raise RuntimeError(f"Failed to write issues to disk: {exc}") from exc

    def add_issue(self, issue: Dict[str, Any]) -> Dict[str, Any]:
        """Add issue to cache and persist it."""
        issue_id = issue.get("id")
        if not issue_id:
            raise ValueError("Issue id is required")

        self.issues[issue_id] = issue
        self.save_issues()
        return issue

    def update_issue(self, issue_id: str, issue: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update existing issue in cache and persist it."""
        if issue_id not in self.issues:
            return None

        self.issues[issue_id] = issue
        self.save_issues()
        return issue

    def delete_issue(self, issue_id: str) -> bool:
        """Delete issue from cache and persist changes."""
        if issue_id not in self.issues:
            return False

        del self.issues[issue_id]
        self.save_issues()
        return True

    def get_issue(self, issue_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a single issue from in-memory cache."""
        return self.issues.get(issue_id)

    def get_all_issues(self) -> List[Dict[str, Any]]:
        """Return all cached issues."""
        return list(self.issues.values())
