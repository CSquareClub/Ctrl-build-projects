#!/usr/bin/env python3
"""
Synapse Issue Triage Bot
========================
Triggered by GitHub Actions on ``issues: [opened]``.

Behaviour
---------
1. If ``SYNAPSE_API_URL`` is set, calls ``POST {SYNAPSE_API_URL}/api/analyze``
   with the issue payload and expects a ``TriageResult``-shaped response.
2. If the env var is absent **or** the request fails, falls back to
   keyword-based mock triage (no external dependencies required).
3. Posts a structured markdown triage comment on the issue.
4. Auto-applies the suggested labels via the GitHub REST API.

Request body sent to ``/api/analyze``
--------------------------------------
Matches the fields available from the GitHub event; shaped to align with
the ``NormalizedIssue`` schema used by the FastAPI backend::

    {
        "number":  <int>,
        "title":   <str>,
        "body":    <str>,
        "labels":  [],
        "owner":   <str>,
        "repo":    <str>
    }

Expected response shape (``TriageResult``)
-------------------------------------------
    {
        "issue_id":            <str>,
        "predicted_type":      <str>,        # "bug" | "feature" | "question" | "docs" | "security" | "other"
        "type_confidence":     <float>,      # 0.0 – 1.0
        "priority_score":      <int>,        # 1 – 10
        "priority_band":       <str>,        # "critical" | "high" | "medium" | "low"
        "priority_reasons":    [<str>, ...],
        "duplicate_confidence":<float>,      # 0.0 – 1.0
        "similar_issues":      [...],        # list of {number, title, similarity}
        "suggested_labels":    [<str>, ...],
        "missing_information": [<str>, ...],
        "summary":             <str>,
        "analysis_version":    <str>
    }
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any

# ── Environment ───────────────────────────────────────────────────────────────

GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
ISSUE_NUMBER = int(os.environ["ISSUE_NUMBER"])
ISSUE_TITLE = os.environ.get("ISSUE_TITLE", "") or ""
ISSUE_BODY = os.environ.get("ISSUE_BODY", "") or ""
ISSUE_STATE = os.environ.get("ISSUE_STATE", "open") or "open"
ISSUE_LABELS_RAW = os.environ.get("ISSUE_LABELS", "[]") or "[]"
REPO_OWNER = os.environ["REPO_OWNER"]
REPO_NAME = os.environ["REPO_NAME"]
SYNAPSE_API_URL = os.environ.get("SYNAPSE_API_URL", "").rstrip("/")

_GITHUB_API = "https://api.github.com"

# ── GitHub REST helpers ───────────────────────────────────────────────────────


def _gh_request(method: str, path: str, body: dict[str, Any] | None = None) -> Any:
    url = f"{_GITHUB_API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
            "User-Agent": "synapse-triage-bot/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        body_text = exc.read().decode(errors="replace")
        print(
            f"[gh-api] {method} {path} → HTTP {exc.code}: {body_text[:200]}",
            file=sys.stderr,
        )
        raise


def post_comment(markdown: str) -> None:
    _gh_request(
        "POST",
        f"/repos/{REPO_OWNER}/{REPO_NAME}/issues/{ISSUE_NUMBER}/comments",
        {"body": markdown},
    )


def add_labels(labels: list[str]) -> None:
    if not labels:
        return

    cleaned_labels: list[str] = []
    seen: set[str] = set()
    for label in labels:
        normalized = str(label).strip()
        if not normalized:
            continue
        lowered = normalized.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned_labels.append(normalized)

    if not cleaned_labels:
        return

    _gh_request(
        "POST",
        f"/repos/{REPO_OWNER}/{REPO_NAME}/issues/{ISSUE_NUMBER}/labels",
        {"labels": cleaned_labels},
    )


def _parse_issue_labels(raw_labels: str) -> list[str]:
    raw = (raw_labels or "").strip()
    if not raw:
        return []

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = None

    if isinstance(parsed, list):
        labels = [str(item).strip() for item in parsed if str(item).strip()]
        return labels

    return [label.strip() for label in raw.split(",") if label.strip()]


# ── Backend /api/analyze call ─────────────────────────────────────────────────


def call_analyze_api() -> dict[str, Any] | None:
    """
    POST {SYNAPSE_API_URL}/api/analyze with the issue payload.
    Returns a ``TriageResult``-shaped dict on success, ``None`` on any failure.
    """
    if not SYNAPSE_API_URL:
        return None

    issue_labels = _parse_issue_labels(ISSUE_LABELS_RAW)

    payload = {
        "owner": REPO_OWNER,
        "repo": REPO_NAME,
        "token": GITHUB_TOKEN,
        "k": 5,
        "state": "all",
        "include_pull_requests": False,
        "target_issue": {
            "number": ISSUE_NUMBER,
            "title": ISSUE_TITLE,
            "body": ISSUE_BODY,
            "labels": issue_labels,
            "state": ISSUE_STATE,
        },
    }
    req = urllib.request.Request(
        f"{SYNAPSE_API_URL}/api/analyze",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "synapse-triage-bot/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read())
            print("[triage] /api/analyze succeeded.")
            return _normalize_api_result(result)
    except Exception as exc:
        print(
            f"[triage] /api/analyze unavailable ({exc}). Falling back to mock mode.",
            file=sys.stderr,
        )
        return None


def _normalize_api_result(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Normalize canonical AnalyzeResponse into legacy TriageResult-like fields
    expected by markdown rendering and label application.
    """
    if not isinstance(raw, dict):
        return {}

    predicted_type_section = raw.get("predicted_type")
    if not isinstance(predicted_type_section, dict):
        # Legacy flat payload or unknown shape; return as-is.
        return raw

    suggested_labels_section = raw.get("suggested_labels")
    duplicate_candidates_section = raw.get("duplicate_candidates")
    priority_section = raw.get("priority")
    missing_information_section = raw.get("missing_information")
    explanation_section = raw.get("explanation")

    duplicate_items = []
    if isinstance(duplicate_candidates_section, dict):
        items = duplicate_candidates_section.get("items")
        if isinstance(items, list):
            for item in items:
                if not isinstance(item, dict):
                    continue
                score = (
                    item.get("final_score")
                    if item.get("final_score") is not None
                    else item.get("rerank_score")
                    if item.get("rerank_score") is not None
                    else item.get("similarity_score")
                    if item.get("similarity_score") is not None
                    else 0.0
                )
                duplicate_items.append(
                    {
                        "issue_number": item.get("issue_number"),
                        "title": str(item.get("title") or ""),
                        "similarity": float(score),
                    }
                )

    suggested_labels_items: list[str] = []
    if isinstance(suggested_labels_section, dict):
        raw_labels = suggested_labels_section.get("items")
        if isinstance(raw_labels, list):
            suggested_labels_items = [
                str(label).strip() for label in raw_labels if str(label).strip()
            ]

    missing_items: list[str] = []
    if isinstance(missing_information_section, dict):
        raw_missing = missing_information_section.get("items")
        if isinstance(raw_missing, list):
            missing_items = [
                str(item).strip() for item in raw_missing if str(item).strip()
            ]

    priority_score = 0
    priority_band = "medium"
    priority_reasons: list[str] = []
    if isinstance(priority_section, dict):
        score = priority_section.get("score")
        if isinstance(score, (int, float)):
            priority_score = int(score)
        band = priority_section.get("band")
        if isinstance(band, str) and band.strip():
            priority_band = band.strip()
        raw_reasons = priority_section.get("reasons")
        if isinstance(raw_reasons, list):
            priority_reasons = [
                str(reason).strip() for reason in raw_reasons if str(reason).strip()
            ]

    predicted_label = str(predicted_type_section.get("label") or "other")
    predicted_confidence = predicted_type_section.get("confidence")
    if not isinstance(predicted_confidence, (int, float)):
        predicted_confidence = 0.0

    duplicate_confidence = 0.0
    if isinstance(duplicate_candidates_section, dict):
        confidence = duplicate_candidates_section.get("confidence")
        if isinstance(confidence, (int, float)):
            duplicate_confidence = float(confidence)

    summary = ""
    if isinstance(explanation_section, dict):
        maybe_summary = explanation_section.get("summary")
        if isinstance(maybe_summary, str):
            summary = maybe_summary

    return {
        "issue_id": str(raw.get("issue_id") or ISSUE_NUMBER),
        "predicted_type": predicted_label,
        "type_confidence": float(predicted_confidence),
        "priority_score": priority_score,
        "priority_band": priority_band,
        "priority_reasons": priority_reasons,
        "duplicate_confidence": duplicate_confidence,
        "similar_issues": duplicate_items,
        "suggested_labels": suggested_labels_items,
        "missing_information": missing_items,
        "summary": summary,
        "analysis_version": str(raw.get("analysis_version") or "v0"),
    }


