import json
import os
from typing import List, Dict, Any

issues_db: List[Dict[str, Any]] = []

def get_all_issues() -> List[Dict[str, Any]]:
    return issues_db

def add_issue(issue: Dict[str, Any]) -> None:
    issues_db.append(issue)

# Simple initialization hook if needed
def load_issues() -> None:
    global issues_db
    file_path = os.path.join(os.path.dirname(__file__), "..", "data", "issues.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                issues_db = json.load(f)
        except Exception:
            pass
