from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

from app.schemas.issue import NormalizedIssue
from app.schemas.triage import SimilarIssueCandidate

ISSUE_TYPES: tuple[str, ...] = (
    "bug",
    "feature_request",
    "documentation",
    "support_question",
    "spam_or_noise",
)

_TYPE_TO_BASE_LABEL: dict[str, str] = {
    "bug": "bug",
    "feature_request": "enhancement",
    "documentation": "documentation",
    "support_question": "question",
    "spam_or_noise": "spam",
}

_CATEGORY_KEYWORDS: dict[str, dict[str, float]] = {
    "bug": {
        "bug": 1.4,
        "crash": 1.8,
        "exception": 1.7,
        "traceback": 1.7,
        "regression": 1.9,
        "broken": 1.3,
        "fails": 1.4,
        "failing": 1.4,
        "error": 1.4,
        "incorrect": 1.1,
        "unexpected": 1.1,
        "not working": 1.6,
    },
    "feature_request": {
        "feature request": 2.0,
        "enhancement": 1.8,
        "proposal": 1.3,
        "add support": 1.7,
        "would like": 1.5,
        "please add": 1.6,
        "new feature": 1.8,
        "allow": 1.1,
        "should support": 1.4,
        "request": 0.8,
    },
    "documentation": {
        "documentation": 2.0,
        "docs": 1.8,
        "readme": 1.6,
        "guide": 1.1,
        "tutorial": 1.0,
        "example": 0.9,
        "typo": 1.8,
        "grammar": 1.3,
        "spelling": 1.4,
        "doc": 1.2,
    },
    "support_question": {
        "how do i": 2.1,
        "how can i": 2.1,
        "is there a way": 1.7,
        "question": 1.6,
        "help": 1.0,
        "can someone": 1.4,
        "usage": 1.0,
        "what is": 1.0,
        "why does": 1.1,
        "does this": 1.0,
    },
    "spam_or_noise": {
        "buy now": 3.0,
        "free money": 3.0,
        "crypto": 2.4,
        "casino": 2.4,
        "seo": 2.2,
        "marketing": 1.8,
        "click here": 2.5,
        "telegram": 2.0,
        "whatsapp": 2.0,
        "viagra": 3.0,
    },
}

_NEIGHBOR_LABEL_TO_TYPE: dict[str, str] = {
    "bug": "bug",
    "defect": "bug",
    "regression": "bug",
    "enhancement": "feature_request",
    "feature": "feature_request",
    "documentation": "documentation",
    "docs": "documentation",
    "question": "support_question",
    "support": "support_question",
    "usage": "support_question",
    "spam": "spam_or_noise",
    "invalid": "spam_or_noise",
}

_TITLE_WEIGHT = 1.4
_BODY_WEIGHT = 1.0
_CANONICAL_WEIGHT = 0.6
_NEIGHBOR_SCORE_FLOOR = 0.72


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.lower()).strip()


def _contains_phrase(text: str, phrase: str) -> bool:
    if not phrase:
        return False
    return phrase in text


def _has_code_or_error_markers(text: str) -> bool:
    markers = ("traceback", "stack trace", "exception", "error:", "segfault")
    return any(marker in text for marker in markers)


def _count_urls(text: str) -> int:
    return len(re.findall(r"https?://", text))


def _word_count(text: str) -> int:
    if not text:
        return 0
    return len([token for token in text.split(" ") if token])


@dataclass
class ClassificationDecision:
    predicted_type: str
    confidence: float
    reasoning: list[str]
    neighbor_evidence_used: bool
    neighbor_evidence_summary: list[str]


@dataclass
class LabelSuggestionDecision:
    labels: list[str]
    reasoning: list[str]


