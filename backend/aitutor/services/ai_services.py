"""Groq OpenAI-compatible integration for AI-generated replies."""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Sequence

import httpx


logger = logging.getLogger(__name__)

FALLBACK_RESPONSE = "I'm having trouble responding right now. Please try again."
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL_NAME = "llama-3.1-8b-instant"
OPTION_KEYS = ("A", "B", "C", "D")

# System prompt for normal conversational tutoring mode.
SYSTEM_PROMPT = """You are Saivo, a friendly and smart AI tutor built to help students learn effectively.

YOUR ROLE:
- When a student sends their first message, figure out the topic or subject they need help with.
- Teach in a structured way for every concept:
  1. Explain the concept clearly in simple language.
  2. Give a real-world example that makes it click.
  3. Ask a follow-up question to check understanding when guided learning is enabled.

QUIZ HANDLING:
- If quiz interactions are requested by runtime instructions, follow those instructions exactly.
- Keep feedback encouraging and specific.

SUMMARY HANDLING:
- If summary interactions are requested by runtime instructions, follow those instructions exactly.

TEACHING STYLE:
- Use simple, everyday language. Only use jargon when teaching that term, and define it first.
- Be encouraging and patient. Celebrate correct answers; gently guide incorrect ones.
- Keep every response focused on learning. If the student goes off-topic, politely steer them back.
- Break complex topics into small, digestible steps.
- NEVER say "as I mentioned earlier" or reference previous conversations unless explicitly discussing prior messages in the current chat.

IDENTITY:
- Your name is Saivo.
- You were created by Kush Dalal, a Computer Science student at Chandigarh University.
- NEVER claim to be made by OpenAI, Meta, Anthropic, or any other company."""


def _normalize_difficulty(difficulty_level: str | None) -> str:
    if not difficulty_level:
        return "Neutral"

    normalized = difficulty_level.strip().lower()
    if normalized == "neutral":
        return "Neutral"
    if normalized == "advanced":
        return "Advanced"
    if normalized == "intermediate":
        return "Intermediate"
    if normalized == "beginner":
        return "Beginner"
    return "Neutral"


def _difficulty_instruction(difficulty_level: str) -> str:
    if difficulty_level == "Neutral":
        return "Respond naturally without adding any explicit difficulty framing."
    if difficulty_level == "Advanced":
        return (
            "Use deeper technical depth, include edge cases and tradeoffs, "
            "and introduce precise terminology with compact definitions."
        )
    if difficulty_level == "Intermediate":
        return (
            "Assume basic familiarity. Explain core ideas and practical details "
            "without excessive simplification."
        )
    return (
        "Assume the learner is new. Use very simple language, clear step-by-step "
        "teaching, and avoid unnecessary jargon."
    )


def _guided_instruction(guided_learning: bool) -> str:
    if guided_learning:
        return (
            "Guided Learning is ON. End each teaching response with exactly one "
            "short follow-up question that checks understanding."
        )
    return "Guided Learning is OFF. Do not force a follow-up question."


def _build_runtime_instructions(difficulty_level: str, guided_learning: bool) -> str:
    return (
        "ACTIVE SETTINGS:\n"
        f"- Difficulty: {difficulty_level}. {_difficulty_instruction(difficulty_level)}\n"
        f"- {_guided_instruction(guided_learning)}"
    )


def _sanitize_json_text(raw_text: str) -> str:
    text = raw_text.strip()

    fenced_match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, flags=re.DOTALL)
    if fenced_match:
        return fenced_match.group(1).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]

    return text


def _parse_json_object(raw_text: str) -> dict[str, Any] | None:
    candidate = _sanitize_json_text(raw_text)
    try:
        payload = json.loads(candidate)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError as exc:
        logger.error("JSON parsing failed: %s", exc)
    return None


def _normalize_option_label(option_label: str) -> str:
    normalized = option_label.strip().upper()
    return normalized[0] if normalized and normalized[0] in OPTION_KEYS else "A"


