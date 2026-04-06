from __future__ import annotations

from typing import Any, Optional

from app.embeddings.contracts import EmbeddingProvider
from app.github.client import GitHubAPIClient
from app.github.normalization import normalize_github_issue
from app.schemas.issues import NormalizedIssue
from app.vectorindex.contracts import (
    IndexedIssue,
    IndexingResult,
    IssueVectorIndexer,
    MetadataBuilder,
    SimilarityResult,
)
from app.vectorstore.contracts import VectorStore


class DefaultIssueMetadataBuilder(MetadataBuilder):
    def build(self, issue: NormalizedIssue, repository: str) -> dict[str, Any]:
        return {
            "issue_id": str(issue.id),
            "issue_number": issue.number,
            "title": issue.title,
            "state": issue.state,
            "labels": list(issue.labels),
            "author_login": issue.author.login if issue.author else None,
            "created_at": issue.created_at.isoformat() if issue.created_at else None,
            "updated_at": issue.updated_at.isoformat() if issue.updated_at else None,
            "comment_count": issue.comment_count,
            "html_url": issue.html_url,
            "repository": repository,
            "canonical_text": issue.canonical_text,
        }


class DefaultIssueVectorIndexer(IssueVectorIndexer):
    def __init__(
        self,
        embedding_provider: EmbeddingProvider,
        vector_store: VectorStore,
        metadata_builder: Optional[MetadataBuilder] = None,
    ) -> None:
        self.embedding_provider = embedding_provider
        self.vector_store = vector_store
        self.metadata_builder = metadata_builder or DefaultIssueMetadataBuilder()

    def embedding_provider_name(self) -> str:
        return self.embedding_provider.provider_name()

    def embedding_model_name(self) -> str:
        return self.embedding_provider.model_name()

    def embedding_signature(self) -> str:
        return self.embedding_provider.embedding_signature()

    def vector_store_provider_name(self) -> str:
        return self.vector_store.provider_name()

    async def index_repo_issues(
        self,
        owner: str,
        repo: str,
        state: str = "all",
        include_pull_requests: bool = False,
        token: Optional[str] = None,
    ) -> IndexingResult:
        repository = f"{owner}/{repo}"
        client = GitHubAPIClient(token=token)
        embedding_signature = self.embedding_signature()

        existing_signatures = self.vector_store.get_repository_signatures(repository)
        reindex_required = any(
            sig != embedding_signature for sig in existing_signatures
        )
        cleared_count = 0

        if reindex_required:
            cleared_count = self.vector_store.clear_repository(repository)

        raw_issues = await client.fetch_repo_issues(owner=owner, repo=repo, state=state)

        indexed_items: list[IndexedIssue] = []
        skipped_count = 0

        for raw_issue in raw_issues:
            is_pull_request = "pull_request" in raw_issue
            if is_pull_request and not include_pull_requests:
                skipped_count += 1
                continue

            normalized_issue = normalize_github_issue(raw_issue)
            canonical_text = normalized_issue.canonical_text.strip()

            if not canonical_text:
                skipped_count += 1
                continue

            issue_id = str(normalized_issue.id)
            vector = self.embedding_provider.embed_one(canonical_text)
            metadata = self.metadata_builder.build(
                normalized_issue, repository=repository
            )
            metadata["embedding_provider"] = self.embedding_provider_name()
            metadata["embedding_model"] = self.embedding_model_name()
            metadata["embedding_signature"] = embedding_signature

            self.vector_store.upsert(
                issue_id=issue_id,
                vector=vector,
                metadata=metadata,
                embedding_signature=embedding_signature,
            )

            indexed_items.append(
                IndexedIssue(
                    issue_id=issue_id,
                    issue_number=normalized_issue.number,
                    title=normalized_issue.title,
                )
            )

        return IndexingResult(
            repository=repository,
            indexed_count=len(indexed_items),
            skipped_count=skipped_count,
            cleared_count=cleared_count,
            reindex_required=reindex_required,
            embedding_signature=embedding_signature,
            items=indexed_items,
        )

    def query_similar(
        self,
        query_text: str,
        k: int = 5,
        repository: Optional[str] = None,
    ) -> list[SimilarityResult]:
        normalized_query = query_text.strip()
        if not normalized_query:
            return []

        filters: Optional[dict[str, Any]] = None
        if repository:
            filters = {"repository": repository}

        query_vector = self.embedding_provider.embed_one(normalized_query)
        records = self.vector_store.query(
            vector=query_vector,
            k=k,
            embedding_signature=self.embedding_signature(),
            filters=filters,
        )
        return [
            SimilarityResult(
                issue_id=record.issue_id,
                similarity_score=record.score,
                metadata=record.metadata,
            )
            for record in records
        ]
