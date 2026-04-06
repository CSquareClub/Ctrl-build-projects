from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


class NormalizedIssueInput(BaseModel):
    id: Optional[str] = None
    number: Optional[int] = None
    title: str
    body: str = ""
    state: str = "open"
    labels: list[str] = Field(default_factory=list)
    html_url: Optional[str] = None
    url: Optional[str] = None
    author_login: Optional[str] = None
    comment_count: int = 0
    canonical_text: Optional[str] = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class SimilarIssuesRequest(BaseModel):
    owner: str = Field(min_length=1)
    repo: str = Field(min_length=1)
    issue_number: Optional[int] = None
    target_issue: Optional[NormalizedIssueInput] = None
    token: Optional[str] = None
    k: int = Field(default=5, ge=1, le=25)
    include_pull_requests: bool = False
    state: str = Field(default="all", pattern="^(open|closed|all)$")

    @model_validator(mode="after")
    def validate_target(self) -> "SimilarIssuesRequest":
        has_issue_number = self.issue_number is not None
        has_target_payload = self.target_issue is not None

        if has_issue_number == has_target_payload:
            raise ValueError("Provide exactly one of issue_number or target_issue.")
        return self


class SimilarIssueTarget(BaseModel):
    issue_id: str
    issue_number: Optional[int] = None
    title: str
    html_url: Optional[str] = None
    source: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class SimilarIssueCandidateResponse(BaseModel):
    issue_id: str
    issue_number: Optional[int] = None
    title: str
    html_url: Optional[str] = None
    api_url: Optional[str] = None
    similarity_score: float
    rerank_score: float = 0.0
    final_score: float = 0.0
    duplicate_confidence: float = 0.0
    state: Optional[str] = None
    labels: list[str] = Field(default_factory=list)
    reasons: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SimilarIssuesResponse(BaseModel):
    owner: str
    repo: str
    total_indexed: int
    k: int
    embedding_provider: str
    vector_index: str
    embedding_path: str
    retrieved_at: datetime
    target: SimilarIssueTarget
    duplicate_confidence: float = 0.0
    calibration_notes: list[str] = Field(default_factory=list)
    candidates: list[SimilarIssueCandidateResponse] = Field(default_factory=list)