def _infer_topic_from_context(context: Sequence[str]) -> str:
    for entry in reversed(context):
        if not isinstance(entry, str):
            continue
        lowered = entry.lower().strip()
        if not lowered.startswith("user:"):
            continue

        user_text = entry.split(":", 1)[1].strip()
        user_lower = user_text.lower()
        if not user_text:
            continue
        if "quiz me" in user_lower or "test me" in user_lower:
            continue
        if "summarize" in user_lower:
            continue
        return user_text[:120]

    return "the current topic"


def _fallback_quiz_payload(topic: str) -> dict[str, Any]:
    return {
        "type": "quiz",
        "topic": topic,
        "questions": [
            {
                "id": "q1",
                "question": f"Which statement best describes the core idea of {topic}?",
                "options": {
                    "A": "It is mainly about understanding fundamental concepts.",
                    "B": "It only focuses on memorizing formulas.",
                    "C": "It cannot be applied to real problems.",
                    "D": "It is useful only for experts.",
                },
                "correct_option": "A",
                "explanation": "The strongest foundation starts with understanding core concepts.",
            },
            {
                "id": "q2",
                "question": f"When learning {topic}, what is usually the best next step after understanding basics?",
                "options": {
                    "A": "Skip to the hardest topic immediately.",
                    "B": "Apply the concept through examples and practice.",
                    "C": "Avoid asking questions.",
                    "D": "Ignore feedback from mistakes.",
                },
                "correct_option": "B",
                "explanation": "Practice with examples helps move ideas from theory to usable skill.",
            },
            {
                "id": "q3",
                "question": f"What improves retention most while studying {topic}?",
                "options": {
                    "A": "Reading passively once.",
                    "B": "Waiting until exams to review.",
                    "C": "Active recall and spaced revision.",
                    "D": "Avoiding difficult questions.",
                },
                "correct_option": "C",
                "explanation": "Active recall and spaced repetition improve long-term understanding.",
            },
        ],
    }


def _normalize_quiz_payload(payload: dict[str, Any] | None, topic: str) -> dict[str, Any]:
    fallback = _fallback_quiz_payload(topic)
    if not isinstance(payload, dict):
        return fallback

    raw_questions = payload.get("questions")
    if not isinstance(raw_questions, list) or len(raw_questions) < 3:
        return fallback

    normalized_questions: list[dict[str, Any]] = []
    for index, raw_question in enumerate(raw_questions[:3], start=1):
        if not isinstance(raw_question, dict):
            continue

        question_text = str(raw_question.get("question", "")).strip()
        explanation = str(raw_question.get("explanation", "")).strip()

        raw_options = raw_question.get("options", {})
        options: dict[str, str] = {}
        if isinstance(raw_options, dict):
            for key in OPTION_KEYS:
                value = raw_options.get(key)
                if isinstance(value, str) and value.strip():
                    options[key] = value.strip()

        if len(options) != 4 or not question_text:
            continue

        correct_option = _normalize_option_label(str(raw_question.get("correct_option", "A")))
        if correct_option not in options:
            correct_option = "A"

        normalized_questions.append(
            {
                "id": f"q{index}",
                "question": question_text,
                "options": options,
                "correct_option": correct_option,
                "explanation": explanation or "This option best matches the concept being tested.",
            }
        )

    if len(normalized_questions) != 3:
        return fallback

    topic_value = str(payload.get("topic", "")).strip() or topic
    return {
        "type": "quiz",
        "topic": topic_value,
        "questions": normalized_questions,
    }


def _fallback_summary_payload(topic: str) -> dict[str, Any]:
    return {
        "type": "summary",
        "topic": topic,
        "one_line_definition": f"{topic} is a concept that helps solve problems through clear, structured understanding.",
        "key_points": [
            "Start with the core idea before jumping into advanced details.",
            "Use practical examples to connect theory with real situations.",
            "Check understanding with short questions or quick practice.",
        ],
    }


