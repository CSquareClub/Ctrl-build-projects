from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

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


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "was",
    "were",
    "with",
    "when",
    "while",
    "after",
    "before",
    "during",
    "into",
    "out",
    "this",
    "these",
    "those",
    "can",
    "could",
    "should",
    "would",
    "issue",
    "bug",
    "problem",
}

TOKEN_PATTERN = re.compile(r"[a-z0-9_\-\.]{2,}")
ERROR_TOKEN_PATTERN = re.compile(
    r"\b(?:[A-Za-z]+(?:Error|Exception)|[A-Z]{2,}_[A-Z0-9_]+|HTTP\s*[45]\d\d|E\d{3,5})\b"
)
FILE_TOKEN_PATTERN = re.compile(
    r"\b(?:[A-Za-z0-9_.-]+/[A-Za-z0-9_.\-/]+|[A-Za-z0-9_.-]+\.(?:py|js|ts|tsx|jsx|go|java|rb|rs|cpp|c|cs|php|kt|swift|json|yml|yaml|toml|ini|md))\b"
)
MODULE_TOKEN_PATTERN = re.compile(r"\b[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*){1,4}\b")
VERSION_TOKEN_PATTERN = re.compile(
    r"\bv?\d+\.\d+(?:\.\d+)?(?:[-+._]?(?:rc|beta|alpha)\d*)?\b",
    flags=re.IGNORECASE,
)

# Weighted hybrid scoring: semantic retrieval remains the recall anchor, while
# lexical/metadata overlaps improve precision and explainability for duplicates.
SEMANTIC_WEIGHT = 0.42
TITLE_WEIGHT = 0.20
BODY_KEYWORD_WEIGHT = 0.12
ERROR_WEIGHT = 0.10
FILE_WEIGHT = 0.07
VERSION_WEIGHT = 0.04
LABEL_WEIGHT = 0.05

STATE_BONUS = 0.03
RECENCY_BONUS = 0.015
STALE_MISMATCH_PENALTY = -0.04


@dataclass
class CandidateScoringResult:
    rerank_score: float
    final_score: float
    duplicate_confidence: float
    reasons: list[dict[str, Any]]
    metadata: dict[str, Any]


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
        embedding_signature = self.embedding_provider.embedding_signature()
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
                issue_id=issue_id,
                vector=issue_vector,
                metadata=metadata,
                embedding_signature=embedding_signature,
            )

        target_issue = self._resolve_target_issue(
            request=request, indexed_issues=normalized_issues
        )
        target_vector = self.embedding_provider.embed_one(target_issue.canonical_text)

        candidates = self.vector_store.query(
            vector=target_vector,
            k=min(max(request.k * 4, request.k + 4), 60),
            embedding_signature=embedding_signature,
            filters={"repo": repo_key},
        )

        target_issue_id = str(target_issue.id)
        target_context = _build_issue_context(
            title=target_issue.title,
            body=target_issue.body,
            canonical_text=target_issue.canonical_text,
            labels=target_issue.labels,
            state=target_issue.state,
            updated_at_iso=(
                target_issue.updated_at.isoformat() if target_issue.updated_at else None
            ),
        )
        scored_candidates: list[SimilarIssueCandidateResponse] = []

        for semantic_rank, record in enumerate(candidates, start=1):
            if record.issue_id == target_issue_id:
                continue

            metadata = record.metadata
            candidate_context = _build_issue_context(
                title=str(metadata.get("title") or ""),
                body=None,
                canonical_text=str(metadata.get("canonical_text") or ""),
                labels=list(metadata.get("labels", [])),
                state=str(metadata.get("state") or ""),
                updated_at_iso=metadata.get("updated_at"),
            )
            scoring = _score_candidate(
                target=target_context,
                candidate=candidate_context,
                semantic_score=record.score,
            )

            candidate_metadata = {
                "source": metadata.get("source", "github"),
                "comment_count": metadata.get("comment_count", 0),
                "created_at": metadata.get("created_at"),
                "updated_at": metadata.get("updated_at"),
                "author": metadata.get("author"),
                "raw_metadata": metadata.get("raw_metadata", {}),
                "raw_similarity_score": record.score,
                "semantic_rank": semantic_rank,
                **scoring.metadata,
            }

            scored_candidates.append(
                SimilarIssueCandidateResponse(
                    issue_id=record.issue_id,
                    issue_number=metadata.get("number"),
                    title=metadata.get("title", ""),
                    html_url=metadata.get("html_url"),
                    api_url=metadata.get("api_url"),
                    similarity_score=record.score,
                    rerank_score=scoring.rerank_score,
                    final_score=scoring.final_score,
                    duplicate_confidence=scoring.duplicate_confidence,
                    state=metadata.get("state"),
                    labels=list(metadata.get("labels", [])),
                    reasons=scoring.reasons,
                    metadata=candidate_metadata,
                )
            )

        scored_candidates.sort(
            key=lambda item: (item.final_score, item.similarity_score),
            reverse=True,
        )
        candidate_payload = scored_candidates[: request.k]
        for final_rank, candidate in enumerate(candidate_payload, start=1):
            candidate.metadata["final_rank"] = final_rank

        duplicate_confidence = (
            max(item.duplicate_confidence for item in candidate_payload)
            if candidate_payload
            else 0.0
        )

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
                if self.embedding_provider.model_name()
                == "sentence-transformers/all-MiniLM-L6-v2"
                else "non-canonical-fallback"
            ),
            retrieved_at=datetime.now(timezone.utc),
            target=target,
            duplicate_confidence=duplicate_confidence,
            calibration_notes=[
                "Duplicate confidence is calibrated from MiniLM cosine retrieval plus heuristic reranking; score ranges can shift by repository domain.",
                "No fixed duplicate threshold is enforced yet; maintainers should interpret confidence with the listed similarity reasons.",
            ],
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


