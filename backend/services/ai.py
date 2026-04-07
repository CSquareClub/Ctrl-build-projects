import json
import os
from typing import Any

import httpx

# HF model ID — e.g. "Qwen/Qwen2.5-72B-Instruct"
HF_MODEL = os.environ.get("GPT_OSS_MODEL_ENDPOINT", "Qwen/Qwen2.5-72B-Instruct")
HF_TOKEN = os.environ.get("GPT_OSS_MODEL_API_KEY", "")

# HF Inference Providers – new router endpoint (June 2025 migration)
CHAT_URL = "https://router.huggingface.co/v1/chat/completions"

HEADERS = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}

TIMEOUT = 90.0  # seconds — free tier can be slow on cold start


async def _call(prompt: str) -> str:
    """
    Send a prompt via HF OpenAI-compatible chat completions API.
    Returns the assistant message content string.
    """
    if not HF_TOKEN:
        raise RuntimeError("GPT_OSS_MODEL_API_KEY is not set in .env")

    payload = {
        "model": HF_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
        "temperature": 0.2,  # low temp for consistent JSON output
    }

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.post(CHAT_URL, headers=HEADERS, json=payload)
        resp.raise_for_status()
        data = resp.json()

    return data["choices"][0]["message"]["content"]


async def classify_issue(title: str, body: str) -> dict:
    """
    Classify a GitHub issue.
    Returns: { classification, priorityScore, labels, similarIssues, explanation, isDuplicate }
    """
    prompt = f"""You are an expert GitHub issue triage assistant.

Classify the following GitHub issue and respond ONLY with a valid JSON object in this exact format:
{{
  "classification": "<BUG|FEATURE_REQUEST|DOCUMENTATION|QUESTION|SPAM|UNCLEAR>",
  "priorityScore": <0-100 integer>,
  "labels": ["label1", "label2"],
  "similarIssues": [],
  "explanation": "<one sentence explanation>",
  "isDuplicate": false
}}

Issue Title: {title}
Issue Body: {body}

JSON:"""
    raw = await _call(prompt)
    # Extract JSON from response
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])


async def moderate_content(content: str, content_type: str = "code") -> dict:
    """
    Moderate a PR diff, commit message, or comment.
    Returns: { decision, severity, issues: [{type, file, line_start, line_end, description, suggestion}], explanation }
    """
    prompt = f"""You are a code and content moderation expert for open-source projects.

Analyse the following {content_type} and respond ONLY with a valid JSON object:
{{
  "decision": "<PASS|FLAG|BLOCK>",
  "severity": "<CRITICAL|HIGH|MEDIUM|LOW>",
  "issues": [
    {{
      "type": "<security|toxicity|policy|quality>",
      "file": "<file path or null>",
      "line_start": <integer or null>,
      "line_end": <integer or null>,
      "description": "<description>",
      "suggestion": "<fix suggestion>"
    }}
  ],
  "explanation": "<full explanation for GitHub comment>"
}}

PASS if there are no issues. BLOCK for CRITICAL/HIGH security or toxic content. FLAG for MEDIUM concerns.

Content:
{content[:4000]}

JSON:"""
    raw = await _call(prompt)
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])


_embed_model = None


def _get_embed_model():
    """Load SentenceTransformer once and cache it for the process lifetime."""
    global _embed_model
    if _embed_model is None:
        from sentence_transformers import SentenceTransformer
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


async def embed_text(text: str) -> list[float]:
    """
    Get an embedding vector for duplicate detection.
    Uses sentence-transformers locally — fast, free, no API key needed.
    Model is loaded once and cached for the lifetime of the process.
    """
    model = _get_embed_model()
    vector = model.encode(text[:512]).tolist()
    return vector


async def generate_readme(repo_name: str, description: str, options: dict) -> str:
    """
    Generate a full README.md for a GitHub repository.
    options keys: badges, features, installation, usage, apiRef, contributing, license
    """
    sections = []
    if options.get("badges"):
        sections.append("Include shields.io badge for GitHub stars, forks, and license.")
    if options.get("features"):
        sections.append("Include a ## Features section listing key features.")
    if options.get("installation"):
        sections.append("Include a ## Installation section with step-by-step setup instructions.")
    if options.get("usage"):
        sections.append("Include a ## Usage section with code examples.")
    if options.get("apiRef"):
        sections.append("Include a ## API Reference section describing the main API endpoints or functions.")
    if options.get("contributing"):
        sections.append("Include a ## Contributing section with contribution guidelines.")
    if options.get("license"):
        sections.append("Include a ## License section — use MIT License.")

    section_instructions = "\n".join(f"- {s}" for s in sections) if sections else "- Include all standard README sections."

    prompt = f"""You are a technical writer. Generate a complete, professional README.md for the GitHub repository '{repo_name}'.

Repository description: {description}

The README must:
{section_instructions}

Format the output as clean Markdown that renders well on GitHub. Do not include any explanation or commentary — output ONLY the Markdown content.

README.md:"""
    return await _call(prompt)
