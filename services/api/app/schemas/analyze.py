from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.similar import NormalizedIssueInput
from app.schemas.triage import TriageResult


class AnalyzeRequest(BaseModel):
    owner: str = Field(min_length=1)
    repo: str = Field(min_length=1)
    issue_number: Optional[int] = None
    target_issue: Optional[NormalizedIssueInput] = None
    token: Optional[str] = None
    k: int = Field(default=5, ge=1, le=25)
    include_pull_requests: bool = False
    state: str = Field(default="all", pattern="^(open|closed|all)$")

    @model_validator(mode="after")
    def validate_target(self) -> "AnalyzeRequest":
        has_issue_number = self.issue_number is not None
        has_target_payload = self.target_issue is not None

        if has_issue_number == has_target_payload:
            raise ValueError("Provide exactly one of issue_number or target_issue.")
        return self


class PredictedTypeSection(BaseModel):
    label: str
    confidence: float
    reasons: list[str] = Field(default_factory=list)


class SuggestedLabelsSection(BaseModel):
    items: list[str] = Field(default_factory=list)
    reasons: list[str] = Field(default_factory=list)


class DuplicateCandidateSection(BaseModel):
    issue_id: str
    issue_number: Optional[int] = None
    title: str
    html_url: Optional[str] = None
    similarity_score: Optional[float] = None
    rerank_score: Optional[float] = None
    final_score: Optional[float] = None
    reasons: list[str] = Field(default_factory=list)


class DuplicateCandidatesSection(BaseModel):
    confidence: float
    items: list[DuplicateCandidateSection] = Field(default_factory=list)


class PrioritySection(BaseModel):
    score: int
    band: str
    reasons: list[str] = Field(default_factory=list)


class MissingInformationSection(BaseModel):
    items: list[str] = Field(default_factory=list)


class ExplanationSection(BaseModel):
    summary: str
    type_reasons: list[str] = Field(default_factory=list)
    label_reasons: list[str] = Field(default_factory=list)
    duplicate_reasons: list[str] = Field(default_factory=list)
    priority_reasons: list[str] = Field(default_factory=list)
    missing_information_reasons: list[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    issue_id: str
    analysis_version: str = "v0"
    predicted_type: PredictedTypeSection
    suggested_labels: SuggestedLabelsSection
    duplicate_candidates: DuplicateCandidatesSection
    priority: PrioritySection
    missing_information: MissingInformationSection
    explanation: ExplanationSection

    @classmethod
    def from_triage_result(cls, triage_result: TriageResult) -> "AnalyzeResponse":
        duplicate_reasons: list[str] = []
        duplicate_items = []

        for candidate in triage_result.similar_issues:
            duplicate_items.append(
                DuplicateCandidateSection(
                    issue_id=candidate.issue_id,
                    issue_number=candidate.issue_number,
                    title=candidate.title,
                    html_url=candidate.html_url,
                    similarity_score=candidate.similarity_score,
                    rerank_score=candidate.rerank_score,
                    final_score=candidate.final_score,
                    reasons=candidate.reasons,
                )
            )
            duplicate_reasons.extend(candidate.reasons)

        deduped_duplicate_reasons: list[str] = []
        seen_duplicate_reasons: set[str] = set()
        for reason in duplicate_reasons:
            normalized = reason.strip()
            if not normalized or normalized in seen_duplicate_reasons:
                continue
            seen_duplicate_reasons.add(normalized)
            deduped_duplicate_reasons.append(normalized)

        return cls(
            issue_id=triage_result.issue_id,
            analysis_version=triage_result.analysis_version,
            predicted_type=PredictedTypeSection(
                label=triage_result.predicted_type,
                confidence=triage_result.type_confidence,
                reasons=triage_result.type_reasoning,
            ),
            suggested_labels=SuggestedLabelsSection(
                items=triage_result.suggested_labels,
                reasons=triage_result.label_reasoning,
            ),
            duplicate_candidates=DuplicateCandidatesSection(
                confidence=triage_result.duplicate_confidence,
                items=duplicate_items,
            ),
            priority=PrioritySection(
                score=triage_result.priority_score,
                band=triage_result.priority_band,
                reasons=triage_result.priority_reasons,
            ),
            missing_information=MissingInformationSection(
                items=triage_result.missing_information,
            ),
            explanation=ExplanationSection(
                summary=triage_result.summary,
                type_reasons=triage_result.type_reasoning,
                label_reasons=triage_result.label_reasoning,
                duplicate_reasons=deduped_duplicate_reasons,
                priority_reasons=triage_result.priority_reasons,
                missing_information_reasons=triage_result.missing_information,
            ),
        )
