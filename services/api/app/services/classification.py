from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import datetime, timezone

from app.embeddings.contracts import EmbeddingProvider
from app.github.client import GitHubAPIClient
from app.github.normalization import build_canonical_text, normalize_github_issue
from app.schemas.classification import (
    ClassificationTarget,
    IssueClassificationRequest,
    IssueClassificationResponse,
    IssueType,
    SimilarIssueEvidence,
)
from app.schemas.issue import NormalizedIssue
from app.schemas.issues import NormalizedIssue as GitHubNormalizedIssue
from app.schemas.similar import NormalizedIssueInput
from app.vectorstore.contracts import VectorStore

_HIGH_SIGNAL_PATTERNS: dict[str, tuple[re.Pattern[str], float]] = {
    "spam_phrase": (
        re.compile(r"\b(buy now|cheap followers|click here|promo code)\b"),
        4.0,
    ),
    "security_phrase": (re.compile(r"\b(vulnerability|xss|sql injection|rce)\b"), 1.4),
    "bug_phrase": (
        re.compile(
            r"\b(bug|crash|exception|traceback|fails?|regression|broken|error)\b"
        ),
        1.2,
    ),
    "repro_phrase": (
        re.compile(r"\b(steps to reproduce|repro|expected behavior|actual behavior)\b"),
        0.9,
    ),
    "feature_phrase": (
        re.compile(
            r"\b(feature request|would like|i want|it would be great|enhancement|proposal)\b"
        ),
        1.2,
    ),
    "documentation_phrase": (
        re.compile(r"\b(docs?|documentation|readme|typo|examples?)\b"),
        1.6,
    ),
    "question_phrase": (
        re.compile(r"\b(how do i|how to|question|help|is there a way|can i)\b"),
        1.4,
    ),
}

_LABEL_ALLOWLIST: set[str] = {
    "bug",
    "enhancement",
    "feature",
    "documentation",
    "question",
    "support",
    "needs-repro",
    "needs-info",
    "invalid",
    "spam",
    "triage",
}


