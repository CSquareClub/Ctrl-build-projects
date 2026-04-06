from typing import Any, Optional, Protocol


class VectorRecord(Protocol):
    issue_id: str
    score: float
    metadata: dict[str, Any]


class VectorStore(Protocol):
    def upsert(
        self, issue_id: str, vector: list[float], metadata: dict[str, Any]
    ) -> None: ...

    def query(
        self,
        vector: list[float],
        k: int,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[VectorRecord]: ...

    def delete(self, issue_id: str) -> None: ...
