from functools import lru_cache

from app.core.settings import Settings, get_settings
from app.embeddings.contracts import EmbeddingProvider
from app.embeddings.service import HashingEmbeddingProvider, MiniLMEmbeddingProvider
from app.services.similar_issues import SimilarIssuesService
from app.vectorstore.contracts import VectorStore
from app.vectorstore.service import InMemoryVectorStore


def get_app_settings() -> Settings:
    return get_settings()


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    configured_provider = settings.embedding_provider.strip().lower()

    if configured_provider == "minilm":
        return MiniLMEmbeddingProvider(model_name=settings.embedding_model_name)

    if configured_provider == "hashing":
        return HashingEmbeddingProvider()

    raise ValueError(
        "Unsupported OPENISSUE_EMBEDDING_PROVIDER. "
        "Use 'minilm' (canonical) or 'hashing' (explicit non-canonical fallback)."
    )


@lru_cache(maxsize=1)
def get_vector_store() -> VectorStore:
    return InMemoryVectorStore()


@lru_cache(maxsize=1)
def get_similar_issues_service() -> SimilarIssuesService:
    return SimilarIssuesService(
        embedding_provider=get_embedding_provider(),
        vector_store=get_vector_store(),
    )
