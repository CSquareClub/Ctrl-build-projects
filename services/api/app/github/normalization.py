from __future__ import annotations

from collections.abc import Mapping
from typing import Optional

from app.schemas.issues import IssueAuthor, NormalizedIssue


def build_canonical_text(title: Optional[str], body: Optional[str]) -> str:
    normalized_title = (title or "").strip()
    normalized_body = (body or "").strip()

    if normalized_title and normalized_body:
        return f"{normalized_title}\n\n{normalized_body}"
    if normalized_title:
        return normalized_title
    if normalized_body:
        return normalized_body
    return ""


def _normalize_labels(labels: object) -> list[str]:
    if not isinstance(labels, list):
        return []

    normalized: list[str] = []
    for label in labels:
        if isinstance(label, str):
            label_name = label.strip()
        elif isinstance(label, Mapping):
            raw_name = label.get("name")
            label_name = raw_name.strip() if isinstance(raw_name, str) else ""
        else:
            label_name = ""

        if label_name:
            normalized.append(label_name)

    return normalized


def normalize_github_issue(issue_payload: Mapping) -> NormalizedIssue:
    title = (
        issue_payload.get("title")
        if isinstance(issue_payload.get("title"), str)
        else ""
    )
    body = (
        issue_payload.get("body") if isinstance(issue_payload.get("body"), str) else ""
    )

    author_payload = (
        issue_payload.get("user")
        if isinstance(issue_payload.get("user"), Mapping)
        else {}
    )

    normalized = NormalizedIssue(
        id=issue_payload["id"],
        number=issue_payload["number"],
        title=title,
        body=body,
        state=issue_payload["state"],
        labels=_normalize_labels(issue_payload.get("labels")),
        created_at=issue_payload["created_at"],
        updated_at=issue_payload["updated_at"],
        html_url=issue_payload["html_url"],
        url=issue_payload["url"],
        author=IssueAuthor(
            login=author_payload.get("login"),
            id=author_payload.get("id"),
            html_url=author_payload.get("html_url"),
            type=author_payload.get("type"),
        ),
        comment_count=issue_payload.get("comments", 0),
        canonical_text=build_canonical_text(title=title, body=body),
        metadata={
            "repository_url": issue_payload.get("repository_url"),
            "labels_url": issue_payload.get("labels_url"),
            "comments_url": issue_payload.get("comments_url"),
            "events_url": issue_payload.get("events_url"),
            "locked": issue_payload.get("locked"),
            "author_association": issue_payload.get("author_association"),
            "is_pull_request": "pull_request" in issue_payload,
            "pull_request": issue_payload.get("pull_request"),
        },
    )

    return normalized
