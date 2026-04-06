from typing import Optional

from pydantic import BaseModel, Field


class SimilarIssueCandidate(BaseModel):
    issue_id: str
    issue_number: Optional[int] = None
    title: str
    html_url: Optional[str] = None
    similarity_score: float = 0.0
    rerank_score: float = 0.0
    final_score: float = 0.0
    reasons: list[str] = Field(default_factory=list)
    labels: list[str] = Field(default_factory=list)


class TriageResult(BaseModel):
    issue_id: str
    predicted_type: str
    type_confidence: float
    priority_score: int
    priority_band: str
    priority_reasons: list[str] = Field(default_factory=list)
    duplicate_confidence: float
    similar_issues: list[SimilarIssueCandidate] = Field(default_factory=list)
    suggested_labels: list[str] = Field(default_factory=list)
    type_reasoning: list[str] = Field(default_factory=list)
    label_reasoning: list[str] = Field(default_factory=list)
    neighbor_evidence_used: bool = False
    neighbor_evidence_summary: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    summary: str
    analysis_version: str = "v0"