def _build_issue_context(
    title: str,
    body: str | None,
    canonical_text: str,
    labels: list[str],
    state: str,
    updated_at_iso: Any,
) -> dict[str, Any]:
    title_text = title or ""
    body_text = body or _extract_body_from_canonical(canonical_text)
    full_text = canonical_text or build_canonical_text(title=title_text, body=body_text)

    return {
        "title": title_text,
        "body": body_text,
        "canonical_text": full_text,
        "title_tokens": _tokenize(title_text, remove_stopwords=True),
        "body_keywords": _tokenize(body_text, remove_stopwords=True),
        "error_tokens": _extract_tokens(full_text, ERROR_TOKEN_PATTERN),
        "file_tokens": _extract_file_and_module_tokens(full_text),
        "version_tokens": _extract_tokens(full_text, VERSION_TOKEN_PATTERN),
        "labels": {
            str(label).strip().lower() for label in labels if str(label).strip()
        },
        "state": (state or "").strip().lower(),
        "updated_at": _parse_iso_datetime(updated_at_iso),
    }


def _score_candidate(
    target: dict[str, Any],
    candidate: dict[str, Any],
    semantic_score: float,
) -> CandidateScoringResult:
    semantic_norm = _normalize_cosine_score(semantic_score)
    title_overlap = _overlap_ratio(target["title_tokens"], candidate["title_tokens"])
    body_overlap = _overlap_ratio(
        target["body_keywords"],
        candidate["body_keywords"],
    )
    error_overlap = _overlap_ratio(target["error_tokens"], candidate["error_tokens"])
    file_overlap = _overlap_ratio(target["file_tokens"], candidate["file_tokens"])
    version_overlap = _overlap_ratio(
        target["version_tokens"],
        candidate["version_tokens"],
    )
    label_overlap = _overlap_ratio(target["labels"], candidate["labels"])

    weighted_components = {
        "semantic_similarity": semantic_norm * SEMANTIC_WEIGHT,
        "title_overlap": title_overlap * TITLE_WEIGHT,
        "body_keyword_overlap": body_overlap * BODY_KEYWORD_WEIGHT,
        "error_token_overlap": error_overlap * ERROR_WEIGHT,
        "file_or_module_overlap": file_overlap * FILE_WEIGHT,
        "version_overlap": version_overlap * VERSION_WEIGHT,
        "label_overlap": label_overlap * LABEL_WEIGHT,
    }
    rerank_score = _clamp(sum(weighted_components.values()))

    lexical_support = max(title_overlap, body_overlap, error_overlap, file_overlap)
    recency_adjustment = _compute_recency_adjustment(target, candidate)
    state_adjustment = _compute_state_adjustment(target, candidate, lexical_support)
    adjustment_total = recency_adjustment + state_adjustment
    final_score = _clamp(rerank_score + adjustment_total)

    confidence = _clamp(final_score * 0.7 + min(semantic_norm, lexical_support) * 0.3)

    reasons = _build_reasons(
        semantic_norm=semantic_norm,
        title_overlap=title_overlap,
        body_overlap=body_overlap,
        error_overlap=error_overlap,
        file_overlap=file_overlap,
        version_overlap=version_overlap,
        label_overlap=label_overlap,
        state_adjustment=state_adjustment,
        recency_adjustment=recency_adjustment,
    )

    metadata = {
        "scoring_components": {
            key: round(value, 4) for key, value in weighted_components.items()
        },
        "score_adjustments": {
            "state_adjustment": round(state_adjustment, 4),
            "recency_adjustment": round(recency_adjustment, 4),
            "total_adjustment": round(adjustment_total, 4),
        },
    }
    return CandidateScoringResult(
        rerank_score=round(rerank_score, 4),
        final_score=round(final_score, 4),
        duplicate_confidence=round(confidence, 4),
        reasons=reasons,
        metadata=metadata,
    )


