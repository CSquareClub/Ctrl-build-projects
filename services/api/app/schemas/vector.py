from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class IndexRepoIssuesRequest(BaseModel):
    owner: str
    repo: str
    state: str = "all"
    include_pull_requests: bool = False
    token: Optional[str] = None


class IndexedIssueResult(BaseModel):
    issue_id: str
    issue_number: int
    title: str


class IndexRepoIssuesResponse(BaseModel):
    repository: str
    indexed_count: int
    skipped_count: int = 0
    cleared_count: int = 0
    reindex_required: bool = False
    embedding_signature: str
    embedding_provider: str
    embedding_model: str
    vector_store_provider: str
    items: list[IndexedIssueResult] = Field(default_factory=list)


class SimilarityQueryRequest(BaseModel):
    query_text: str
    k: int = 5
    owner: Optional[str] = None
    repo: Optional[str] = None


class SimilarityCandidate(BaseModel):
    issue_id: str
    similarity_score: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class SimilarityQueryResponse(BaseModel):
    query_text: str
    k: int
    embedding_provider: str
    embedding_model: str
    embedding_signature: str
    vector_store_provider: str
    candidates: list[SimilarityCandidate] = Field(default_factory=list)
