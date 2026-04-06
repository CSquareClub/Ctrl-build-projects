"""Embedding provider interfaces and implementations."""

from app.embeddings.contracts import EmbeddingProvider, EmbeddingProviderInfo
from app.embeddings.providers import (
    BgeSmallEmbeddingProvider,
    MiniLmL6EmbeddingProvider,
    SentenceTransformerEmbeddingProvider,
)
from app.embeddings.service import (
    build_embedding_provider,
    build_fallback_embedding_provider,
)

__all__ = [
    "EmbeddingProvider",
    "EmbeddingProviderInfo",
    "SentenceTransformerEmbeddingProvider",
    "BgeSmallEmbeddingProvider",
    "MiniLmL6EmbeddingProvider",
    "build_embedding_provider",
    "build_fallback_embedding_provider",
]