class ExplainableIssueClassifier:
    def classify(
        self,
        issue: NormalizedIssue,
        similar_issues: Optional[list[SimilarIssueCandidate]] = None,
    ) -> ClassificationDecision:
        title = _normalize_text(issue.title)
        body = _normalize_text(issue.body)
        canonical = _normalize_text(issue.canonical_text)
        scores: dict[str, float] = {category: 0.0 for category in ISSUE_TYPES}
        reasons: list[str] = []

        self._score_keywords(title, scores, weight=_TITLE_WEIGHT)
        self._score_keywords(body, scores, weight=_BODY_WEIGHT)
        self._score_keywords(canonical, scores, weight=_CANONICAL_WEIGHT)

        if "?" in issue.title or "?" in issue.body:
            scores["support_question"] += 0.8
            reasons.append("Contains explicit question phrasing.")

        if any(
            phrase in canonical
            for phrase in (
                "steps to reproduce",
                "reproduce",
                "expected behavior",
                "actual behavior",
            )
        ):
            scores["bug"] += 1.1
            reasons.append(
                "Includes reproduction or expected/actual behavior language."
            )

        if _has_code_or_error_markers(canonical):
            scores["bug"] += 1.2
            reasons.append(
                "Contains technical error markers (traceback/exception/error)."
            )

        if _word_count(canonical) < 6:
            scores["spam_or_noise"] += 0.6
            reasons.append("Very short report with limited actionable detail.")

        url_count = _count_urls(canonical)
        if url_count >= 4:
            scores["spam_or_noise"] += 1.0
            reasons.append("Contains unusually high number of links.")

        self._score_existing_labels(issue.labels, scores, reasons)
        neighbor_summary, neighbor_used = self._score_neighbor_evidence(
            similar_issues=similar_issues,
            scores=scores,
        )
        reasons.extend(neighbor_summary)

        predicted_type = max(scores, key=scores.get)
        ordered_scores = sorted(scores.values(), reverse=True)
        top = ordered_scores[0] if ordered_scores else 0.0
        runner_up = ordered_scores[1] if len(ordered_scores) > 1 else 0.0

        confidence = max(0.05, min(0.98, 0.5 + (top - runner_up) / 4.0))
        reasons.insert(
            0,
            f"Predicted as {predicted_type} from weighted lexical and structure signals.",
        )

        return ClassificationDecision(
            predicted_type=predicted_type,
            confidence=round(confidence, 3),
            reasoning=reasons[:8],
            neighbor_evidence_used=neighbor_used,
            neighbor_evidence_summary=neighbor_summary,
        )

    def _score_keywords(
        self,
        text: str,
        scores: dict[str, float],
        *,
        weight: float,
    ) -> None:
        if not text:
            return

        for category, phrases in _CATEGORY_KEYWORDS.items():
            for phrase, phrase_weight in phrases.items():
                if _contains_phrase(text, phrase):
                    scores[category] += phrase_weight * weight

    def _score_existing_labels(
        self,
        labels: list[str],
        scores: dict[str, float],
        reasons: list[str],
    ) -> None:
        normalized_labels = {_normalize_text(label) for label in labels if label}
        for label in normalized_labels:
            inferred_type = _NEIGHBOR_LABEL_TO_TYPE.get(label)
            if inferred_type:
                scores[inferred_type] += 0.8
                reasons.append(
                    f"Existing label '{label}' supports {inferred_type} classification."
                )

    def _score_neighbor_evidence(
        self,
        similar_issues: Optional[list[SimilarIssueCandidate]],
        scores: dict[str, float],
    ) -> tuple[list[str], bool]:
        if not similar_issues:
            return ([], False)

        applied_reasons: list[str] = []
        used = False
        for candidate in similar_issues:
            candidate_score = max(candidate.final_score, candidate.similarity_score)
            if candidate_score < _NEIGHBOR_SCORE_FLOOR:
                continue

            normalized_labels = {
                _normalize_text(label) for label in candidate.labels if label
            }
            for label in normalized_labels:
                inferred_type = _NEIGHBOR_LABEL_TO_TYPE.get(label)
                if not inferred_type:
                    continue
                boost = 0.35 + (candidate_score - _NEIGHBOR_SCORE_FLOOR)
                scores[inferred_type] += max(0.25, min(1.0, boost))
                applied_reasons.append(
                    f"Neighbor #{candidate.issue_number or candidate.issue_id} label '{label}' added evidence for {inferred_type}."
                )
                used = True

        return (applied_reasons[:3], used)


class ExplainableLabelSuggester:
    def suggest(
        self,
        issue: NormalizedIssue,
        predicted_type: str,
        similar_issues: Optional[list[SimilarIssueCandidate]] = None,
    ) -> LabelSuggestionDecision:
        labels: list[str] = []
        reasons: list[str] = []

        base_label = _TYPE_TO_BASE_LABEL.get(predicted_type)
        if base_label:
            labels.append(base_label)
            reasons.append(
                f"Base label '{base_label}' added from predicted type {predicted_type}."
            )

        canonical = _normalize_text(issue.canonical_text)
        if predicted_type == "bug":
            if "regression" in canonical:
                labels.append("regression")
                reasons.append("Regression language detected in report text.")
            if any(marker in canonical for marker in ("crash", "panic", "segfault")):
                labels.append("crash")
                reasons.append("Crash marker detected in report text.")
            if "steps to reproduce" not in canonical:
                labels.append("needs-repro")
                reasons.append("No explicit reproduction steps found.")

        if predicted_type == "documentation" and any(
            token in canonical for token in ("typo", "spelling", "grammar")
        ):
            labels.append("docs")
            reasons.append("Doc fix appears wording-focused (typo/spelling/grammar).")

        if predicted_type == "support_question" and issue.comment_count == 0:
            labels.append("needs-triage")
            reasons.append("Support-style issue has no discussion yet.")

        if "security" in canonical or "vulnerability" in canonical:
            labels.append("security")
            reasons.append("Security-related wording appears in issue content.")

        neighbor_labels = self._neighbor_label_hints(similar_issues)
        for label in neighbor_labels:
            if label in {"duplicate", "wontfix", "invalid"}:
                continue
            labels.append(label)
            reasons.append(
                f"Label '{label}' appears repeatedly in high-similarity neighbors."
            )

        deduped_labels = self._dedupe(labels)[:5]
        return LabelSuggestionDecision(labels=deduped_labels, reasoning=reasons[:8])

    def _neighbor_label_hints(
        self,
        similar_issues: Optional[list[SimilarIssueCandidate]],
    ) -> list[str]:
        if not similar_issues:
            return []

        counts: dict[str, int] = {}
        for candidate in similar_issues:
            candidate_score = max(candidate.final_score, candidate.similarity_score)
            if candidate_score < _NEIGHBOR_SCORE_FLOOR:
                continue
            for label in candidate.labels:
                normalized = _normalize_text(label)
                if not normalized:
                    continue
                counts[normalized] = counts.get(normalized, 0) + 1

        strong_labels = [label for label, count in counts.items() if count >= 2]
        return sorted(strong_labels)[:2]

    def _dedupe(self, labels: list[str]) -> list[str]:
        seen: set[str] = set()
        ordered: list[str] = []
        for raw in labels:
            normalized = _normalize_text(raw)
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            ordered.append(normalized)
        return ordered
