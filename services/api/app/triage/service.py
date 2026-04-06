from dataclasses import dataclass
from typing import Optional

from app.schemas.issue import NormalizedIssue
from app.schemas.triage import SimilarIssueCandidate
from app.schemas.triage import TriageResult
from app.triage.classification import (
    ExplainableIssueClassifier,
    ExplainableLabelSuggester,
)
from app.triage.contracts import TriageOrchestrator


class UnimplementedTriageOrchestrator(TriageOrchestrator):
    def analyze(self, issue: NormalizedIssue) -> TriageResult:
        raise NotImplementedError(
            "Triage orchestration is not implemented in this branch."
        )


@dataclass
class ClassificationLabelingResult:
    predicted_type: str
    type_confidence: float
    type_reasoning: list[str]
    suggested_labels: list[str]
    label_reasoning: list[str]
    neighbor_evidence_used: bool
    neighbor_evidence_summary: list[str]


class ClassificationLabelingService:
    def __init__(
        self,
        classifier: Optional[ExplainableIssueClassifier] = None,
        label_suggester: Optional[ExplainableLabelSuggester] = None,
    ) -> None:
        self.classifier = classifier or ExplainableIssueClassifier()
        self.label_suggester = label_suggester or ExplainableLabelSuggester()

    def analyze_classification(
        self,
        issue: NormalizedIssue,
        similar_issues: Optional[list[SimilarIssueCandidate]] = None,
    ) -> ClassificationLabelingResult:
        type_decision = self.classifier.classify(
            issue=issue,
            similar_issues=similar_issues,
        )
        label_decision = self.label_suggester.suggest(
            issue=issue,
            predicted_type=type_decision.predicted_type,
            similar_issues=similar_issues,
        )

        return ClassificationLabelingResult(
            predicted_type=type_decision.predicted_type,
            type_confidence=type_decision.confidence,
            type_reasoning=type_decision.reasoning,
            suggested_labels=label_decision.labels,
            label_reasoning=label_decision.reasoning,
            neighbor_evidence_used=type_decision.neighbor_evidence_used,
            neighbor_evidence_summary=type_decision.neighbor_evidence_summary,
        )
