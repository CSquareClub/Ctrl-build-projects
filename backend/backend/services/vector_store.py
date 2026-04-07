"""
Vector store abstraction — uses Qdrant Cloud when configured,
falls back to an in-memory FAISS index for local dev.
"""
import os
from typing import Optional

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
COLLECTION_NAME = "issue_embeddings"
VECTOR_SIZE = 384  # all-MiniLM-L6-v2 output size

# In-memory fallback structures
_faiss_index = None
_faiss_ids: list[str] = []
_faiss_payloads: list[dict] = []


def _get_qdrant():
    from qdrant_client import QdrantClient
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def _ensure_faiss():
    global _faiss_index
    if _faiss_index is None:
        import faiss
        _faiss_index = faiss.IndexFlatIP(VECTOR_SIZE)  # inner-product (cosine after normalisation)
    return _faiss_index


async def upsert(point_id: str, vector: list[float], payload: dict) -> None:
    """Store an embedding (Qdrant preferred, FAISS fallback)."""
    if QDRANT_URL:
        from qdrant_client.models import PointStruct
        client = _get_qdrant()
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )
    else:
        import faiss
        import numpy as np
        index = _ensure_faiss()
        v = np.array([vector], dtype="float32")
        faiss.normalize_L2(v)
        index.add(v)
        _faiss_ids.append(point_id)
        _faiss_payloads.append(payload)


async def find_similar(vector: list[float], threshold: float = 0.85, top_k: int = 3) -> list[dict]:
    """Return similar issues above the cosine similarity threshold."""
    if QDRANT_URL:
        from qdrant_client.models import ScoredPoint
        client = _get_qdrant()
        results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=vector,
            limit=top_k,
            score_threshold=threshold,
        )
        return [
            {
                "title": r.payload.get("title", ""),
                "repo": r.payload.get("repo", ""),
                "similarity": round(r.score * 100),
                "url": r.payload.get("url", ""),
            }
            for r in results
        ]
    else:
        if not _faiss_ids:
            return []
        import numpy as np
        import faiss as faiss_lib
        index = _ensure_faiss()
        v = np.array([vector], dtype="float32")
        faiss_lib.normalize_L2(v)
        scores, indices = index.search(v, min(top_k, len(_faiss_ids)))
        similar = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1 or score < threshold:
                continue
            payload = _faiss_payloads[idx]
            similar.append({
                "title": payload.get("title", ""),
                "repo": payload.get("repo_id", ""),
                "similarity": round(float(score) * 100),
                "url": "",
            })
        return similar


async def ensure_collection() -> None:
    """Create the Qdrant collection if it doesn't exist."""
    if not QDRANT_URL:
        return
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams
    client = _get_qdrant()
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
