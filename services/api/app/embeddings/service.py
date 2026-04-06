from __future__ import annotations

import hashlib
import math
import re

from app.embeddings.contracts import EmbeddingProvider

TOKEN_PATTERN = re.compile(r"[a-z0-9_./:-]+")


class MiniLMEmbeddingProvider(EmbeddingProvider):
    def __init__(
        self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    ) -> None:
        self._model_name = model_name
        self._model = None
        self._dim = 384

    def provider_name(self) -> str:
        return self._model_name

    def vector_dim(self) -> int:
        self._ensure_model()
        return self._dim

    def embed_one(self, text: str) -> list[float]:
        self._ensure_model()
        embeddings = self._model.encode(
            [text or ""],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return embeddings[0].tolist()

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        self._ensure_model()
        embeddings = self._model.encode(
            [text or "" for text in texts],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return [row.tolist() for row in embeddings]

    def _ensure_model(self) -> None:
        if self._model is not None:
            return

        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise RuntimeError(
                "sentence-transformers is required for MiniLM embeddings. "
                "Install backend dependencies including sentence-transformers."
            ) from exc

        self._model = SentenceTransformer(self._model_name)
        dim = self._model.get_sentence_embedding_dimension()
        if dim is not None:
            self._dim = int(dim)


class HashingEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dim: int = 384) -> None:
        self._dim = dim

    def provider_name(self) -> str:
        return "hashing-v1"

    def vector_dim(self) -> int:
        return self._dim

    def embed_one(self, text: str) -> list[float]:
        tokens = TOKEN_PATTERN.findall((text or "").lower())
        if not tokens:
            return [0.0] * self._dim

        vector = [0.0] * self._dim
        for token in tokens:
            bucket = self._bucket_for(token)
            vector[bucket] += 1.0

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector

        return [value / norm for value in vector]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_one(text) for text in texts]

    def _bucket_for(self, token: str) -> int:
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        return int(digest[:16], 16) % self._dim
