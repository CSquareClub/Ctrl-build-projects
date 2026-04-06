from __future__ import annotations

import hashlib
import math
from typing import Any, Optional

from app.embeddings.contracts import EmbeddingProvider


def _normalize_vector(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(item * item for item in values))
    if norm == 0:
        return values
    return [item / norm for item in values]


class HashingEmbeddingProvider(EmbeddingProvider):
    def __init__(self, vector_dim: int = 256) -> None:
        if vector_dim <= 0:
            raise ValueError("vector_dim must be greater than zero")
        self._vector_dim = vector_dim

    def provider_name(self) -> str:
        return "hashing-local"

    def model_name(self) -> str:
        return "hashing-baseline"

    def embedding_signature(self) -> str:
        return f"{self.provider_name()}::{self.model_name()}::{self.vector_dim()}"

    def vector_dim(self) -> int:
        return self._vector_dim

    def embed_one(self, text: str) -> list[float]:
        normalized_text = (text or "").strip().lower()
        if not normalized_text:
            return [0.0] * self._vector_dim

        vector = [0.0] * self._vector_dim
        tokens = normalized_text.split()
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            token_index = int.from_bytes(digest[:8], byteorder="big") % self._vector_dim
            sign = 1.0 if digest[8] % 2 == 0 else -1.0
            vector[token_index] += sign

        return _normalize_vector(vector)

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_one(text) for text in texts]


class UnimplementedEmbeddingProvider(EmbeddingProvider):
    def provider_name(self) -> str:
        return "unimplemented"

    def model_name(self) -> str:
        return "unimplemented"

    def embedding_signature(self) -> str:
        return "unimplemented::unimplemented::0"

    def vector_dim(self) -> int:
        return 0

    def embed_one(self, text: str) -> list[float]:
        raise NotImplementedError("Embeddings are not implemented in this branch.")

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError("Embeddings are not implemented in this branch.")


class MiniLMEmbeddingProvider(EmbeddingProvider):
    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
    ) -> None:
        self._model_name = model_name
        self._model: Any = None
        self._vector_dim: Optional[int] = None

    def provider_name(self) -> str:
        return "sentence-transformers"

    def model_name(self) -> str:
        return self._model_name

    def embedding_signature(self) -> str:
        return f"{self.provider_name()}::{self.model_name()}::{self.vector_dim()}"

    def _load_model(self) -> Any:
        if self._model is not None:
            return self._model

        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise RuntimeError(
                "sentence-transformers is required for MiniLM embeddings. "
                "Install dependencies from services/api/requirements.txt"
            ) from exc

        self._model = SentenceTransformer(self._model_name)
        self._vector_dim = int(self._model.get_sentence_embedding_dimension())
        return self._model

    def vector_dim(self) -> int:
        if self._vector_dim is not None:
            return self._vector_dim
        model = self._load_model()
        self._vector_dim = int(model.get_sentence_embedding_dimension())
        return self._vector_dim

    def embed_one(self, text: str) -> list[float]:
        normalized_text = (text or "").strip()
        if not normalized_text:
            return [0.0] * self.vector_dim()

        model = self._load_model()
        vector = model.encode(
            [normalized_text],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )[0]
        return [float(value) for value in vector.tolist()]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []

        normalized_texts = [text.strip() if text else "" for text in texts]
        model = self._load_model()
        vectors = model.encode(
            normalized_texts,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return [[float(value) for value in row.tolist()] for row in vectors]