# ── Keyword-based mock triage ─────────────────────────────────────────────────

_TYPE_KEYWORDS: dict[str, list[str]] = {
    "bug": [
        "bug",
        "crash",
        "error",
        "exception",
        "fail",
        "failure",
        "broken",
        "wrong",
        "incorrect",
        "regression",
        "traceback",
        "panic",
        "segfault",
        "not working",
        "doesn't work",
        "does not work",
    ],
    "feature": [
        "feature",
        "enhancement",
        "request",
        "add support",
        "implement",
        "new feature",
        "allow",
        "enable",
        "wish",
        "proposal",
        "would be nice",
    ],
    "question": [
        "question",
        "how to",
        "how do",
        "why does",
        "what is",
        "where is",
        "is it possible",
        "can i",
        "help",
        "confused",
        "unclear",
    ],
    "docs": [
        "docs",
        "documentation",
        "readme",
        "example",
        "tutorial",
        "guide",
        "typo",
        "spelling",
        "grammar",
        "clarify",
        "outdated",
    ],
    "security": [
        "security",
        "vulnerability",
        "cve",
        "exploit",
        "injection",
        "xss",
        "csrf",
        "auth bypass",
        "privilege escalation",
        "rce",
        "ssrf",
    ],
}

_HIGH_PRIORITY_KEYWORDS = [
    "critical",
    "urgent",
    "blocker",
    "block",
    "data loss",
    "security",
    "vulnerability",
    "outage",
    "production down",
    "regression",
    "crash",
]
_LOW_PRIORITY_KEYWORDS = [
    "minor",
    "nice to have",
    "cosmetic",
    "typo",
    "small",
    "trivial",
    "low priority",
    "whenever",
    "eventually",
]

