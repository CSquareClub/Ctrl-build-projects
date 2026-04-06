from __future__ import annotations

from typing import Protocol

from app.schemas.issue import NormalizedIssue
from app.schemas.triage import SimilarIssueCandidate, TriageResult
from app.triage.classification import ClassificationDecision, LabelSuggestionDecision


class DuplicateDetector(Protocol):
    def find_similar(
        self, issue: NormalizedIssue, k: int = 5
    ) -> list[SimilarIssueCandidate]: ...


class IssueClassifier(Protocol):
    def classify(
        self,
        issue: NormalizedIssue,
        similar_issues: list[SimilarIssueCandidate] | None = None,
    ) -> ClassificationDecision: ...


class LabelSuggester(Protocol):
    def suggest(
        self,
        issue: NormalizedIssue,
        predicted_type: str,
        similar_issues: list[SimilarIssueCandidate] | None = None,
    ) -> LabelSuggestionDecision: ...


class PriorityScorer(Protocol):
    def score(self, issue: NormalizedIssue) -> tuple[int, str, list[str]]: ...


class MissingInfoDetector(Protocol):
    def detect(self, issue: NormalizedIssue) -> list[str]: ...


class TriageOrchestrator(Protocol):
    def analyze(self, issue: NormalizedIssue) -> TriageResult: ...
