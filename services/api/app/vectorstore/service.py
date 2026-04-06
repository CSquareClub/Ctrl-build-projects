from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from app.vectorstore.contracts import VectorRecord, VectorStore


@dataclass
class InMemoryVectorRecord(VectorRecord):
    issue_id: str
    score: float
    metadata: dict[str, Any]


class InMemoryVectorStore(VectorStore):
    def __init__(self) -> None:
        self._records: dict[str, tuple[list[float], dict[str, Any]]] = {}

    def index_name(self) -> str:
        return "inmemory-cosine-v1"

    def upsert(
        self, issue_id: str, vector: list[float], metadata: dict[str, Any]
    ) -> None:
        self._records[issue_id] = (vector, metadata)

    def query(
        self,
        vector: list[float],
        k: int,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[VectorRecord]:
        matches: list[InMemoryVectorRecord] = []

        for issue_id, (candidate_vector, metadata) in self._records.items():
            if not _metadata_matches(metadata=metadata, filters=filters):
                continue

            score = _cosine_similarity(vector, candidate_vector)
            matches.append(
                InMemoryVectorRecord(
                    issue_id=issue_id,
                    score=score,
                    metadata=metadata,
                )
            )

        matches.sort(key=lambda item: item.score, reverse=True)
        return matches[: max(0, k)]

    def delete(self, issue_id: str) -> None:
        self._records.pop(issue_id, None)


def _metadata_matches(
    metadata: dict[str, Any], filters: Optional[dict[str, Any]]
) -> bool:
    if not filters:
        return True

    for key, expected in filters.items():
        if metadata.get(key) != expected:
            return False
    return True


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    dot = sum(a * b for a, b in zip(left, right))
    left_norm_sq = sum(a * a for a in left)
    right_norm_sq = sum(b * b for b in right)

    if left_norm_sq == 0.0 or right_norm_sq == 0.0:
        return 0.0

    return dot / ((left_norm_sq**0.5) * (right_norm_sq**0.5))
