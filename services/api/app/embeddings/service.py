from functools import lru_cache

from app.core.settings import Settings
from app.embeddings.contracts import EmbeddingProvider
from app.embeddings.providers import (
    BgeSmallEmbeddingProvider,
    MiniLmL6EmbeddingProvider,
)


def build_embedding_provider(settings: Settings) -> EmbeddingProvider:
    return _build_provider_from_key(settings.embeddings_provider)


def build_fallback_embedding_provider(settings: Settings) -> EmbeddingProvider:
    return _build_provider_from_key(settings.embeddings_fallback_provider)


@lru_cache(maxsize=2)
def _build_provider_from_key(provider_key: str) -> EmbeddingProvider:
    if provider_key == "bge-small":
        return BgeSmallEmbeddingProvider()
    if provider_key == "minilm-l6":
        return MiniLmL6EmbeddingProvider()

    raise ValueError(
        "Unsupported embedding provider "
        f"'{provider_key}'. Expected one of: bge-small, minilm-l6."
    )
