from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.dependencies import get_issue_vector_indexer
from app.schemas.vector import (
    IndexRepoIssuesRequest,
    IndexRepoIssuesResponse,
    IndexedIssueResult,
    SimilarityCandidate,
    SimilarityQueryRequest,
    SimilarityQueryResponse,
)
from app.vectorindex.contracts import IssueVectorIndexer

router = APIRouter(prefix="/vectors", tags=["vectors"])


@router.post("/index", response_model=IndexRepoIssuesResponse)
async def index_repo_issues(
    request: IndexRepoIssuesRequest,
    indexer: IssueVectorIndexer = Depends(get_issue_vector_indexer),
) -> IndexRepoIssuesResponse:
    result = await indexer.index_repo_issues(
        owner=request.owner,
        repo=request.repo,
        state=request.state,
        include_pull_requests=request.include_pull_requests,
        token=request.token,
    )

    return IndexRepoIssuesResponse(
        repository=result.repository,
        indexed_count=result.indexed_count,
        skipped_count=result.skipped_count,
        cleared_count=result.cleared_count,
        reindex_required=result.reindex_required,
        embedding_signature=result.embedding_signature,
        embedding_provider=indexer.embedding_provider_name(),
        embedding_model=indexer.embedding_model_name(),
        vector_store_provider=indexer.vector_store_provider_name(),
        items=[
            IndexedIssueResult(
                issue_id=item.issue_id,
                issue_number=item.issue_number,
                title=item.title,
            )
            for item in result.items
        ],
    )


@router.post("/query", response_model=SimilarityQueryResponse)
def query_similar_issues(
    request: SimilarityQueryRequest,
    indexer: IssueVectorIndexer = Depends(get_issue_vector_indexer),
) -> SimilarityQueryResponse:
    repository = None
    if request.owner and request.repo:
        repository = f"{request.owner}/{request.repo}"

    candidates = indexer.query_similar(
        query_text=request.query_text,
        k=request.k,
        repository=repository,
    )

    return SimilarityQueryResponse(
        query_text=request.query_text,
        k=request.k,
        embedding_provider=indexer.embedding_provider_name(),
        embedding_model=indexer.embedding_model_name(),
        embedding_signature=indexer.embedding_signature(),
        vector_store_provider=indexer.vector_store_provider_name(),
        candidates=[
            SimilarityCandidate(
                issue_id=item.issue_id,
                similarity_score=item.similarity_score,
                metadata=item.metadata,
            )
            for item in candidates
        ],
    )
