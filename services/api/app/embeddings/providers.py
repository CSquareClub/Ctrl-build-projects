from __future__ import annotations

from typing import Sequence

from sentence_transformers import SentenceTransformer

from app.embeddings.contracts import EmbeddingProvider, EmbeddingProviderInfo


class SentenceTransformerEmbeddingProvider(EmbeddingProvider):
    def __init__(
        self,
        model_name: str,
        provider_name: str,
        max_seq_length: int = 256,
    ) -> None:
        self._model_name = model_name
        self._provider_name = provider_name
        self._model = SentenceTransformer(model_name)
        self._model.max_seq_length = max_seq_length
        self._max_seq_length = max_seq_length
        self._normalized = True
        self._vector_dim = self._model.get_sentence_embedding_dimension()
        if self._vector_dim is None:
            raise RuntimeError(
                f"Could not determine embedding dimension for model '{model_name}'."
            )

    def provider_name(self) -> str:
        return self._provider_name

    def model_name(self) -> str:
        return self._model_name

    def vector_dim(self) -> int:
        return self._vector_dim

    def info(self) -> EmbeddingProviderInfo:
        return EmbeddingProviderInfo(
            provider_name=self.provider_name(),
            model_name=self.model_name(),
            vector_dim=self.vector_dim(),
            normalized=self._normalized,
            truncation=f"tokenizer_max_seq_length={self._max_seq_length}",
        )

    def embed_one(self, text: str) -> list[float]:
        vectors = self._encode([text])
        return vectors[0]

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        return self._encode(texts)

    def _encode(self, texts: Sequence[str]) -> list[list[float]]:
        vectors = self._model.encode(
            list(texts),
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return vectors.tolist()


class BgeSmallEmbeddingProvider(SentenceTransformerEmbeddingProvider):
    MODEL_NAME = "BAAI/bge-small-en-v1.5"

    def __init__(self) -> None:
        super().__init__(model_name=self.MODEL_NAME, provider_name="bge-small")


class MiniLmL6EmbeddingProvider(SentenceTransformerEmbeddingProvider):
    MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
    EXPECTED_VECTOR_DIM = 384

    def __init__(self) -> None:
        super().__init__(
            model_name=self.MODEL_NAME,
            provider_name="minilm-l6",
            max_seq_length=256,
        )
        if self.vector_dim() != self.EXPECTED_VECTOR_DIM:
            raise RuntimeError(
                "Unexpected vector dimension for all-MiniLM-L6-v2: "
                f"expected {self.EXPECTED_VECTOR_DIM}, got {self.vector_dim()}."
            )
