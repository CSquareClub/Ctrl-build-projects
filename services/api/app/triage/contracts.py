from typing import Protocol

from app.schemas.issue import NormalizedIssue
from app.schemas.triage import SimilarIssueCandidate, TriageResult


class DuplicateDetector(Protocol):
    def find_similar(
        self, issue: NormalizedIssue, k: int = 5
    ) -> list[SimilarIssueCandidate]: ...


class IssueClassifier(Protocol):
    def classify(self, issue: NormalizedIssue) -> tuple[str, float, list[str]]: ...


class PriorityScorer(Protocol):
    def score(self, issue: NormalizedIssue) -> tuple[int, str, list[str]]: ...


class MissingInfoDetector(Protocol):
    def detect(self, issue: NormalizedIssue) -> list[str]: ...


class TriageOrchestrator(Protocol):
    def analyze(self, issue: NormalizedIssue) -> TriageResult: ...
