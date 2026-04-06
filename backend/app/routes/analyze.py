from typing import Any, Dict, List
from uuid import uuid4

import numpy as np
from fastapi import APIRouter, HTTPException

from app.models.issue_model import Issue
from app.schemas.issue_schema import AnalysisResponse, IssueInput, IssueSchema
from app.services.classifier_service import classify_issue
from app.services.embedding_service import get_embedding_service
from app.services.priority_service import assign_priority
from app.services.vector_service import find_similar_issues
from app.utils.issue_storage import IssueStorage

router = APIRouter()
embedding_service = get_embedding_service()
issue_storage = IssueStorage()

@router.post("/", response_model=AnalysisResponse)
async def analyze_issue(issue: IssueInput):
    label, classification_confidence = classify_issue(issue.title, issue.description)
    priority, priority_confidence = assign_priority(label, issue.title, issue.description)

    embedding = embedding_service.generate_combined_embedding(issue.title, issue.description)
    if embedding is None or len(embedding) == 0:
        raise HTTPException(status_code=500, detail="Failed to generate embedding")

    similar_issues = find_similar_issues(
        np.array(embedding), issue_storage.get_all_issues(), top_k=3
    )

    issue_record = Issue(
        id=str(uuid4()),
        title=issue.title,
        description=issue.description,
        repository="unknown",
        priority=priority,
        status="open",
        labels=[],
        embedding=[float(value) for value in embedding],
    )
    issue_storage.add_issue(issue_record.to_dict())

    return {
        "label": label,
        "priority": priority,
        "similar_issues": similar_issues,
        "confidence": {
            "classification": classification_confidence,
            "priority": priority_confidence,
        },
    }


@router.post("/batch")
async def analyze_batch(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not data:
        raise HTTPException(status_code=400, detail="Request body must be a non-empty list")

    failed_items = []
    analyzed_issues = []
    known_issues = issue_storage.get_all_issues()

    for idx, item in enumerate(data):
        try:
            validated_data = IssueSchema.validate_create(item)
            label, classification_confidence = classify_issue(
                validated_data["title"], validated_data["description"]
            )
            priority, priority_confidence = assign_priority(
                label, validated_data["title"], validated_data["description"]
            )

            embedding = embedding_service.generate_combined_embedding(
                validated_data["title"], validated_data["description"]
            )
            if embedding is None or len(embedding) == 0:
                raise ValueError("Failed to generate embedding")

            similar_issues = find_similar_issues(np.array(embedding), known_issues, top_k=3)
            issue = Issue(
                id=str(uuid4()),
                title=validated_data["title"],
                description=validated_data["description"],
                repository=validated_data["repository"],
                priority=priority,
                status=validated_data.get("status", "open"),
                labels=validated_data.get("labels", []),
                embedding=[float(value) for value in embedding],
            )

            serialized = IssueSchema.serialize_issue(issue)
            issue_storage.add_issue(serialized)
            known_issues.append(serialized)

            serialized["label"] = label
            serialized["similar_issues"] = similar_issues
            serialized["confidence"] = {
                "classification": classification_confidence,
                "priority": priority_confidence,
            }
            analyzed_issues.append(serialized)
        except ValueError as exc:
            failed_items.append({"index": idx, "error": str(exc)})

    return {
        "success": True if not failed_items else "partial",
        "total": len(data),
        "analyzed_count": len(analyzed_issues),
        "failed_count": len(failed_items),
        "failed_items": failed_items,
        "issues": analyzed_issues,
    }
