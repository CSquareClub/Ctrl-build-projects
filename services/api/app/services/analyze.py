from __future__ import annotations

import re
from dataclasses import dataclass

from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.schemas.classification import IssueClassificationRequest
from app.schemas.similar import SimilarIssueCandidateResponse, SimilarIssuesRequest
from app.schemas.triage import SimilarIssueCandidate, TriageResult
from app.services.classification import ClassificationService
from app.services.similar_issues import SimilarIssuesService


@dataclass
class AnalyzeService:
    classification_service: ClassificationService
    similar_issues_service: SimilarIssuesService

    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        similar_response = await self.similar_issues_service.find_similar(
            SimilarIssuesRequest(
                owner=request.owner,
                repo=request.repo,
                issue_number=request.issue_number,
                target_issue=request.target_issue,
                token=request.token,
                k=request.k,
                include_pull_requests=request.include_pull_requests,
                state=request.state,
            )
        )
        classification_response = await self.classification_service.classify(
            IssueClassificationRequest(
                owner=request.owner,
                repo=request.repo,
                issue_number=request.issue_number,
                target_issue=request.target_issue,
                token=request.token,
                k=request.k,
                include_pull_requests=request.include_pull_requests,
                state=request.state,
            )
        )

        target_body = request.target_issue.body if request.target_issue else None
        missing_info = _detect_missing_information(target_body)
        priority_score, priority_band, priority_reasons = _score_priority(
            body=target_body,
            predicted_type=classification_response.predicted_type,
            type_reasons=classification_response.type_reasons,
            duplicate_confidence=similar_response.duplicate_confidence,
        )

        triage_result = TriageResult(
            issue_id=similar_response.target.issue_id,
            predicted_type=classification_response.predicted_type,
            type_confidence=classification_response.type_confidence,
            priority_score=priority_score,
            priority_band=priority_band,
            priority_reasons=priority_reasons,
            duplicate_confidence=similar_response.duplicate_confidence,
            similar_issues=[
                _to_similar_issue_candidate(candidate)
                for candidate in similar_response.candidates
            ],
            suggested_labels=classification_response.suggested_labels,
            type_reasoning=classification_response.type_reasons,
            label_reasoning=classification_response.label_reasons,
            neighbor_evidence_used=classification_response.neighbor_evidence_used,
            neighbor_evidence_summary=[classification_response.neighbor_evidence_note],
            missing_information=missing_info,
            summary=_build_summary(
                predicted_type=classification_response.predicted_type,
                priority_band=priority_band,
                duplicate_confidence=similar_response.duplicate_confidence,
                missing_information=missing_info,
            ),
            analysis_version="w4-analyze-v1",
        )

        return AnalyzeResponse.from_triage_result(triage_result)


def _to_similar_issue_candidate(
    candidate: SimilarIssueCandidateResponse,
) -> SimilarIssueCandidate:
    return SimilarIssueCandidate(
        issue_id=candidate.issue_id,
        issue_number=candidate.issue_number,
        title=candidate.title,
        html_url=candidate.html_url,
        similarity_score=candidate.similarity_score,
        rerank_score=candidate.rerank_score,
        final_score=candidate.final_score,
        reasons=_normalize_candidate_reasons(candidate.reasons),
        labels=candidate.labels,
    )


def _normalize_candidate_reasons(reasons: list[object]) -> list[str]:
    normalized: list[str] = []
    for reason in reasons:
        if isinstance(reason, str):
            cleaned = reason.strip()
            if cleaned:
                normalized.append(cleaned)
            continue

        if not isinstance(reason, dict):
            continue

        detail = reason.get("detail")
        signal = reason.get("signal")
        strength = reason.get("strength")

        if isinstance(detail, str) and detail.strip():
            if isinstance(signal, str) and signal.strip():
                if isinstance(strength, (int, float)):
                    normalized.append(
                        f"{signal.strip()}: {detail.strip()} (strength {round(float(strength), 3)})"
                    )
                else:
                    normalized.append(f"{signal.strip()}: {detail.strip()}")
            else:
                normalized.append(detail.strip())

    deduped: list[str] = []
    seen: set[str] = set()
    for entry in normalized:
        if entry in seen:
            continue
        seen.add(entry)
        deduped.append(entry)
    return deduped


def _detect_missing_information(body: str | None) -> list[str]:
    if body is None:
        return []

    text = body.lower()
    missing: list[str] = []
    if not re.search(r"\b(steps to reproduce|repro|reproduction)\b", text):
        missing.append("reproduction steps")
    if not re.search(r"\b(expected|actual)\b", text):
        missing.append("expected vs actual behavior")
    if not re.search(r"\b(log|trace|traceback|stack)\b", text):
        missing.append("logs or stack traces")
    if not re.search(r"\b(version|environment|os|node|python|browser)\b", text):
        missing.append("environment/version details")
    return missing


def _score_priority(
    body: str | None,
    predicted_type: str,
    type_reasons: list[str],
    duplicate_confidence: float,
) -> tuple[int, str, list[str]]:
    text = (body or "").lower()
    score = 30
    reasons: list[str] = []

    if re.search(r"\b(crash|data loss|security|vulnerability|production)\b", text):
        score += 25
        reasons.append("Severity language indicates high user or production impact.")
    if re.search(r"\b(regression|broken|fails|error|exception)\b", text):
        score += 15
        reasons.append("Failure/regression markers increase urgency.")
    if predicted_type == "bug":
        score += 10
        reasons.append("Issue classified as bug, increasing baseline priority.")
    if any("security" in reason.lower() for reason in type_reasons):
        score += 10
        reasons.append("Classification signals include security-relevant wording.")
    if duplicate_confidence >= 0.75:
        score += 15
        reasons.append("Strong duplicate confidence suggests recurring impact.")
    elif duplicate_confidence >= 0.5:
        score += 8
        reasons.append("Moderate duplicate confidence suggests repeated reports.")

    score = max(0, min(100, score))
    if score >= 75:
        band = "high"
    elif score >= 40:
        band = "medium"
    else:
        band = "low"

    if not reasons:
        reasons.append(
            "No high-severity markers detected; defaulting to baseline priority."
        )

    return score, band, reasons


def _build_summary(
    predicted_type: str,
    priority_band: str,
    duplicate_confidence: float,
    missing_information: list[str],
) -> str:
    duplicate_descriptor = (
        "likely duplicate"
        if duplicate_confidence >= 0.75
        else "possible duplicate"
        if duplicate_confidence >= 0.5
        else "no strong duplicate signal"
    )
    info_descriptor = (
        "report appears complete"
        if not missing_information
        else f"missing {len(missing_information)} key detail(s)"
    )
    return (
        f"Predicted {predicted_type.replace('_', ' ')}, {priority_band} priority, "
        f"{duplicate_descriptor}; {info_descriptor}."
    )