def _build_reasons(
    semantic_norm: float,
    title_overlap: float,
    body_overlap: float,
    error_overlap: float,
    file_overlap: float,
    version_overlap: float,
    label_overlap: float,
    state_adjustment: float,
    recency_adjustment: float,
) -> list[dict[str, Any]]:
    reasons: list[dict[str, Any]] = [
        {
            "signal": "semantic_similarity",
            "strength": round(semantic_norm, 4),
            "detail": "MiniLM cosine similarity from vector retrieval.",
        }
    ]

    if title_overlap > 0:
        reasons.append(
            {
                "signal": "title_overlap",
                "strength": round(title_overlap, 4),
                "detail": "Title tokens overlap between target and candidate.",
            }
        )
    if body_overlap > 0:
        reasons.append(
            {
                "signal": "body_keyword_overlap",
                "strength": round(body_overlap, 4),
                "detail": "Body keywords intersect after stopword filtering.",
            }
        )
    if error_overlap > 0:
        reasons.append(
            {
                "signal": "error_token_overlap",
                "strength": round(error_overlap, 4),
                "detail": "Shared exception/error tokens found in issue text.",
            }
        )
    if file_overlap > 0:
        reasons.append(
            {
                "signal": "file_or_module_overlap",
                "strength": round(file_overlap, 4),
                "detail": "Common file paths or module names were detected.",
            }
        )
    if version_overlap > 0:
        reasons.append(
            {
                "signal": "version_overlap",
                "strength": round(version_overlap, 4),
                "detail": "Same version markers appear in both issues.",
            }
        )
    if label_overlap > 0:
        reasons.append(
            {
                "signal": "label_overlap",
                "strength": round(label_overlap, 4),
                "detail": "Label sets overlap across target and candidate.",
            }
        )

    if state_adjustment != 0:
        reasons.append(
            {
                "signal": "state_adjustment",
                "strength": round(state_adjustment, 4),
                "detail": "Issue state alignment adjusted confidence.",
            }
        )
    if recency_adjustment != 0:
        reasons.append(
            {
                "signal": "recency_adjustment",
                "strength": round(recency_adjustment, 4),
                "detail": "Recent updates slightly boosted likely active duplicates.",
            }
        )

    return reasons


def _compute_state_adjustment(
    target: dict[str, Any],
    candidate: dict[str, Any],
    lexical_support: float,
) -> float:
    target_state = target["state"]
    candidate_state = candidate["state"]

    if target_state == "open" and candidate_state == "open":
        return STATE_BONUS

    target_recent = _is_recent(target["updated_at"], days=120)
    candidate_recent = _is_recent(candidate["updated_at"], days=120)
    if (target_state != candidate_state) and (
        not target_recent or not candidate_recent
    ):
        if lexical_support < 0.35:
            return STALE_MISMATCH_PENALTY

    return 0.0


def _compute_recency_adjustment(
    target: dict[str, Any],
    candidate: dict[str, Any],
) -> float:
    if _is_recent(target["updated_at"], days=180) and _is_recent(
        candidate["updated_at"], days=180
    ):
        return RECENCY_BONUS
    return 0.0


def _is_recent(value: datetime | None, days: int) -> bool:
    if value is None:
        return False
    now = datetime.now(timezone.utc)
    comparable = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return (now - comparable).days <= days


def _normalize_cosine_score(score: float) -> float:
    return _clamp((score + 1.0) / 2.0)


def _extract_body_from_canonical(canonical_text: str) -> str:
    if not canonical_text:
        return ""
    parts = canonical_text.split("\n\n", 1)
    if len(parts) == 2:
        return parts[1]
    return ""


def _tokenize(text: str, remove_stopwords: bool) -> set[str]:
    if not text:
        return set()

    tokens = {
        token
        for token in TOKEN_PATTERN.findall(text.lower())
        if len(token) >= 3 and (not remove_stopwords or token not in STOPWORDS)
    }
    return tokens


def _extract_tokens(text: str, pattern: re.Pattern[str]) -> set[str]:
    if not text:
        return set()
    return {match.lower() for match in pattern.findall(text)}


def _extract_file_and_module_tokens(text: str) -> set[str]:
    if not text:
        return set()
    file_tokens = {match.lower() for match in FILE_TOKEN_PATTERN.findall(text)}
    module_tokens = {match.lower() for match in MODULE_TOKEN_PATTERN.findall(text)}
    return file_tokens.union(module_tokens)


def _overlap_ratio(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0

    intersection = left.intersection(right)
    if not intersection:
        return 0.0

    return len(intersection) / float(min(len(left), len(right)))


def _parse_iso_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None

    normalized = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))
