from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Protocol

from app.schemas.issues import NormalizedIssue


@dataclass
class IndexedIssue:
    issue_id: str
    issue_number: int
    title: str


@dataclass
class IndexingResult:
    repository: str
    indexed_count: int
    skipped_count: int
    cleared_count: int
    reindex_required: bool
    embedding_signature: str
    items: list[IndexedIssue]


@dataclass
class SimilarityResult:
    issue_id: str
    similarity_score: float
    metadata: dict[str, Any]


class IssueVectorIndexer(Protocol):
    def embedding_provider_name(self) -> str: ...

    def embedding_model_name(self) -> str: ...

    def embedding_signature(self) -> str: ...

    def vector_store_provider_name(self) -> str: ...

    async def index_repo_issues(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        include_pull_requests: bool = False,
        token: Optional[str] = None,
    ) -> IndexingResult: ...

    def query_similar(
        self,
        query_text: str,
        k: int = 5,
        repository: Optional[str] = None,
    ) -> list[SimilarityResult]: ...


class MetadataBuilder(Protocol):
    def build(self, issue: NormalizedIssue, repository: str) -> dict[str, Any]: ...