def _normalize_summary_payload(payload: dict[str, Any] | None, topic: str) -> dict[str, Any]:
    fallback = _fallback_summary_payload(topic)
    if not isinstance(payload, dict):
        return fallback

    topic_value = str(payload.get("topic", "")).strip() or topic
    one_line_definition = str(payload.get("one_line_definition", "")).strip()

    raw_key_points = payload.get("key_points", [])
    key_points: list[str] = []
    if isinstance(raw_key_points, list):
        for item in raw_key_points:
            if isinstance(item, str) and item.strip():
                key_points.append(item.strip())

    if not one_line_definition:
        one_line_definition = fallback["one_line_definition"]

    if not key_points:
        key_points = fallback["key_points"]

    return {
        "type": "summary",
        "topic": topic_value,
        "one_line_definition": one_line_definition,
        "key_points": key_points[:5],
    }


def _build_user_content(context: Sequence[str], latest_message: str) -> str:
    """Combine context messages with the latest user message into one prompt."""
    parts = [item.strip() for item in context if isinstance(item, str) and item.strip()]
    parts.append(latest_message.strip())
    return "\n".join(part for part in parts if part)


async def _call_groq(messages: list[dict[str, str]], temperature: float = 0.7) -> str | None:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY is missing. Check backend/.env")
        return None

    payload = {
        "model": GROQ_MODEL_NAME,
        "messages": messages,
        "temperature": temperature,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0)) as client:
            response = await client.post(
                GROQ_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
    except httpx.ConnectError as exc:
        logger.error("Groq connection error: %s", exc)
        return None
    except httpx.TimeoutException as exc:
        logger.error("Groq request timed out: %s", exc)
        return None
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code if exc.response else "unknown"
        error_detail = exc.response.text if exc.response else "<no response body>"
        logger.error("Groq HTTP status error (status=%s, detail=%s)", status_code, error_detail)
        return None
    except httpx.HTTPError as exc:
        logger.error("Groq request failed: %s", exc)
        return None

    try:
        data = response.json()
        reply = data["choices"][0]["message"]["content"].strip()
        return reply or None
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.error("Groq response parsing failed: %s", exc)
        return None


async def generate_ai_reply(message: str, context: Sequence[str]) -> str:
    """Call Groq to produce an assistant reply."""
    return await generate_ai_reply_with_mode(
        message=message,
        context=context,
        difficulty_level="Neutral",
        guided_learning=False,
    )


async def generate_ai_reply_with_mode(
    message: str,
    context: Sequence[str],
    difficulty_level: str,
    guided_learning: bool,
) -> str:
    """Generate a normal tutor response with active difficulty and guided settings."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, guided_learning)
    user_content = _build_user_content(context, message)
    full_system_prompt = f"{SYSTEM_PROMPT}\n\n{runtime_instructions}"
    reply = await _call_groq(
        messages=[
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": user_content},
        ],
        temperature=0.7,
    )
    return reply or FALLBACK_RESPONSE


async def generate_quiz_payload(
    message: str,
    context: Sequence[str],
    difficulty_level: str,
    guided_learning: bool,
) -> dict[str, Any]:
    """Generate a structured 3-question MCQ quiz payload."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    topic = _infer_topic_from_context(context)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, guided_learning)

    quiz_system_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{runtime_instructions}\n\n"
        "Return ONLY valid JSON. Do not add markdown fences.\n"
        "JSON schema:\n"
        "{\n"
        "  \"type\": \"quiz\",\n"
        "  \"topic\": \"string\",\n"
        "  \"questions\": [\n"
        "    {\n"
        "      \"id\": \"q1\",\n"
        "      \"question\": \"string\",\n"
        "      \"options\": {\"A\": \"string\", \"B\": \"string\", \"C\": \"string\", \"D\": \"string\"},\n"
        "      \"correct_option\": \"A|B|C|D\",\n"
        "      \"explanation\": \"string\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Rules: exactly 3 questions, each with 4 options A-D, one correct option, and one explanation."
    )

    quiz_user_prompt = (
        f"Current topic to quiz: {topic}\n"
        f"User request: {message}\n"
        "Generate the quiz now."
    )

    raw_reply = await _call_groq(
        messages=[
            {"role": "system", "content": quiz_system_prompt},
            {"role": "user", "content": quiz_user_prompt},
        ],
        temperature=0.5,
    )

    parsed = _parse_json_object(raw_reply) if raw_reply else None
    return _normalize_quiz_payload(parsed, topic)


