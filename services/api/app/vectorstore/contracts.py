from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Protocol


@dataclass
class VectorRecord:
    issue_id: str
    score: float
    metadata: dict[str, Any]


class VectorStore(Protocol):
    def provider_name(self) -> str: ...

    def index_name(self) -> str: ...

    def ensure_schema(self) -> None: ...

    def get_repository_signatures(self, repository: str) -> list[str]: ...

    def clear_repository(self, repository: str) -> int: ...

    def upsert(
        self,
        issue_id: str,
        vector: list[float],
        metadata: dict[str, Any],
        embedding_signature: str,
    ) -> None: ...

    def query(
        self,
        vector: list[float],
        k: int,
        embedding_signature: str,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[VectorRecord]: ...

    def delete(self, issue_id: str) -> None: ...
