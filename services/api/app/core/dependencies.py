from functools import lru_cache

from app.core.settings import Settings, get_settings
from app.embeddings.contracts import EmbeddingProvider
from app.embeddings.service import (
    HashingEmbeddingProvider,
    MiniLMEmbeddingProvider,
    UnimplementedEmbeddingProvider,
)
from app.services.analyze import AnalyzeService
from app.services.classification import ClassificationService
from app.services.similar_issues import SimilarIssuesService
from app.vectorindex.contracts import IssueVectorIndexer
from app.vectorindex.service import DefaultIssueVectorIndexer
from app.vectorstore.contracts import VectorStore
from app.vectorstore.service import SqliteVectorStore, UnimplementedVectorStore


def get_app_settings() -> Settings:
    return get_settings()


def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    if settings.embedding_provider == "minilm-local":
        return MiniLMEmbeddingProvider(model_name=settings.embedding_model_name)
    if settings.embedding_provider == "hashing-local":
        return HashingEmbeddingProvider(vector_dim=settings.embedding_vector_dim)
    return UnimplementedEmbeddingProvider()


def get_vector_store() -> VectorStore:
    settings = get_settings()
    if settings.vector_store_provider == "sqlite-local":
        return SqliteVectorStore(db_path=settings.vector_store_path)
    return UnimplementedVectorStore()


def get_issue_vector_indexer() -> IssueVectorIndexer:
    embedding_provider = get_embedding_provider()
    vector_store = get_vector_store()
    return DefaultIssueVectorIndexer(
        embedding_provider=embedding_provider,
        vector_store=vector_store,
    )


@lru_cache(maxsize=1)
def get_similar_issues_service() -> SimilarIssuesService:
    return SimilarIssuesService(
        embedding_provider=get_embedding_provider(),
        vector_store=get_vector_store(),
    )


@lru_cache(maxsize=1)
def get_classification_service() -> ClassificationService:
    return ClassificationService(
        embedding_provider=get_embedding_provider(),
        vector_store=get_vector_store(),
    )


@lru_cache(maxsize=1)
def get_analyze_service() -> AnalyzeService:
    return AnalyzeService(
        classification_service=get_classification_service(),
        similar_issues_service=get_similar_issues_service(),
    )