async def generate_summary_payload(
    message: str,
    context: Sequence[str],
    difficulty_level: str,
    guided_learning: bool,
) -> dict[str, Any]:
    """Generate a structured concept summary payload."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    topic = _infer_topic_from_context(context)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, guided_learning)

    summary_system_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{runtime_instructions}\n\n"
        "Return ONLY valid JSON. Do not add markdown fences.\n"
        "JSON schema:\n"
        "{\n"
        "  \"type\": \"summary\",\n"
        "  \"topic\": \"string\",\n"
        "  \"one_line_definition\": \"string\",\n"
        "  \"key_points\": [\"string\", \"string\", \"string\"]\n"
        "}\n"
        "Rules: key_points must contain 3 to 5 concise bullet items."
    )

    summary_user_prompt = (
        f"Current topic to summarize: {topic}\n"
        f"User request: {message}\n"
        "Generate the summary now."
    )

    raw_reply = await _call_groq(
        messages=[
            {"role": "system", "content": summary_system_prompt},
            {"role": "user", "content": summary_user_prompt},
        ],
        temperature=0.4,
    )

    parsed = _parse_json_object(raw_reply) if raw_reply else None
    return _normalize_summary_payload(parsed, topic)


async def generate_quiz_feedback_reply(
    topic: str,
    question: str,
    options: dict[str, str],
    selected_option: str,
    correct_option: str,
    explanation: str,
    difficulty_level: str,
    guided_learning: bool,
) -> str:
    """Generate AI feedback for a selected quiz answer."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, guided_learning)

    safe_selected = _normalize_option_label(selected_option)
    safe_correct = _normalize_option_label(correct_option)
    is_correct = safe_selected == safe_correct
    correct_text = options.get(safe_correct, "")
    selected_text = options.get(safe_selected, "")

    feedback_system_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{runtime_instructions}\n\n"
        "You are grading one quiz answer. Keep the response concise, clear, and encouraging.\n"
        "Structure your response as:\n"
        "1) Verdict line starting with Correct or Not quite.\n"
        "2) Short explanation of why.\n"
        "3) One practical tip.\n"
        "4) Add one follow-up question only when Guided Learning is ON."
    )

    feedback_user_prompt = (
        f"Topic: {topic}\n"
        f"Question: {question}\n"
        f"Selected option: {safe_selected} - {selected_text}\n"
        f"Correct option: {safe_correct} - {correct_text}\n"
        f"Was student correct: {is_correct}\n"
        f"Reference explanation: {explanation}\n"
    )

    reply = await _call_groq(
        messages=[
            {"role": "system", "content": feedback_system_prompt},
            {"role": "user", "content": feedback_user_prompt},
        ],
        temperature=0.5,
    )

    if reply:
        return reply

    if is_correct:
        return (
            "Correct! Nice work. "
            f"{explanation or 'Your choice matches the best answer for this concept.'} "
            "Tip: explain the idea in your own words to lock it in."
        )

    return (
        "Not quite, but good attempt. "
        f"The best answer is {safe_correct}. "
        f"{explanation or 'Review the core idea and compare each option carefully.'} "
        "Tip: eliminate obviously incorrect options first."
    )