@dataclass
class ClassificationService:
    embedding_provider: EmbeddingProvider
    vector_store: VectorStore

    async def classify(
        self, request: IssueClassificationRequest
    ) -> IssueClassificationResponse:
        normalized_issues: list[NormalizedIssue] = []
        if request.issue_number is not None:
            client = GitHubAPIClient(token=request.token)
            raw_issues = await client.fetch_repo_issues(
                owner=request.owner,
                repo=request.repo,
                state=request.state,
            )

            for raw_issue in raw_issues:
                is_pull_request = "pull_request" in raw_issue
                if is_pull_request and not request.include_pull_requests:
                    continue
                normalized_issues.append(
                    _from_github_normalized(normalize_github_issue(raw_issue))
                )

        target_issue = self._resolve_target_issue(
            request=request,
            indexed_issues=normalized_issues,
        )

        lexical_scores, lexical_reasons = _score_from_text(target_issue)
        confidence = _confidence_from_scores(lexical_scores)

        repo_key = f"{request.owner}/{request.repo}"
        similar_evidence, neighbor_note = self._neighbor_evidence(
            issue=target_issue,
            repo_key=repo_key,
            k=request.k,
        )

        label_votes, label_vote_reasons = _derive_label_votes_from_neighbors(
            similar_evidence
        )
        predicted_type = _select_issue_type(lexical_scores)
        suggested_labels, label_reasons = _build_label_suggestions(
            issue=target_issue,
            predicted_type=predicted_type,
            lexical_scores=lexical_scores,
            neighbor_label_votes=label_votes,
        )

        all_type_reasons = lexical_reasons
        if label_vote_reasons:
            all_type_reasons = all_type_reasons + label_vote_reasons[:2]

        return IssueClassificationResponse(
            owner=request.owner,
            repo=request.repo,
            analyzed_at=datetime.now(timezone.utc),
            predicted_type=predicted_type,
            type_confidence=confidence,
            suggested_labels=suggested_labels,
            type_reasons=all_type_reasons[:5],
            label_reasons=label_reasons[:5],
            neighbor_evidence_used=bool(similar_evidence),
            neighbor_evidence_note=neighbor_note,
            target=ClassificationTarget(
                issue_id=str(target_issue.id),
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
                source="github"
                if request.issue_number is not None
                else "normalized_payload",
            ),
            similar_issue_evidence=similar_evidence,
        )

    def _resolve_target_issue(
        self,
        request: IssueClassificationRequest,
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

    def _neighbor_evidence(
        self,
        issue: NormalizedIssue,
        repo_key: str,
        k: int,
    ) -> tuple[list[SimilarIssueEvidence], str]:
        canonical_text = issue.canonical_text.strip()
        if not canonical_text:
            return (
                [],
                "Nearest-neighbor evidence ignored: target canonical text is empty.",
            )

        embedding_signature = self.embedding_provider.embedding_signature()
        query_vector = self.embedding_provider.embed_one(canonical_text)
        records = self.vector_store.query(
            vector=query_vector,
            k=max(k + 1, 2),
            embedding_signature=embedding_signature,
            filters={"repository": repo_key},
        )

        evidence: list[SimilarIssueEvidence] = []
        target_issue_id = str(issue.id)
        for record in records:
            if record.issue_id == target_issue_id:
                continue
            if record.score < 0.35:
                continue

            metadata = record.metadata
            labels = metadata.get("labels", [])
            if not isinstance(labels, list):
                labels = []

            evidence.append(
                SimilarIssueEvidence(
                    issue_id=record.issue_id,
                    issue_number=metadata.get("issue_number"),
                    title=metadata.get("title", ""),
                    similarity_score=record.score,
                    labels=[str(label) for label in labels if isinstance(label, str)],
                )
            )

            if len(evidence) >= k:
                break

        if not evidence:
            return [], (
                "Nearest-neighbor evidence ignored: no sufficiently similar indexed issues "
                "(similarity >= 0.35) were found."
            )

        return evidence, (
            "Nearest-neighbor evidence used for label hints only; predicted_type remains lexical-first for stability."
        )


def _score_from_text(
    issue: NormalizedIssue,
) -> tuple[dict[IssueType, float], list[str]]:
    text = f"{issue.title}\n{issue.body}".lower()
    title = issue.title.lower()

    scores: dict[IssueType, float] = {
        "bug": 0.0,
        "feature_request": 0.0,
        "documentation": 0.0,
        "support_question": 0.0,
        "spam_or_noise": 0.0,
    }
    reasons: list[str] = []

    if len(text.split()) < 6:
        scores["spam_or_noise"] += 0.8
        reasons.append("Issue text is very short, which weakens triage quality.")

    if "?" in issue.title or "?" in issue.body:
        scores["support_question"] += 0.7
        reasons.append("Question-style punctuation detected in issue content.")

    for key, (pattern, weight) in _HIGH_SIGNAL_PATTERNS.items():
        if pattern.search(text) is None:
            continue

        if key in {"spam_phrase"}:
            scores["spam_or_noise"] += weight
            reasons.append("Spam-like promotional phrases found in issue text.")
        elif key in {"security_phrase", "bug_phrase", "repro_phrase"}:
            scores["bug"] += weight
            if key == "repro_phrase":
                reasons.append(
                    "Reproduction-oriented language suggests bug reporting intent."
                )
            elif key == "security_phrase":
                reasons.append(
                    "Security-impact language detected; treated as bug-class signal."
                )
            else:
                reasons.append("Failure/crash/error language detected in issue text.")
        elif key == "feature_phrase":
            scores["feature_request"] += weight
            reasons.append("Feature-request phrasing found in title/body.")
        elif key == "documentation_phrase":
            scores["documentation"] += weight
            reasons.append("Documentation-related terminology detected.")
        elif key == "question_phrase":
            scores["support_question"] += weight
            reasons.append("Help/question phrasing detected.")

    labels_lower = {label.lower() for label in issue.labels}
    if "bug" in labels_lower:
        scores["bug"] += 1.1
        reasons.append("Existing issue label includes 'bug'.")
    if "documentation" in labels_lower or "docs" in labels_lower:
        scores["documentation"] += 1.1
        reasons.append("Existing issue label indicates documentation scope.")
    if "question" in labels_lower or "support" in labels_lower:
        scores["support_question"] += 1.0
        reasons.append("Existing issue label indicates support/question intent.")
    if "enhancement" in labels_lower or "feature" in labels_lower:
        scores["feature_request"] += 1.0
        reasons.append("Existing issue label indicates feature/enhancement intent.")
    if "invalid" in labels_lower or "spam" in labels_lower:
        scores["spam_or_noise"] += 1.2
        reasons.append("Existing issue label indicates invalid/spam noise.")

    if title.startswith("docs:"):
        scores["documentation"] += 1.0
        reasons.append("Title prefix suggests documentation change request.")

    return scores, _dedupe_keep_order(reasons)


def _select_issue_type(scores: dict[IssueType, float]) -> IssueType:
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_type, top_score = ranked[0]
    second_score = ranked[1][1]

    if top_score == 0.0:
        return "support_question"

    if (top_score - second_score) < 0.25 and top_type == "spam_or_noise":
        return "support_question"

    return top_type


def _confidence_from_scores(scores: dict[IssueType, float]) -> float:
    ranked_scores = sorted(scores.values(), reverse=True)
    top = ranked_scores[0]
    second = ranked_scores[1]

    if top <= 0.0:
        return 0.35

    margin = top - second
    confidence = 0.45 + min(0.5, top / 6.0) + min(0.2, margin / 3.0)
    return round(min(confidence, 0.98), 3)


def _derive_label_votes_from_neighbors(
    neighbors: list[SimilarIssueEvidence],
) -> tuple[dict[str, float], list[str]]:
    votes: dict[str, float] = {}
    reasons: list[str] = []

    for neighbor in neighbors:
        for raw_label in neighbor.labels:
            label = raw_label.strip().lower()
            if not label:
                continue
            if label not in _LABEL_ALLOWLIST:
                continue
            votes[label] = votes.get(label, 0.0) + neighbor.similarity_score

    for label, score in sorted(votes.items(), key=lambda item: item[1], reverse=True)[
        :3
    ]:
        reasons.append(
            f"Similar issues frequently use label '{label}' (weighted vote {round(score, 2)})."
        )

    return votes, reasons


def _build_label_suggestions(
    issue: NormalizedIssue,
    predicted_type: IssueType,
    lexical_scores: dict[IssueType, float],
    neighbor_label_votes: dict[str, float],
) -> tuple[list[str], list[str]]:
    labels: list[str] = []
    reasons: list[str] = []

    existing = {label.lower() for label in issue.labels}

    type_to_label = {
        "bug": "bug",
        "feature_request": "enhancement",
        "documentation": "documentation",
        "support_question": "question",
        "spam_or_noise": "invalid",
    }

    primary_label = type_to_label[predicted_type]
    labels.append(primary_label)
    reasons.append(
        f"Primary label '{primary_label}' follows predicted_type '{predicted_type}'."
    )

    if predicted_type == "bug" and lexical_scores["bug"] >= 1.0:
        if lexical_scores["bug"] >= 2.1 and "needs-repro" not in existing:
            labels.append("needs-repro")
            reasons.append(
                "Bug signals are strong; reproduction label added for triage workflow."
            )
        if _missing_core_details(issue) and "needs-info" not in existing:
            labels.append("needs-info")
            reasons.append(
                "Issue lacks key debugging details, so 'needs-info' is suggested."
            )

    if predicted_type == "support_question" and _missing_core_details(issue):
        if "needs-info" not in existing:
            labels.append("needs-info")
            reasons.append(
                "Question lacks enough context for maintainers; suggest 'needs-info'."
            )

    for voted_label, score in sorted(
        neighbor_label_votes.items(), key=lambda item: item[1], reverse=True
    ):
        if len(labels) >= 4:
            break
        if score < 1.0:
            continue
        if voted_label in labels:
            continue
        if voted_label in {"spam", "invalid"} and predicted_type != "spam_or_noise":
            continue
        labels.append(voted_label)
        reasons.append(
            f"Neighbor evidence supports '{voted_label}' (weighted score {round(score, 2)})."
        )

    return _dedupe_keep_order(labels), _dedupe_keep_order(reasons)


def _missing_core_details(issue: NormalizedIssue) -> bool:
    text = f"{issue.title}\n{issue.body}".lower()
    has_repro = bool(re.search(r"\b(steps to reproduce|repro|expected|actual)\b", text))
    has_logs = bool(re.search(r"\b(stack trace|traceback|error log|logs?)\b", text))
    return not (has_repro or has_logs)


def _dedupe_keep_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


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
