from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.similar import NormalizedIssueInput

IssueType = Literal[
    "bug",
    "feature_request",
    "documentation",
    "support_question",
    "spam_or_noise",
]


class IssueClassificationRequest(BaseModel):
    owner: str = Field(min_length=1)
    repo: str = Field(min_length=1)
    issue_number: Optional[int] = None
    target_issue: Optional[NormalizedIssueInput] = None
    token: Optional[str] = None
    k: int = Field(default=5, ge=1, le=25)
    include_pull_requests: bool = False
    state: str = Field(default="all", pattern="^(open|closed|all)$")

    @model_validator(mode="after")
    def validate_target(self) -> "IssueClassificationRequest":
        has_issue_number = self.issue_number is not None
        has_target_payload = self.target_issue is not None

        if has_issue_number == has_target_payload:
            raise ValueError("Provide exactly one of issue_number or target_issue.")
        return self


class ClassificationTarget(BaseModel):
    issue_id: str
    issue_number: Optional[int] = None
    title: str
    source: str


class SimilarIssueEvidence(BaseModel):
    issue_id: str
    issue_number: Optional[int] = None
    title: str
    similarity_score: float
    labels: list[str] = Field(default_factory=list)


class IssueClassificationResponse(BaseModel):
    owner: str
    repo: str
    analyzed_at: datetime
    analysis_version: str = "w3-classification-v1"
    predicted_type: IssueType
    type_confidence: float
    suggested_labels: list[str] = Field(default_factory=list)
    type_reasons: list[str] = Field(default_factory=list)
    label_reasons: list[str] = Field(default_factory=list)
    neighbor_evidence_used: bool = False
    neighbor_evidence_note: str = ""
    target: ClassificationTarget
    similar_issue_evidence: list[SimilarIssueEvidence] = Field(default_factory=list)
