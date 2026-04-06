"""Groq OpenAI-compatible integration for AI-generated replies."""
from __future__ import annotations

import logging
import os
from typing import Sequence

import httpx


logger = logging.getLogger(__name__)

FALLBACK_RESPONSE = "I'm having trouble responding right now. Please try again."
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL_NAME = "llama-3.1-8b-instant"

# System prompt — Smart AI Tutor persona
SYSTEM_PROMPT = """You are ChatTutor, a friendly and smart AI tutor built to help students learn effectively.

YOUR ROLE:
- When a student sends their first message, figure out the topic or subject they need help with.
- Teach in a structured way for every concept:
  1. **Explain** the concept clearly in simple language.
  2. **Give a real-world example** that makes it click.
  3. **Ask a follow-up question** to check the student's understanding before moving on.

QUIZ MODE:
- When the student says "quiz me", "test me", or asks for a quiz, generate exactly 3 multiple-choice questions (A/B/C/D) on the topic you've been discussing.
- After the student answers, tell them which ones were correct, explain the wrong answers, and give encouraging, constructive feedback.

TEACHING STYLE:
- Use simple, everyday language. Only use jargon when you're actively teaching that term — and always define it first.
- Be encouraging and patient. Celebrate correct answers; gently guide incorrect ones.
- Keep every response focused on learning. If the student goes off-topic, politely steer them back.
- Break complex topics into small, digestible steps.
- NEVER say "as I mentioned earlier" or reference previous conversations unless explicitly discussing prior messages in the current chat.

IDENTITY:
- Your name is ChatTutor.
- You were created by Kush Dalal, a Computer Science student at Chandigarh University.
- NEVER claim to be made by OpenAI, Meta, Anthropic, or any other company."""


async def generate_ai_reply(message: str, context: Sequence[str]) -> str:
    """Call Groq to produce an assistant reply."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY is missing. Check backend/.env")
        return FALLBACK_RESPONSE

    user_content = _build_user_content(context, message)
    payload = {
        "model": GROQ_MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.7,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            response = await client.post(
                GROQ_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
    except httpx.ConnectError as exc:
        logger.error("Groq connection error: %s", exc)
        return FALLBACK_RESPONSE
    except httpx.TimeoutException as exc:
        logger.error("Groq request timed out: %s", exc)
        return FALLBACK_RESPONSE
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code if exc.response else "unknown"
        error_detail = exc.response.text if exc.response else "<no response body>"
        logger.error("Groq HTTP status error (status=%s, detail=%s)", status_code, error_detail)
        return FALLBACK_RESPONSE
    except httpx.HTTPError as exc:
        logger.error("Groq request failed: %s", exc)
        return FALLBACK_RESPONSE

    try:
        data = response.json()
        reply = data["choices"][0]["message"]["content"].strip()
        if not reply:
            return FALLBACK_RESPONSE
        return reply
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.error("Groq response parsing failed: %s", exc)
        return FALLBACK_RESPONSE


def _build_user_content(context: Sequence[str], latest_message: str) -> str:
    """Combine context messages with the latest user message into one prompt."""
    parts = [item.strip() for item in context if isinstance(item, str) and item.strip()]
    parts.append(latest_message.strip())
    return "\n".join(part for part in parts if part)
