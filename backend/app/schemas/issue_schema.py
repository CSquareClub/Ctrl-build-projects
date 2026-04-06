from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class SimilarIssue(BaseModel):
    """A similar issue found in the database"""
    id: Optional[str] = None
    title: str
    score: float = Field(..., ge=0.0, le=1.0, description="Similarity score")


class IssueInput(BaseModel):
    """Input for issue analysis"""
    title: str = Field(..., min_length=1, max_length=200, description="The title of the GitHub issue")
    description: str = Field(..., description="The details and markdown body of the issue")


class AnalysisResponse(BaseModel):
    """Response from issue analysis"""
    classification: str = Field(..., description="Classification category: bug, feature, docs, question")
    priority: str = Field(..., description="Priority level: low, medium, high, critical")
    labels: List[str] = Field(default_factory=list, description="Suggested labels")
    similar_issues: List[SimilarIssue] = Field(default_factory=list, description="Similar issues found")


class ConflictInput(BaseModel):
    """Input for conflict detection"""
    code_a: str = Field(..., description="First code snippet")
    code_b: str = Field(..., description="Second code snippet")


class ConflictResponse(BaseModel):
    """Response from conflict detection"""
    conflicts: List[str] = Field(default_factory=list, description="List of conflicts")
    summary: str = Field(..., description="Summary of differences")


class IssueSchema:
    VALID_PRIORITIES = {"low", "medium", "high", "critical"}
    VALID_STATUSES = {"open", "closed", "in_progress"}

    @classmethod
    def validate_create(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            raise ValueError("Request payload must be a JSON object")

        title = str(data.get("title", "")).strip()
        description = str(data.get("description", "")).strip()
        if not title:
            raise ValueError("title is required and must be non-empty")
        if not description:
            raise ValueError("description is required and must be non-empty")

        priority = str(data.get("priority", "medium")).lower().strip()
        if priority not in cls.VALID_PRIORITIES:
            raise ValueError(
                f"Invalid priority. Must be one of: {sorted(cls.VALID_PRIORITIES)}"
            )

        status = str(data.get("status", "open")).lower().strip()
        if status not in cls.VALID_STATUSES:
            raise ValueError(
                f"Invalid status. Must be one of: {sorted(cls.VALID_STATUSES)}"
            )

        labels = data.get("labels", [])
        if not isinstance(labels, list):
            raise ValueError("labels must be a list")

        return {
            "title": title,
            "description": description,
            "repository": str(data.get("repository", "unknown")).strip() or "unknown",
            "priority": priority,
            "status": status,
            "labels": labels,
        }

    @classmethod
    def validate_update(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(data, dict):
            raise ValueError("Request payload must be a JSON object")

        validated: Dict[str, Any] = {}

        if "title" in data:
            title = str(data.get("title", "")).strip()
            if not title:
                raise ValueError("title must be non-empty")
            validated["title"] = title

        if "description" in data:
            description = str(data.get("description", "")).strip()
            if not description:
                raise ValueError("description must be non-empty")
            validated["description"] = description

        if "priority" in data:
            priority = str(data.get("priority", "")).lower().strip()
            if priority not in cls.VALID_PRIORITIES:
                raise ValueError(
                    f"Invalid priority. Must be one of: {sorted(cls.VALID_PRIORITIES)}"
                )
            validated["priority"] = priority

        if "status" in data:
            status = str(data.get("status", "")).lower().strip()
            if status not in cls.VALID_STATUSES:
                raise ValueError(
                    f"Invalid status. Must be one of: {sorted(cls.VALID_STATUSES)}"
                )
            validated["status"] = status

        if "labels" in data:
            labels = data.get("labels")
            if not isinstance(labels, list):
                raise ValueError("labels must be a list")
            validated["labels"] = labels

        if "repository" in data:
            validated["repository"] = str(data.get("repository", "")).strip() or "unknown"

        return validated

    @staticmethod
    def serialize_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
        if hasattr(issue, "to_dict"):
            return issue.to_dict()  # type: ignore[no-any-return]
        return dict(issue)
