import json
import os
import re
from typing import Any, Dict, Tuple
from urllib import error, request

from app.services.priority_service import assign_priority

BUG_KEYWORDS = {"error", "bug", "crash", "exception", "fail", "broken", "issue", "doesn't work", "not working"}
FEATURE_KEYWORDS = {"feature", "add", "enhance", "improve", "request", "support", "new", "idea"}
QUESTION_KEYWORDS = {"how", "why", "what", "question", "help", "explain", "doc", "documentation"}
VALID_LABELS = {"bug", "feature", "question"}
VALID_PRIORITIES = {"low", "medium", "high"}

SYSTEM_PROMPT = """You are an intelligent issue triage assistant for a software project.

Your job is to analyze a GitHub issue and return structured insights.

You must strictly follow these rules:

Output Format (MANDATORY)
Always return a valid JSON object with this exact schema:

{
"label": "bug" | "feature" | "question",
"priority": "low" | "medium" | "high",
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
"question":
Use when the issue is asking for help, clarification, or usage guidance.

If unsure, default to "question".

Priority Rules
"high":
Critical bugs affecting core functionality (e.g., crashes, data loss, login failure)
"medium":
Non-critical bugs or feature requests
"low":
Questions, minor issues, or vague reports

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

    total_matches = bug_matches + feature_matches + question_matches

    if total_matches == 0:
        return "question", 0.5

    scores = {
        "bug": bug_matches / total_matches,
        "feature": feature_matches / total_matches,
        "question": question_matches / total_matches,
    }

    best_label = max(scores, key=scores.get)
    best_confidence = scores[best_label]
    return best_label, best_confidence


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


def _validate_triage_payload(payload: Dict[str, Any]) -> Dict[str, str]:
    label = str(payload.get("label", "")).strip().lower()
    priority = str(payload.get("priority", "")).strip().lower()
    reason = str(payload.get("reason", "")).strip()

    if label not in VALID_LABELS:
        raise ValueError(f"Invalid label from model: {label}")

    if priority == "critical":
        priority = "high"
    if priority not in VALID_PRIORITIES:
        raise ValueError(f"Invalid priority from model: {priority}")

    if not reason:
        raise ValueError("Model response missing reason")

    return {"label": label, "priority": priority, "reason": reason}


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
    try:
        ai_result = _call_gemini_triage(title, description)
        return {
            "label": ai_result["label"],
            "priority": ai_result["priority"],
            "reason": ai_result["reason"],
            "classification_confidence": 0.95,
            "priority_confidence": 0.95,
            "source": "gemini",
        }
    except Exception:
        label, classification_confidence = _heuristic_classify(title, description)
        priority, priority_confidence = assign_priority(label, title, description)
        if priority == "critical":
            priority = "high"

        fallback_reason = (
            "Fallback heuristic triage was used because Gemini was unavailable or returned invalid output."
        )
        return {
            "label": label,
            "priority": priority,
            "reason": fallback_reason,
            "classification_confidence": classification_confidence,
            "priority_confidence": min(priority_confidence, 0.9),
            "source": "heuristic",
        }

def classify_issue(title: str, description: str) -> Tuple[str, float]:
    """Backward-compatible classifier interface used by existing callers."""
    triage_result = triage_issue(title, description)
    return triage_result["label"], float(triage_result["classification_confidence"])
