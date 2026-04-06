from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone

from app.embeddings.contracts import EmbeddingProvider
from app.github.client import GitHubAPIClient
from app.github.normalization import build_canonical_text, normalize_github_issue
from app.schemas.issue import NormalizedIssue
from app.schemas.issues import NormalizedIssue as GitHubNormalizedIssue
from app.schemas.similar import (
    NormalizedIssueInput,
    SimilarIssueCandidateResponse,
    SimilarIssuesRequest,
    SimilarIssuesResponse,
    SimilarIssueTarget,
)
from app.vectorstore.contracts import VectorStore


@dataclass
class SimilarIssuesService:
    embedding_provider: EmbeddingProvider
    vector_store: VectorStore

    async def find_similar(
        self, request: SimilarIssuesRequest
    ) -> SimilarIssuesResponse:
        client = GitHubAPIClient(token=request.token)
        raw_issues = await client.fetch_repo_issues(
            owner=request.owner,
            repo=request.repo,
            state=request.state,
        )

        normalized_issues: list[NormalizedIssue] = []
        for raw_issue in raw_issues:
            is_pull_request = "pull_request" in raw_issue
            if is_pull_request and not request.include_pull_requests:
                continue
            normalized_issues.append(
                _from_github_normalized(normalize_github_issue(raw_issue))
            )

        repo_key = f"{request.owner}/{request.repo}"
        issue_texts = [issue.canonical_text for issue in normalized_issues]
        issue_vectors = (
            self.embedding_provider.embed_many(issue_texts) if issue_texts else []
        )

        for issue, issue_vector in zip(normalized_issues, issue_vectors):
            issue_id = str(issue.id)
            metadata = {
                "repo": repo_key,
                "number": issue.number,
                "title": issue.title,
                "state": issue.state,
                "html_url": issue.html_url,
                "api_url": issue.metadata.get("url"),
                "labels": issue.labels,
                "canonical_text": issue.canonical_text,
                "comment_count": issue.comment_count,
                "source": "github",
                "created_at": (
                    issue.created_at.isoformat() if issue.created_at else None
                ),
                "updated_at": (
                    issue.updated_at.isoformat() if issue.updated_at else None
                ),
                "author": issue.author,
                "raw_metadata": issue.metadata,
            }
            self.vector_store.upsert(
                issue_id=issue_id, vector=issue_vector, metadata=metadata
            )

        target_issue = self._resolve_target_issue(
            request=request, indexed_issues=normalized_issues
        )
        target_vector = self.embedding_provider.embed_one(target_issue.canonical_text)

        candidates = self.vector_store.query(
            vector=target_vector,
            k=request.k + 1,
            filters={"repo": repo_key},
        )

        target_issue_id = str(target_issue.id)
        candidate_payload: list[SimilarIssueCandidateResponse] = []
        for record in candidates:
            if record.issue_id == target_issue_id:
                continue
            metadata = record.metadata
            candidate_payload.append(
                SimilarIssueCandidateResponse(
                    issue_id=record.issue_id,
                    issue_number=metadata.get("number"),
                    title=metadata.get("title", ""),
                    html_url=metadata.get("html_url"),
                    api_url=metadata.get("api_url"),
                    similarity_score=record.score,
                    state=metadata.get("state"),
                    labels=list(metadata.get("labels", [])),
                    metadata={
                        "source": metadata.get("source", "github"),
                        "comment_count": metadata.get("comment_count", 0),
                        "created_at": metadata.get("created_at"),
                        "updated_at": metadata.get("updated_at"),
                        "author": metadata.get("author"),
                        "raw_metadata": metadata.get("raw_metadata", {}),
                    },
                )
            )

            if len(candidate_payload) >= request.k:
                break

        target = SimilarIssueTarget(
            issue_id=target_issue_id,
            issue_number=(
                target_issue.number
                if (
                    request.issue_number is not None
                    or (
                        request.target_issue is not None
                        and request.target_issue.number is not None
                    )
                )
                else None
            ),
            title=target_issue.title,
            html_url=target_issue.html_url,
            source="github"
            if request.issue_number is not None
            else "normalized_payload",
            metadata={
                "state": target_issue.state,
                "labels": target_issue.labels,
                "comment_count": target_issue.comment_count,
                "author": target_issue.author,
            },
        )

        return SimilarIssuesResponse(
            owner=request.owner,
            repo=request.repo,
            total_indexed=len(normalized_issues),
            k=request.k,
            embedding_provider=self.embedding_provider.provider_name(),
            vector_index=self.vector_store.index_name(),
            embedding_path=(
                "canonical-minilm"
                if "all-MiniLM-L6-v2" in self.embedding_provider.provider_name()
                else "non-canonical-fallback"
            ),
            retrieved_at=datetime.now(timezone.utc),
            target=target,
            candidates=candidate_payload,
        )

    def _resolve_target_issue(
        self,
        request: SimilarIssuesRequest,
        indexed_issues: list[NormalizedIssue],
    ) -> NormalizedIssue:
        if request.issue_number is not None:
            for issue in indexed_issues:
                if issue.number == request.issue_number:
                    return issue
            raise ValueError(
                f"Issue #{request.issue_number} was not found in {request.owner}/{request.repo}."
            )

        if request.target_issue is None:
            raise ValueError("Missing target issue payload.")

        return _build_normalized_issue_from_input(request.target_issue)


def _build_normalized_issue_from_input(target: NormalizedIssueInput) -> NormalizedIssue:
    canonical_text = target.canonical_text or build_canonical_text(
        title=target.title,
        body=target.body,
    )

    canonical_digest = hashlib.sha1(canonical_text.encode("utf-8")).hexdigest()[:12]
    issue_id = target.id or f"payload-{target.number or 0}-{canonical_digest}"

    return NormalizedIssue(
        id=issue_id,
        number=target.number or 0,
        title=target.title,
        body=target.body,
        state=target.state,
        labels=target.labels,
        html_url=target.html_url,
        author=target.author_login,
        comment_count=target.comment_count,
        canonical_text=canonical_text,
        metadata={
            "url": target.url,
            "source": "normalized_payload",
            **target.metadata,
        },
    )


def _from_github_normalized(issue: GitHubNormalizedIssue) -> NormalizedIssue:
    return NormalizedIssue(
        id=str(issue.id),
        number=issue.number,
        title=issue.title,
        body=issue.body,
        state=issue.state,
        labels=issue.labels,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        html_url=issue.html_url,
        author=issue.author.login if issue.author else None,
        comment_count=issue.comment_count,
        canonical_text=issue.canonical_text,
        metadata={
            "url": issue.url,
            **issue.metadata,
        },
    )
