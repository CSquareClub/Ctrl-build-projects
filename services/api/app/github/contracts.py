from typing import Protocol

from app.schemas.issue import NormalizedIssue


class IssueIngestionGateway(Protocol):
    def list_issues(self, owner: str, repo: str) -> list[NormalizedIssue]: ...

    def get_issue(
        self, owner: str, repo: str, issue_number: int
    ) -> NormalizedIssue: ...
