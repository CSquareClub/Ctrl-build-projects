from app.schemas.issue import NormalizedIssue
from app.schemas.triage import TriageResult
from app.triage.contracts import TriageOrchestrator


class UnimplementedTriageOrchestrator(TriageOrchestrator):
    def analyze(self, issue: NormalizedIssue) -> TriageResult:
        raise NotImplementedError(
            "Triage orchestration is not implemented in this branch."
        )
