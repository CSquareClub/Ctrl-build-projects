from fastapi import APIRouter
from typing import Dict, Any

from app.db import get_all_issues

router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Returns API health status and the current issue count.
    """
    issues_db = get_all_issues()
    return {
        "status": "ok",
        "issue_count": len(issues_db) if issues_db is not None else 0,
        "metadata": {
            "version": "1.0.0",
            "model": "all-MiniLM-L6-v2"
        }
    }
