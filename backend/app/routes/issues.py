from datetime import datetime
from typing import Any, Dict
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.schemas.issue_schema import IssueSchema
from app.utils.issue_storage import IssueStorage

router = APIRouter()
issue_storage = IssueStorage()


@router.on_event("startup")
async def load_issues_on_startup() -> None:
    issue_storage.load_issues()


@router.get("/")
async def get_all_issues() -> Dict[str, Any]:
    issues = issue_storage.get_all_issues()
    return {"success": True, "count": len(issues), "issues": issues}


@router.get("/priority/{priority}")
async def get_issues_by_priority(priority: str) -> Dict[str, Any]:
    valid_priorities = ["low", "medium", "high", "critical"]
    normalized_priority = priority.lower()
    if normalized_priority not in valid_priorities:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid priority. Must be one of: {valid_priorities}",
        )

    issues = [
        issue
        for issue in issue_storage.get_all_issues()
        if issue.get("priority", "").lower() == normalized_priority
    ]
    return {"success": True, "count": len(issues), "issues": issues}


@router.get("/{issue_id}")
async def get_issue(issue_id: str) -> Dict[str, Any]:
    issue = issue_storage.get_issue(issue_id)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"success": True, "issue": issue}


@router.post("/")
async def create_issue(payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        validated_data = IssueSchema.validate_create(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    now = datetime.utcnow().isoformat()
    issue = {
        "id": str(uuid4()),
        "title": validated_data["title"],
        "description": validated_data["description"],
        "repository": validated_data["repository"],
        "priority": validated_data["priority"],
        "status": validated_data["status"],
        "labels": validated_data["labels"],
        "created_at": now,
        "updated_at": now,
    }

    try:
        issue_storage.add_issue(issue)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"success": True, "issue": issue}


@router.put("/{issue_id}")
async def update_issue(issue_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    existing_issue = issue_storage.get_issue(issue_id)
    if not existing_issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    try:
        validated_updates = IssueSchema.validate_update(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    updated_issue = dict(existing_issue)
    updated_issue.update(validated_updates)

    updated_issue["updated_at"] = datetime.utcnow().isoformat()

    try:
        issue_storage.update_issue(issue_id, updated_issue)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"success": True, "issue": updated_issue}


@router.delete("/{issue_id}")
async def delete_issue(issue_id: str) -> Dict[str, Any]:
    try:
        deleted = issue_storage.delete_issue(issue_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail="Issue not found")

    return {"success": True, "message": "Issue deleted"}