# Patterns checked for missing info (only enforced for bug reports)
_MISSING_INFO_PATTERNS: list[tuple[str, str]] = [
    (
        r"steps to reproduce|repro steps|how to reproduce|reproduction",
        "Steps to reproduce",
    ),
    (r"expected behavior|expected result|expected output", "Expected behavior"),
    (
        r"actual behavior|actual result|observed behavior|actual output",
        "Actual behavior",
    ),
    (
        r"version|v\d+[\.\d]*|\d+\.\d+\.\d+|python \d|node \d",
        "Version / environment info",
    ),
]


def _keyword_score(text: str, keywords: list[str]) -> int:
    lower = text.lower()
    return sum(1 for kw in keywords if kw in lower)


def mock_triage() -> dict[str, Any]:
    combined = f"{ISSUE_TITLE}\n\n{ISSUE_BODY}".strip()
    combined_lower = combined.lower()
    body_len = len(ISSUE_BODY.strip())

    # ── Type detection ────────────────────────────────────────────────────────
    scores = {
        t: _keyword_score(combined_lower, kws) for t, kws in _TYPE_KEYWORDS.items()
    }
    best_type = max(scores, key=lambda t: scores[t])
    best_score = scores[best_type]
    predicted_type = best_type if best_score > 0 else "other"
    total = sum(scores.values()) or 1
    type_confidence = round(scores.get(predicted_type, 0) / total, 2)

    # ── Priority ──────────────────────────────────────────────────────────────
    high_hits = _keyword_score(combined_lower, _HIGH_PRIORITY_KEYWORDS)
    low_hits = _keyword_score(combined_lower, _LOW_PRIORITY_KEYWORDS)

    if predicted_type == "security" or high_hits >= 2:
        priority_band = "critical"
        priority_score = 10
        priority_reasons: list[str] = ["Matches critical-impact or security keywords"]
    elif high_hits >= 1 or predicted_type == "bug":
        priority_band = "high"
        priority_score = 7
        priority_reasons = ["Bug report or high-impact signal detected"]
    elif low_hits >= 1 or predicted_type in ("docs", "question"):
        priority_band = "low"
        priority_score = 2
        priority_reasons = ["Documentation / question type or low-impact keywords"]
    else:
        priority_band = "medium"
        priority_score = 5
        priority_reasons = ["No strong priority signal — defaulting to medium"]

    if body_len < 50:
        priority_reasons.append("Very short description — may lack context")

    # ── Missing information ───────────────────────────────────────────────────
    missing: list[str] = []
    if body_len < 20:
        missing.append("Issue body is empty or too short to triage effectively")
    elif predicted_type == "bug":
        for pattern, label in _MISSING_INFO_PATTERNS:
            if not re.search(pattern, combined_lower):
                missing.append(label)

    # ── Suggested labels ──────────────────────────────────────────────────────
    suggested_labels: list[str] = []
    if predicted_type != "other":
        suggested_labels.append(predicted_type)
    if priority_band in ("critical", "high"):
        suggested_labels.append("priority: high")
    elif priority_band == "low":
        suggested_labels.append("priority: low")
    if missing:
        suggested_labels.append("needs more info")

    return {
        "issue_id": str(ISSUE_NUMBER),
        "predicted_type": predicted_type,
        "type_confidence": type_confidence,
        "priority_score": priority_score,
        "priority_band": priority_band,
        "priority_reasons": priority_reasons,
        "duplicate_confidence": 0.0,
        "similar_issues": [],
        "suggested_labels": suggested_labels,
        "missing_information": missing,
        "summary": (
            f"Auto-triaged as **{predicted_type}** with **{priority_band}** priority "
            f"(mock mode, no Synapse API configured)."
        ),
        "analysis_version": "mock-v1",
    }


