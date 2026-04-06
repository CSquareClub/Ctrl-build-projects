from __future__ import annotations

import json
import math
import sqlite3
from pathlib import Path
from typing import Any, Optional

from app.vectorstore.contracts import VectorRecord, VectorStore


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0

    dot_product = 0.0
    norm_a = 0.0
    norm_b = 0.0

    for idx in range(len(a)):
        left = a[idx]
        right = b[idx]
        dot_product += left * right
        norm_a += left * left
        norm_b += right * right

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot_product / (math.sqrt(norm_a) * math.sqrt(norm_b))


class SqliteVectorStore(VectorStore):
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self._ensure_parent_dir()
        self.ensure_schema()

    def provider_name(self) -> str:
        return "sqlite-local"

    def index_name(self) -> str:
        return "sqlite-cosine-v1"

    def _ensure_parent_dir(self) -> None:
        parent = Path(self.db_path).expanduser().resolve().parent
        parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(
            str(Path(self.db_path).expanduser().resolve()),
            timeout=30,
        )
        connection.row_factory = sqlite3.Row
        return connection

    def ensure_schema(self) -> None:
        with self._connect() as connection:
            existing_table = connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table' AND name = 'issue_vectors'
                """
            ).fetchone()

            if existing_table:
                column_rows = connection.execute(
                    "PRAGMA table_info(issue_vectors)"
                ).fetchall()
                column_names = {str(row["name"]) for row in column_rows}
                if "embedding_signature" not in column_names:
                    connection.execute("DROP TABLE issue_vectors")

            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS issue_vectors (
                    issue_id TEXT NOT NULL,
                    embedding_signature TEXT NOT NULL,
                    vector TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (issue_id, embedding_signature)
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_issue_vectors_updated_at
                ON issue_vectors (updated_at)
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_issue_vectors_embedding_signature
                ON issue_vectors (embedding_signature)
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_issue_vectors_repository
                ON issue_vectors (json_extract(metadata, '$.repository'))
                """
            )
            connection.commit()

    def clear_repository(self, repository: str) -> int:
        with self._connect() as connection:
            cursor = connection.execute(
                """
                DELETE FROM issue_vectors
                WHERE json_extract(metadata, '$.repository') = ?
                """,
                (repository,),
            )
            connection.commit()
            return int(cursor.rowcount or 0)

    def get_repository_signatures(self, repository: str) -> list[str]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT DISTINCT embedding_signature
                FROM issue_vectors
                WHERE json_extract(metadata, '$.repository') = ?
                """,
                (repository,),
            ).fetchall()
        return [str(row["embedding_signature"]) for row in rows]

    def upsert(
        self,
        issue_id: str,
        vector: list[float],
        metadata: dict[str, Any],
        embedding_signature: str,
    ) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO issue_vectors (
                    issue_id,
                    embedding_signature,
                    vector,
                    metadata,
                    updated_at
                )
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(issue_id, embedding_signature) DO UPDATE SET
                    vector=excluded.vector,
                    metadata=excluded.metadata,
                    updated_at=CURRENT_TIMESTAMP
                """,
                (
                    issue_id,
                    embedding_signature,
                    json.dumps(vector),
                    json.dumps(metadata),
                ),
            )
            connection.commit()

    def query(
        self,
        vector: list[float],
        k: int,
        embedding_signature: str,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[VectorRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT issue_id, vector, metadata
                FROM issue_vectors
                WHERE embedding_signature = ?
                """,
                (embedding_signature,),
            ).fetchall()

        results: list[VectorRecord] = []
        for row in rows:
            issue_id = str(row["issue_id"])
            stored_vector = json.loads(row["vector"])
            metadata = json.loads(row["metadata"])

            if not isinstance(stored_vector, list):
                continue
            if not all(isinstance(item, (float, int)) for item in stored_vector):
                continue
            if not isinstance(metadata, dict):
                metadata = {}

            if not _metadata_matches_filters(metadata=metadata, filters=filters):
                continue

            score = _cosine_similarity(
                vector,
                [float(value) for value in stored_vector],
            )
            results.append(
                VectorRecord(issue_id=issue_id, score=score, metadata=metadata)
            )

        results.sort(key=lambda item: item.score, reverse=True)
        safe_k = max(k, 0)
        return results[:safe_k]

    def delete(self, issue_id: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "DELETE FROM issue_vectors WHERE issue_id = ?",
                (issue_id,),
            )
            connection.commit()


def _metadata_matches_filters(
    metadata: dict[str, Any],
    filters: Optional[dict[str, Any]],
) -> bool:
    if not filters:
        return True

    for key, expected_value in filters.items():
        if metadata.get(key) != expected_value:
            return False
    return True


class UnimplementedVectorStore(VectorStore):
    def provider_name(self) -> str:
        return "unimplemented"

    def index_name(self) -> str:
        return "unimplemented"

    def ensure_schema(self) -> None:
        raise NotImplementedError("Vector storage is not implemented in this branch.")

    def get_repository_signatures(self, repository: str) -> list[str]:
        raise NotImplementedError("Vector storage is not implemented in this branch.")

    def clear_repository(self, repository: str) -> int:
        raise NotImplementedError("Vector storage is not implemented in this branch.")

    def upsert(
        self,
        issue_id: str,
        vector: list[float],
        metadata: dict[str, Any],
        embedding_signature: str,
    ) -> None:
        raise NotImplementedError("Vector storage is not implemented in this branch.")

    def query(
        self,
        vector: list[float],
        k: int,
        embedding_signature: str,
        filters: Optional[dict[str, Any]] = None,
    ) -> list[VectorRecord]:
        raise NotImplementedError("Vector storage is not implemented in this branch.")

    def delete(self, issue_id: str) -> None:
        raise NotImplementedError("Vector storage is not implemented in this branch.")
