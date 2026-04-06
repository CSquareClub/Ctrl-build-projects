from app.github.contracts import IssueIngestionGateway
from app.schemas.issue import NormalizedIssue


class UnimplementedIssueIngestionGateway(IssueIngestionGateway):
    def list_issues(self, owner: str, repo: str) -> list[NormalizedIssue]:
        raise NotImplementedError("GitHub ingestion is not implemented in this branch.")

    def get_issue(self, owner: str, repo: str, issue_number: int) -> NormalizedIssue:
        raise NotImplementedError("GitHub ingestion is not implemented in this branch.")
