import json
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

try:
    import faiss  # type: ignore
except ImportError:  # pragma: no cover - fallback path for environments without faiss
    faiss = None  # type: ignore


class _InMemoryIndex:
    def __init__(self, embedding_dim: int):
        self.embedding_dim = embedding_dim
        self.vectors = np.empty((0, embedding_dim), dtype=np.float32)

    @property
    def ntotal(self) -> int:
        return int(self.vectors.shape[0])

    def add(self, vectors: np.ndarray) -> None:
        self.vectors = np.vstack([self.vectors, vectors])

    def search(self, query: np.ndarray, k: int) -> Tuple[np.ndarray, np.ndarray]:
        if self.ntotal == 0:
            return np.zeros((1, 0), dtype=np.float32), np.zeros((1, 0), dtype=np.int64)

        similarities = np.dot(self.vectors, query[0])
        top_k = min(k, self.ntotal)
        sorted_indices = np.argsort(similarities)[::-1][:top_k]

        distances = similarities[sorted_indices].astype(np.float32).reshape(1, -1)
        indices = sorted_indices.astype(np.int64).reshape(1, -1)
        return distances, indices


class VectorService:
    def __init__(self, index_path: str, embedding_service: Optional[Any] = None):
        self.index_path = Path(index_path)
        self.ids_path = Path(f"{index_path}.ids.json")
        self.embedding_service = embedding_service
        self.embedding_dim = 384
        if self.embedding_service is not None:
            dynamic_dim = self.embedding_service.get_embedding_dimension()
            if dynamic_dim:
                self.embedding_dim = dynamic_dim

        self.index: Optional[Any] = None
        self.issue_ids: List[str] = []
        self._lock = threading.RLock()
        self.load_or_create_index()

    def _normalize(self, vectors: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return vectors / norms

    def _load_ids(self) -> None:
        if not self.ids_path.exists():
            self.issue_ids = []
            return

        try:
            raw = self.ids_path.read_text(encoding="utf-8")
            data = json.loads(raw) if raw.strip() else []
            self.issue_ids = [str(item) for item in data] if isinstance(data, list) else []
        except (OSError, json.JSONDecodeError):
            self.issue_ids = []

    def _save_ids(self) -> None:
        self.ids_path.parent.mkdir(parents=True, exist_ok=True)
        self.ids_path.write_text(
            json.dumps(self.issue_ids, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    def _validate_sync(self) -> bool:
        """Check if index vector count matches issue_ids list."""
        if self.index and self.index.ntotal != len(self.issue_ids):
            print(
                f"Warning: Sync mismatch - {self.index.ntotal} vectors vs {len(self.issue_ids)} IDs"
            )
            return False
        return True

    def _heal_sync(self) -> None:
        """Trim to smallest size to recover from mismatch."""
        if not self.index or self.index.ntotal == len(self.issue_ids):
            return

        min_size = min(self.index.ntotal, len(self.issue_ids))
        self.issue_ids = self.issue_ids[:min_size]

        if isinstance(self.index, _InMemoryIndex):
            self.index.vectors = self.index.vectors[:min_size]
            return

        if faiss is not None and hasattr(self.index, "reconstruct_n"):
            try:
                if min_size == 0:
                    self.index = faiss.IndexFlatIP(self.embedding_dim)
                    return

                vectors = self.index.reconstruct_n(0, min_size)
                rebuilt_index = faiss.IndexFlatIP(self.embedding_dim)
                rebuilt_index.add(vectors.astype(np.float32))
                self.index = rebuilt_index
            except Exception:
                pass

    def load_or_create_index(self) -> bool:
        with self._lock:
            if self.index_path.exists() and faiss is not None:
                try:
                    self.index = faiss.read_index(str(self.index_path))
                    self.embedding_dim = int(self.index.d)
                except Exception:
                    self.index = None

            if self.index is None:
                if faiss is not None:
                    self.index = faiss.IndexFlatIP(self.embedding_dim)
                else:
                    self.index = _InMemoryIndex(self.embedding_dim)

                npy_path = Path(f"{self.index_path}.npy")
                if npy_path.exists() and isinstance(self.index, _InMemoryIndex):
                    try:
                        vectors = np.load(npy_path).astype(np.float32)
                        if vectors.ndim == 2 and vectors.shape[1] == self.embedding_dim:
                            self.index.add(vectors)
                    except Exception:
                        pass

            self._load_ids()
            if not self._validate_sync():
                self._heal_sync()
            return True

    def save_index(self) -> bool:
        with self._lock:
            self.index_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                if faiss is not None and self.index is not None and not isinstance(self.index, _InMemoryIndex):
                    faiss.write_index(self.index, str(self.index_path))
                elif isinstance(self.index, _InMemoryIndex):
                    np.save(Path(f"{self.index_path}.npy"), self.index.vectors)

                self._save_ids()
                return True
            except Exception:
                return False

    def add_vectors(self, embeddings: List[List[float]], issue_ids: List[str]) -> bool:
        with self._lock:
            if not self._validate_sync():
                self._heal_sync()

            if not embeddings or not issue_ids:
                return True
            if len(embeddings) != len(issue_ids):
                raise ValueError("embeddings and issue_ids must have same length")
            if len(embeddings[0]) != self.embedding_dim:
                raise ValueError(
                    f"Embedding dimension mismatch. Expected {self.embedding_dim}, got {len(embeddings[0])}"
                )

            vectors = np.array(embeddings, dtype=np.float32)
            if vectors.ndim != 2:
                raise ValueError("embeddings must be a 2D list")

            vectors = self._normalize(vectors)
            self.index.add(vectors)
            self.issue_ids.extend(issue_ids)
            return self.save_index()

    def search(self, query_embedding: List[float], k: int = 5) -> List[Tuple[str, float]]:
        with self._lock:
            if not self._validate_sync():
                self._heal_sync()

            if not self.index or not self.issue_ids:
                return []
            if len(query_embedding) != self.embedding_dim:
                raise ValueError(
                    f"Query embedding dimension mismatch. Expected {self.embedding_dim}, got {len(query_embedding)}"
                )

            query = np.array([query_embedding], dtype=np.float32)
            query = self._normalize(query)

            distances, indices = self.index.search(query, k)
            results: List[Tuple[str, float]] = []

            for idx, distance in zip(indices[0], distances[0]):
                if 0 <= idx < len(self.issue_ids):
                    results.append((self.issue_ids[int(idx)], float(distance)))

            return results


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity for two vectors."""
    if np.linalg.norm(vec1) == 0 or np.linalg.norm(vec2) == 0:
        return 0.0
    return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))


def find_similar_issues(
    embedding: np.ndarray,
    issues_db: List[Dict[str, Any]],
    top_k: int = 3,
    threshold: float = 0.5,
) -> List[Dict[str, Any]]:
    """Find most similar issues from an in-memory issue list."""
    similar_issues = []

    for db_issue in issues_db:
        if "embedding" not in db_issue or db_issue["embedding"] is None:
            continue

        issue_emb = np.array(db_issue["embedding"])  # list to ndarray
        sim_score = cosine_similarity(embedding, issue_emb)

        if sim_score >= threshold:
            similar_issues.append(
                {
                    "id": db_issue.get("id"),
                    "title": db_issue.get("title"),
                    "similarity": float(sim_score),
                }
            )

    similar_issues.sort(key=lambda item: item["similarity"], reverse=True)
    return similar_issues[:top_k]
