from typing import Any, Optional

from app.vectorstore.contracts import VectorRecord, VectorStore


class UnimplementedVectorStore(VectorStore):
    def upsert(
        self, issue_id: str, vector: list[float], metadata: dict[str, Any]
    ) -> None:
        raise NotImplementedError("Vector storage is not implemented in this branch.")

    def query(
        self,
        vector: list[float],
        k: int,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[VectorRecord]:
        raise NotImplementedError("Vector storage is not implemented in this branch.")

    def delete(self, issue_id: str) -> None:
        raise NotImplementedError("Vector storage is not implemented in this branch.")