# ── Markdown comment builder ──────────────────────────────────────────────────

_PRIORITY_ICON: dict[str, str] = {
    "critical": "🔴",
    "high": "🟠",
    "medium": "🟡",
    "low": "🟢",
}
_TYPE_ICON: dict[str, str] = {
    "bug": "🐛",
    "feature": "✨",
    "question": "❓",
    "docs": "📖",
    "security": "🔒",
    "other": "📌",
    "feature_request": "✨",
    "documentation": "📖",
    "support_question": "❓",
    "spam_or_noise": "🧹",
}


def build_comment(result: dict[str, Any], *, used_api: bool) -> str:
    mode_label = "Synapse API" if used_api else "keyword mock"
    ptype = result.get("predicted_type", "other")
    confidence_pct = int(result.get("type_confidence", 0) * 100)
    p_band = result.get("priority_band", "medium")
    p_score = result.get("priority_score", 5)
    p_reasons = result.get("priority_reasons") or []
    dup_pct = int(result.get("duplicate_confidence", 0) * 100)
    similar = result.get("similar_issues") or []
    labels = result.get("suggested_labels") or []
    missing = result.get("missing_information") or []
    summary = result.get("summary", "")
    version = result.get("analysis_version", "v0")

    t_icon = _TYPE_ICON.get(ptype, "📌")
    p_icon = _PRIORITY_ICON.get(p_band, "⚪")

    lines: list[str] = [
        "## 🤖 Synapse Triage Report",
        "",
        f"> Mode: **{mode_label}** &nbsp;·&nbsp; version `{version}`",
        "",
        "---",
        "",
        "### Classification",
        "",
        "| Field | Value |",
        "|---|---|",
        f"| Type | {t_icon} `{ptype}` — {confidence_pct}% confidence |",
        f"| Priority | {p_icon} `{p_band}` (score {p_score}/10) |",
        f"| Duplicate likelihood | `{dup_pct}%` |",
        "",
    ]

    if p_reasons:
        lines += ["**Priority reasoning:**", ""]
        lines += [f"- {r}" for r in p_reasons]
        lines += [""]

    if labels:
        badge_row = " ".join(f"`{lb}`" for lb in labels)
        lines += ["### Suggested Labels", "", badge_row, ""]

    if similar:
        lines += ["### Possible Duplicates", ""]
        for s in similar[:5]:
            num = s.get("number") or s.get("issue_number", "?")
            title = s.get("title", "")
            sim = int(s.get("similarity", s.get("score", 0)) * 100)
            lines.append(f"- #{num} — {title} ({sim}% similar)")
        lines += [""]
    elif dup_pct > 20:
        lines += [
            "### Possible Duplicates",
            "",
            "_No candidates retrieved in this run._",
            "",
        ]

    if missing:
        lines += [
            "### Missing Information",
            "",
            "Please update the issue to include:",
            "",
        ]
        lines += [f"- [ ] {item}" for item in missing]
        lines += [""]

    if summary:
        lines += ["---", "", f"_{summary}_", ""]

    lines += [
        "---",
        "<sub>Powered by [Synapse](https://github.com/Saatvik-GT/Synapse-) · auto-triage bot</sub>",
    ]

    return "\n".join(lines)


# ── Entry point ───────────────────────────────────────────────────────────────


def main() -> None:
    print(f"[triage] Issue #{ISSUE_NUMBER}: {ISSUE_TITLE!r}")
    print(f"[triage] SYNAPSE_API_URL={'set' if SYNAPSE_API_URL else 'not set'}")

    api_result = call_analyze_api()
    used_api = api_result is not None
    result = api_result if used_api else mock_triage()

    comment = build_comment(result, used_api=used_api)

    try:
        post_comment(comment)
        print("[triage] Comment posted successfully.")
    except Exception as exc:
        print(f"[triage] Failed to post comment: {exc}", file=sys.stderr)
        sys.exit(1)

    labels = result.get("suggested_labels") or []
    if labels:
        try:
            add_labels(labels)
            print(f"[triage] Labels applied: {labels}")
        except Exception as exc:
            # Non-fatal — labels may not exist in the repo yet
            print(f"[triage] Warning: could not apply labels ({exc})", file=sys.stderr)

    print("[triage] Done.")


if __name__ == "__main__":
    main()
