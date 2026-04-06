from typing import Any, Dict, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.issue_model import Issue
from app.schemas.issue_schema import IssueInput, IssueSchema
from app.services.classifier_service import triage_issue
from app.services.gemini_service import get_gemini_embedding_service
from app.services.embedding_service import get_embedding_service
from app.services.chromadb_service import get_chromadb_service
from app.utils.issue_storage import IssueStorage

router = APIRouter()
issue_storage = IssueStorage()


def _get_embedding(title: str, description: str) -> List[float]:
    """Get embedding using Gemini first, then fallback to sentence-transformers"""
    gemini_service = get_gemini_embedding_service()
    if gemini_service.is_available():
        embedding = gemini_service.generate_embedding(f"{title} {description}")
        if embedding:
            return embedding
    
    # Fallback to sentence-transformers
    embedding_service = get_embedding_service()
    return embedding_service.generate_combined_embedding(title, description)


def _find_similar_issues(embedding: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
    """Find similar issues using ChromaDB first, then fallback"""
    chromadb_service = get_chromadb_service()
    if chromadb_service.is_available():
        similar = chromadb_service.find_similar(embedding, top_k=top_k)
        if similar:
            return similar
    
    # Fallback to in-memory search
    import numpy as np
    from app.services.vector_service import find_similar_issues as find_similar_memory
    
    all_issues = issue_storage.get_all_issues()
    results = find_similar_memory(np.array(embedding), all_issues, top_k=top_k)
    
    return [
        {
            "title": r.get("title", ""),
            "score": r.get("similarity_score", 0)
        }
        for r in results
    ]


@router.post("/")
async def analyze_issue(issue: IssueInput):
    """
    Analyze a GitHub issue and return classification, priority, labels, and similar issues.
    """
    # Get AI classification
    triage_result = triage_issue(issue.title, issue.description)
    classification = triage_result["label"]
    priority = triage_result["priority"]
    labels = triage_result.get("labels", [])
    reason = triage_result["reason"]

    # Generate embedding
    embedding = _get_embedding(issue.title, issue.description)
    if not embedding:
        raise HTTPException(status_code=500, detail="Failed to generate embedding")

    # Find similar issues
    similar_issues = _find_similar_issues(embedding, top_k=3)

    # Store in ChromaDB
    issue_id = str(uuid4())
    chromadb_service = get_chromadb_service()
    if chromadb_service.is_available():
        chromadb_service.add_issue(
            issue_id=issue_id,
            embedding=embedding,
            metadata={
                "title": issue.title,
                "description": issue.description,
                "priority": priority,
                "classification": classification,
            }
        )

    # Also store in local storage for persistence
    issue_record = Issue(
        id=issue_id,
        title=issue.title,
        description=issue.description,
        repository="unknown",
        priority=priority,
        status="open",
        labels=labels,
    )
    issue_storage.add_issue(issue_record.to_dict())

    return {
        "classification": classification,
        "priority": priority,
        "labels": labels,
        "similar_issues": similar_issues,
    }


@router.post("/batch")
async def analyze_batch(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze multiple issues in batch"""
    if not data:
        raise HTTPException(status_code=400, detail="Request body must be a non-empty list")

    failed_items = []
    analyzed_issues = []

    for idx, item in enumerate(data):
        try:
            validated_data = IssueSchema.validate_create(item)
            triage_result = triage_issue(
                validated_data["title"], validated_data["description"]
            )
            classification = triage_result["label"]
            priority = triage_result["priority"]
            labels = triage_result.get("labels", [])

            embedding = _get_embedding(validated_data["title"], validated_data["description"])
            if not embedding:
                raise ValueError("Failed to generate embedding")

            similar_issues = _find_similar_issues(embedding, top_k=3)
            
            issue_id = str(uuid4())
            
            # Store in ChromaDB
            chromadb_service = get_chromadb_service()
            if chromadb_service.is_available():
                chromadb_service.add_issue(
                    issue_id=issue_id,
                    embedding=embedding,
                    metadata={
                        "title": validated_data["title"],
                        "description": validated_data["description"],
                        "priority": priority,
                        "classification": classification,
                    }
                )

            issue = Issue(
                id=issue_id,
                title=validated_data["title"],
                description=validated_data["description"],
                repository=validated_data["repository"],
                priority=priority,
                status=validated_data.get("status", "open"),
                labels=labels,
            )

            serialized = issue.to_dict()
            issue_storage.add_issue(serialized)

            analyzed_issues.append({
                **serialized,
                "classification": classification,
                "labels": labels,
                "similar_issues": similar_issues,
            })
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
