import json
import os
import re
from typing import Any, Dict, List, Tuple
from urllib import error, request

from app.services.priority_service import assign_priority

BUG_KEYWORDS = {"error", "bug", "crash", "exception", "fail", "broken", "issue", "doesn't work", "not working"}
FEATURE_KEYWORDS = {"feature", "add", "enhance", "improve", "request", "support", "new", "idea"}
QUESTION_KEYWORDS = {"how", "why", "what", "question", "help", "explain"}
DOCS_KEYWORDS = {"doc", "documentation", "typo", "readme", "comment", "spelling", "grammar", "unclear"}
VALID_LABELS = {"bug", "feature", "question", "docs"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}

SYSTEM_PROMPT = """You are an intelligent issue triage assistant for a software project.

Your job is to analyze a GitHub issue and return structured insights.

You must strictly follow these rules:

Output Format (MANDATORY)
Always return a valid JSON object with this exact schema:

{
"label": "bug" | "feature" | "docs" | "question",
"priority": "low" | "medium" | "high" | "critical",
"labels": ["label1", "label2"],
"reason": "short explanation"
}

Do NOT include any extra text outside the JSON.

Classification Rules
"bug":
Use when the issue describes something broken, not working, crashing, or producing incorrect results.
Keywords: error, crash, fail, broken, not working
"feature":
Use when the user is requesting a new feature, enhancement, or improvement.
Keywords: add, feature, improve, enhancement
"docs":
Use when the issue is about documentation, typos, unclear explanations, or missing docs.
Keywords: documentation, typo, readme, unclear
"question":
Use when the issue is asking for help, clarification, or usage guidance.

If unsure, default to "question".

Priority Rules
"critical":
Security issues, data loss, complete system failure
"high":
Major bugs affecting core functionality (e.g., crashes, login failure)
"medium":
Non-critical bugs or feature requests
"low":
Questions, minor issues, docs, or vague reports

Labels Field
Suggest 1-3 relevant labels (e.g., "ui", "api", "database", "auth", "testing", "performance")

Reason Field
Keep it concise (1 sentence max)
Explain WHY you chose the label and priority

Behavior Constraints
Be deterministic and consistent
Do not hallucinate missing details
Do not assume context outside the given issue
If the issue is vague or spam-like, classify as:
label = "question", priority = "low"

Input Format

You will receive:

title: string
description: string

Analyze both together before responding."""


def _heuristic_classify(title: str, description: str) -> Tuple[str, float]:
    text = (title + " " + description).lower()

    bug_matches = sum(1 for kw in BUG_KEYWORDS if kw in text)
    feature_matches = sum(1 for kw in FEATURE_KEYWORDS if kw in text)
    question_matches = sum(1 for kw in QUESTION_KEYWORDS if kw in text)
    docs_matches = sum(1 for kw in DOCS_KEYWORDS if kw in text)

    total_matches = bug_matches + feature_matches + question_matches + docs_matches

    if total_matches == 0:
        return "question", 0.5

    scores = {
        "bug": bug_matches / total_matches,
        "feature": feature_matches / total_matches,
        "question": question_matches / total_matches,
        "docs": docs_matches / total_matches,
    }

    best_label = max(scores, key=scores.get)
    best_confidence = scores[best_label]
    return best_label, best_confidence


def _generate_labels(label: str, title: str, description: str) -> List[str]:
    """Generate suggested labels based on content"""
    text = (title + " " + description).lower()
    labels = []
    
    # Category-based labels
    label_keywords = {
        "ui": ["ui", "frontend", "css", "style", "button", "page", "display", "layout"],
        "api": ["api", "endpoint", "request", "response", "rest", "graphql"],
        "database": ["database", "db", "sql", "query", "migration", "schema"],
        "auth": ["auth", "login", "logout", "password", "token", "session", "permission"],
        "testing": ["test", "testing", "spec", "coverage", "mock", "fixture"],
        "performance": ["performance", "slow", "speed", "optimize", "memory", "cpu"],
        "security": ["security", "vulnerability", "xss", "injection", "csrf"],
        "documentation": ["doc", "readme", "comment", "example"],
    }
    
    for label_name, keywords in label_keywords.items():
        if any(kw in text for kw in keywords):
            labels.append(label_name)
    
    return labels[:3]  # Return max 3 labels


def _extract_json_text(response_text: str) -> Dict[str, Any]:
    cleaned = response_text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            raise ValueError("Gemini response did not contain valid JSON")
        return json.loads(match.group(0))


def _validate_triage_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    label = str(payload.get("label", "")).strip().lower()
    priority = str(payload.get("priority", "")).strip().lower()
    reason = str(payload.get("reason", "")).strip()
    labels = payload.get("labels", [])

    if label not in VALID_LABELS:
        raise ValueError(f"Invalid label from model: {label}")

    if priority not in VALID_PRIORITIES:
        raise ValueError(f"Invalid priority from model: {priority}")

    if not reason:
        raise ValueError("Model response missing reason")
    
    if not isinstance(labels, list):
        labels = []

    return {"label": label, "priority": priority, "reason": reason, "labels": labels}


def _call_gemini_triage(title: str, description: str) -> Dict[str, str]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    timeout_seconds = float(os.getenv("GEMINI_TIMEOUT_SECS", "12"))
    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )

    user_input = f"title: {title}\ndescription: {description}"
    body = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_input}],
            }
        ],
        "generationConfig": {
            "temperature": 0,
            "topP": 1,
            "topK": 1,
            "maxOutputTokens": 120,
        },
    }

    payload_bytes = json.dumps(body).encode("utf-8")
    req = request.Request(
        endpoint,
        data=payload_bytes,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=timeout_seconds) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini API HTTP error: {exc.code} {error_body}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Gemini API network error: {exc.reason}") from exc

    candidates = response_data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini API returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    if not parts or "text" not in parts[0]:
        raise RuntimeError("Gemini API response missing text output")

    model_text = parts[0]["text"]
    return _validate_triage_payload(_extract_json_text(model_text))


def triage_issue(title: str, description: str) -> Dict[str, Any]:
    """
    Triage an issue using Gemini AI with heuristic fallback.
    """
    # Try Gemini
    try:
        ai_result = _call_gemini_triage(title, description)
        return {
            "label": ai_result["label"],
            "priority": ai_result["priority"],
            "labels": ai_result.get("labels", _generate_labels(ai_result["label"], title, description)),
            "reason": ai_result["reason"],
            "classification_confidence": 0.95,
            "priority_confidence": 0.95,
            "source": "gemini",
        }
    except Exception:
        pass
    
    # Heuristic fallback
    label, classification_confidence = _heuristic_classify(title, description)
    priority, priority_confidence = assign_priority(label, title, description)
    labels = _generate_labels(label, title, description)

    fallback_reason = (
        "Heuristic triage was used because Gemini API was unavailable."
    )
    return {
        "label": label,
        "priority": priority,
        "labels": labels,
        "reason": fallback_reason,
        "classification_confidence": classification_confidence,
        "priority_confidence": min(priority_confidence, 0.9),
        "source": "heuristic",
    }

def classify_issue(title: str, description: str) -> Tuple[str, float]:
    """Backward-compatible classifier interface used by existing callers."""
    triage_result = triage_issue(title, description)
    return triage_result["label"], float(triage_result["classification_confidence"])
