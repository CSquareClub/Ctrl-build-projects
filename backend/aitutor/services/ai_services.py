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
QUIZ_TOPIC_PATTERNS = (
    re.compile(r"(?:make|create|generate)\s+(?:me\s+)?(?:a\s+)?quiz\s+(?:on|about)\s+(.+)", re.IGNORECASE),
    re.compile(r"quiz\s+me\s+(?:on|about)\s+(.+)", re.IGNORECASE),
    re.compile(r"test\s+me\s+(?:on|about)\s+(.+)", re.IGNORECASE),
)
FLASHCARD_TOPIC_PATTERNS = (
    re.compile(
        r"(?:make|create|generate)\s+(?:me\s+)?(?:some\s+)?flash\s*cards?\s+(?:on|about|for)\s+(.+)",
        re.IGNORECASE,
    ),
    re.compile(r"flash\s*cards?\s+(?:on|about|for)\s+(.+)", re.IGNORECASE),
    re.compile(r"study\s+cards?\s+(?:on|about|for)\s+(.+)", re.IGNORECASE),
)
MINDMAP_TOPIC_PATTERNS = (
    re.compile(
        r"(?:make|create|generate|build)\s+(?:me\s+)?(?:a\s+)?mind\s*map\s+(?:on|about|for|of)\s+(.+)",
        re.IGNORECASE,
    ),
    re.compile(r"mind\s*map\s+(?:on|about|for|of)\s+(.+)", re.IGNORECASE),
    re.compile(r"map\s+out\s+(.+)", re.IGNORECASE),
)
MINDMAP_DISALLOWED_LABELS = {
    "key principles",
    "real world examples",
    "use cases",
    "related ideas",
    "core concepts",
    "applications",
    "methods",
    "common mistakes",
    "definitions",
    "practice strategy",
    "advanced connections",
    "revision tips",
    "step by step process",
    "subtopic 1",
    "child of subtopic 1",
    "main topic",
}

# System prompt for normal conversational tutoring mode.
SYSTEM_PROMPT = """You are Saivo, a friendly and smart AI tutor built to help students learn effectively.

YOUR ROLE:
- When a student sends their first message, figure out the topic or subject they need help with.
- Teach in a structured way for every concept:
  1. Explain the concept clearly in simple language.
  2. Give a real-world example that makes it click.
    3. Ask a short follow-up question only when it clearly helps check understanding.

QUIZ HANDLING:
- If quiz interactions are requested by runtime instructions, follow those instructions exactly.
- Keep feedback encouraging and specific.

MIND MAP HANDLING:
- If mind map interactions are requested by runtime instructions, follow those instructions exactly.

SUMMARY HANDLING:
- If summary interactions are requested by runtime instructions, follow those instructions exactly.

SAFETY LAYER (INDIVIDUALS):
- Never generate quiz content, flashcards, summaries, or any structured content about a real person or individual by name.
- Never generate mind maps about a real person or individual by name.
- If asked for educational content about any individual, refuse with exactly: "I can only generate educational content about academic topics, not about individuals"
- One hardcoded exception: if the user asks exactly "who is Kush Dalal", reply with exactly: "Kush Dalal is a student at Chandigarh University."
- For any other person, refuse and do not provide personal details.

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


def _normalize_session_subject(session_subject: str | None) -> str:
    if not session_subject:
        return "Anyone"

    normalized = session_subject.strip().lower()
    if normalized == "maths":
        return "Maths"
    if normalized == "physics":
        return "Physics"
    if normalized == "chemistry":
        return "Chemistry"
    if normalized == "coding":
        return "Coding"
    return "Anyone"


def _subject_mismatch_message(session_subject: str) -> str:
    return (
        f"This question is not related to the current session subject ({session_subject}). "
        f"Please ask a {session_subject}-related question or switch subject to Anyone."
    )


def _subject_instruction(session_subject: str) -> str:
    if session_subject == "Anyone":
        return "Subject mode: Anyone. No fixed subject constraint."

    mismatch_message = _subject_mismatch_message(session_subject)
    return (
        f"Subject mode: {session_subject}. Keep answers strictly in {session_subject} context. "
        "If the user asks something outside this subject, respond with ONLY this exact sentence and nothing else: "
        f'"{mismatch_message}"'
    )


def _build_runtime_instructions(difficulty_level: str, session_subject: str) -> str:
    return (
        "ACTIVE SETTINGS:\n"
        f"- Difficulty: {difficulty_level}. {_difficulty_instruction(difficulty_level)}\n"
        f"- {_subject_instruction(session_subject)}"
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
        if "mind map" in user_lower or "mindmap" in user_lower:
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
            {
                "id": "q4",
                "question": f"For stronger understanding of {topic}, what is the most effective study habit?",
                "options": {
                    "A": "Practice in small regular sessions.",
                    "B": "Study only when deadlines are close.",
                    "C": "Skip revision after class.",
                    "D": "Rely only on videos without practice.",
                },
                "correct_option": "A",
                "explanation": "Regular spaced practice builds durable understanding.",
            },
            {
                "id": "q5",
                "question": f"Which approach best helps apply {topic} in exams or projects?",
                "options": {
                    "A": "Memorize answers without understanding.",
                    "B": "Solve varied problems and review mistakes.",
                    "C": "Avoid difficult questions completely.",
                    "D": "Ignore feedback after attempts.",
                },
                "correct_option": "B",
                "explanation": "Varied practice and error review improve application skills.",
            },
        ],
    }


def _extract_quiz_topic(message: str) -> str | None:
    lowered = message.lower()
    for pattern in QUIZ_TOPIC_PATTERNS:
        match = pattern.search(message)
        if not match:
            continue

        candidate = match.group(1).strip(" .,!?:;\n\t")
        if candidate:
            return candidate[:120]

    # Handle simple forms like "quiz on photosynthesis"
    on_match = re.search(r"\b(?:quiz|test)\b\s+(?:on|about)\s+(.+)", message, re.IGNORECASE)
    if on_match:
        candidate = on_match.group(1).strip(" .,!?:;\n\t")
        if candidate:
            return candidate[:120]

    return None


def _extract_flashcard_topic(message: str) -> str | None:
    for pattern in FLASHCARD_TOPIC_PATTERNS:
        match = pattern.search(message)
        if not match:
            continue

        candidate = match.group(1).strip(" .,!?:;\n\t")
        if candidate:
            return candidate[:120]

    # Handle compact forms like "flashcards on photosynthesis"
    compact_match = re.search(r"\bflash\s*cards?\b\s+(?:on|about|for)\s+(.+)", message, re.IGNORECASE)
    if compact_match:
        candidate = compact_match.group(1).strip(" .,!?:;\n\t")
        if candidate:
            return candidate[:120]

    return None


def _extract_mindmap_topic(message: str) -> str | None:
    for pattern in MINDMAP_TOPIC_PATTERNS:
        match = pattern.search(message)
        if not match:
            continue

        candidate = match.group(1).strip(" .,!?:;\n\t")
        if candidate:
            return candidate[:120]

    compact_match = re.search(r"\bmind\s*map\b\s+(?:on|about|for|of)\s+(.+)", message, re.IGNORECASE)
    if compact_match:
        candidate = compact_match.group(1).strip(" .,!?:;\n\t")
        if candidate:
            return candidate[:120]

    return None


def _extract_refusal_text(raw_reply: str) -> str | None:
    stripped = raw_reply.strip()
    if not stripped:
        return None

    lowered = stripped.lower()
    refusal_hints = (
        "not study",
        "not education",
        "non-educational",
        "outside educational",
        "outside study",
        "i can only help with educational",
        "i can only create quizzes on educational",
        "please provide an educational",
    )

    if any(hint in lowered for hint in refusal_hints):
        return stripped

    return None


def _convert_option_list_to_map(option_list: list[Any]) -> dict[str, str]:
    options: dict[str, str] = {}
    for index, raw_option in enumerate(option_list[:4]):
        if not isinstance(raw_option, str):
            continue

        label = OPTION_KEYS[index]
        option_text = raw_option.strip()
        prefix = f"{label}."
        if option_text[:2].upper() == prefix:
            option_text = option_text[2:].strip()

        if option_text:
            options[label] = option_text

    return options


def _normalize_quiz_payload(payload: dict[str, Any] | None, topic: str) -> dict[str, Any]:
    fallback = _fallback_quiz_payload(topic)
    if not isinstance(payload, dict):
        return fallback

    if str(payload.get("type", "")).strip().lower() != "quiz":
        return fallback

    raw_questions = payload.get("questions")
    if not isinstance(raw_questions, list) or len(raw_questions) < 5:
        return fallback

    normalized_questions: list[dict[str, Any]] = []
    for index, raw_question in enumerate(raw_questions[:5], start=1):
        if not isinstance(raw_question, dict):
            continue

        question_text = str(raw_question.get("question", "")).strip()

        raw_options = raw_question.get("options", {})
        options: dict[str, str] = {}
        if isinstance(raw_options, list):
            options = _convert_option_list_to_map(raw_options)
        elif isinstance(raw_options, dict):
            for key in OPTION_KEYS:
                value = raw_options.get(key)
                if isinstance(value, str) and value.strip():
                    options[key] = value.strip()

        if len(options) != 4 or not question_text:
            continue

        correct_option = _normalize_option_label(
            str(raw_question.get("correct", raw_question.get("correct_option", "A")))
        )
        if correct_option not in options:
            correct_option = "A"

        normalized_questions.append(
            {
                "id": f"q{index}",
                "question": question_text,
                "options": options,
                "correct_option": correct_option,
                "explanation": "This option best matches the concept being tested.",
            }
        )

    if len(normalized_questions) != 5:
        return fallback

    topic_value = str(payload.get("topic", "")).strip() or topic
    return {
        "type": "quiz",
        "topic": topic_value,
        "questions": normalized_questions,
    }


def _fallback_flashcard_payload(topic: str) -> dict[str, Any]:
    return {
        "type": "flashcard",
        "topic": topic,
        "cards": [
            {
                "id": "c1",
                "front": f"What is the core idea of {topic}?",
                "back": "Understand the main concept first, then build details step by step.",
            },
            {
                "id": "c2",
                "front": f"Why is {topic} important for learners?",
                "back": "It helps solve problems by connecting theory with practical application.",
            },
            {
                "id": "c3",
                "front": f"Name one effective way to practice {topic}.",
                "back": "Use short daily practice sessions with active recall questions.",
            },
            {
                "id": "c4",
                "front": f"What is a common mistake while studying {topic}?",
                "back": "Memorizing without understanding definitions, examples, and relationships.",
            },
            {
                "id": "c5",
                "front": f"How can you retain {topic} for longer?",
                "back": "Review with spaced repetition and explain concepts in your own words.",
            },
        ],
    }


def _normalize_flashcard_payload(payload: dict[str, Any] | None, topic: str) -> dict[str, Any]:
    fallback = _fallback_flashcard_payload(topic)
    if not isinstance(payload, dict):
        return fallback

    if str(payload.get("type", "")).strip().lower() != "flashcard":
        return fallback

    raw_cards = payload.get("cards")
    if not isinstance(raw_cards, list) or len(raw_cards) < 5:
        return fallback

    normalized_cards: list[dict[str, str]] = []
    for index, raw_card in enumerate(raw_cards[:5], start=1):
        if not isinstance(raw_card, dict):
            continue

        front = str(raw_card.get("front", "")).strip()
        back = str(raw_card.get("back", "")).strip()
        if not front or not back:
            continue

        normalized_cards.append(
            {
                "id": f"c{index}",
                "front": front,
                "back": back,
            }
        )

    if len(normalized_cards) != 5:
        return fallback

    topic_value = str(payload.get("topic", "")).strip() or topic
    return {
        "type": "flashcard",
        "topic": topic_value,
        "cards": normalized_cards,
    }


def _fallback_mindmap_payload(topic: str) -> dict[str, Any]:
    return {
        "type": "mindmap",
        "topic": topic,
        "nodes": [
            {"id": "1", "label": topic, "parent": None},
            {"id": "2", "label": f"Definition of {topic}", "parent": "1"},
            {"id": "3", "label": f"Classification in {topic}", "parent": "1"},
            {"id": "4", "label": f"Mechanisms behind {topic}", "parent": "1"},
            {"id": "5", "label": f"Problem-solving with {topic}", "parent": "1"},
            {"id": "6", "label": f"Frequent errors in {topic}", "parent": "1"},
            {"id": "7", "label": f"Terminology used in {topic}", "parent": "2"},
            {"id": "8", "label": f"Foundational assumptions of {topic}", "parent": "2"},
            {"id": "9", "label": f"Main categories in {topic}", "parent": "3"},
            {"id": "10", "label": "Comparison between categories", "parent": "3"},
            {"id": "11", "label": "Core process steps", "parent": "4"},
            {"id": "12", "label": "Variables that affect outcomes", "parent": "4"},
            {"id": "13", "label": f"Exam-style questions on {topic}", "parent": "5"},
            {"id": "14", "label": "Worked example structure", "parent": "5"},
            {"id": "15", "label": "Common student misconceptions", "parent": "6"},
            {"id": "16", "label": "How to correct misconceptions", "parent": "6"},
        ],
    }


def _normalize_label_token(label: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", label.lower())).strip()


def _is_generic_mindmap_label(label: str) -> bool:
    normalized_label = _normalize_label_token(label)
    if not normalized_label:
        return True

    if normalized_label in MINDMAP_DISALLOWED_LABELS:
        return True

    if normalized_label.startswith("subtopic ") or normalized_label.startswith("child of subtopic"):
        return True

    return False


def _normalize_mindmap_payload(payload: dict[str, Any] | None, topic: str) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    if str(payload.get("type", "")).strip().lower() != "mindmap":
        return None

    raw_nodes = payload.get("nodes")
    if not isinstance(raw_nodes, list) or len(raw_nodes) < 9:
        return None

    normalized_nodes: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for raw_node in raw_nodes:
        if not isinstance(raw_node, dict):
            continue

        node_id = str(raw_node.get("id", "")).strip()
        label = str(raw_node.get("label", "")).strip()
        parent_raw = raw_node.get("parent")
        parent = None if parent_raw is None else str(parent_raw).strip()

        if not node_id or not label or node_id in seen_ids:
            continue

        seen_ids.add(node_id)
        normalized_nodes.append(
            {
                "id": node_id,
                "label": label,
                "parent": parent if parent else None,
            }
        )

    if len(normalized_nodes) < 9:
        return None

    node_ids = {node["id"] for node in normalized_nodes}
    root_nodes = [node for node in normalized_nodes if node["parent"] is None]
    if len(root_nodes) != 1:
        return None

    for node in normalized_nodes:
        parent = node.get("parent")
        if parent is None:
            continue
        if parent not in node_ids or parent == node["id"]:
            return None

    root_id = root_nodes[0]["id"]
    branch_nodes = [node for node in normalized_nodes if node.get("parent") == root_id]
    if len(branch_nodes) < 4:
        return None

    children_by_parent: dict[str, list[dict[str, Any]]] = {}
    for node in normalized_nodes:
        parent_id = node.get("parent")
        if parent_id is None:
            continue
        children_by_parent.setdefault(parent_id, []).append(node)

    if any(len(children_by_parent.get(branch["id"], [])) < 1 for branch in branch_nodes):
        return None

    topic_value = str(payload.get("topic", "")).strip() or topic
    topic_token = _normalize_label_token(topic_value)

    for node in normalized_nodes:
        label_token = _normalize_label_token(node["label"])
        if node["id"] != root_id and label_token == topic_token:
            return None
        if node["id"] != root_id and _is_generic_mindmap_label(node["label"]):
            return None

    return {
        "type": "mindmap",
        "topic": topic_value,
        "nodes": normalized_nodes,
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
        session_subject="Anyone",
    )


async def generate_ai_reply_with_mode(
    message: str,
    context: Sequence[str],
    difficulty_level: str,
    session_subject: str = "Anyone",
) -> str:
    """Generate a normal tutor response with active difficulty and subject settings."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    normalized_subject = _normalize_session_subject(session_subject)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, normalized_subject)
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
    session_subject: str = "Anyone",
) -> dict[str, Any]:
    """Generate a structured 5-question MCQ quiz payload."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    normalized_subject = _normalize_session_subject(session_subject)
    topic = _extract_quiz_topic(message) or _infer_topic_from_context(context)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, normalized_subject)

    quiz_system_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{runtime_instructions}\n\n"
        "You are creating quizzes for study and education use only.\n"
        "Never generate quizzes about real people or individuals by name.\n"
        "If the request is about any individual, respond with exactly: \"I can only generate educational content about academic topics, not about individuals\"\n"
        "Step 1: Verify whether the requested topic is study or education related.\n"
        "If it is NOT study/education related, politely refuse in one short sentence.\n"
        "Step 2: If the topic is valid, return the quiz in this exact JSON format and nothing else:\n"
        "{\n"
        "  \"type\": \"quiz\",\n"
        "  \"topic\": \"topic name\",\n"
        "  \"questions\": [\n"
        "    {\n"
        "      \"question\": \"question text\",\n"
        "      \"options\": [\"A. option1\", \"B. option2\", \"C. option3\", \"D. option4\"],\n"
        "      \"correct\": \"A\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Generate exactly 5 questions.\n"
        "Return only JSON for valid topics, with no markdown and no extra text."
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

    if not raw_reply:
        return _fallback_quiz_payload(topic)

    parsed = _parse_json_object(raw_reply)
    if not parsed:
        refusal = _extract_refusal_text(raw_reply)
        if refusal:
            return {
                "type": "text",
                "content": refusal,
            }

        if "{" not in raw_reply and "[" not in raw_reply:
            return {
                "type": "text",
                "content": raw_reply.strip(),
            }

        return _fallback_quiz_payload(topic)

    if str(parsed.get("type", "")).strip().lower() != "quiz":
        refusal = str(parsed.get("content", "")).strip()
        if refusal:
            return {
                "type": "text",
                "content": refusal,
            }

    return _normalize_quiz_payload(parsed, topic)


async def generate_flashcard_payload(
    message: str,
    context: Sequence[str],
    difficulty_level: str,
    session_subject: str = "Anyone",
) -> dict[str, Any]:
    """Generate a structured 5-card flashcard payload."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    normalized_subject = _normalize_session_subject(session_subject)
    topic = _extract_flashcard_topic(message) or _infer_topic_from_context(context)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, normalized_subject)

    flashcard_system_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{runtime_instructions}\n\n"
        "You are creating flashcards for study and education use only.\n"
        "Never generate flashcards about real people or individuals by name.\n"
        "If the request is about any individual, respond with exactly: \"I can only generate educational content about academic topics, not about individuals\"\n"
        "Step 1: Verify whether the requested topic is study or education related.\n"
        "If it is NOT study/education related, politely refuse in one short sentence.\n"
        "Step 2: If the topic is valid, return the flashcards in this exact JSON format and nothing else:\n"
        "{\n"
        "  \"type\": \"flashcard\",\n"
        "  \"topic\": \"topic name\",\n"
        "  \"cards\": [\n"
        "    {\n"
        "      \"front\": \"prompt/question side\",\n"
        "      \"back\": \"answer/explanation side\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Generate exactly 5 cards.\n"
        "Return only JSON for valid topics, with no markdown and no extra text."
    )

    flashcard_user_prompt = (
        f"Current topic for flashcards: {topic}\n"
        f"User request: {message}\n"
        "Generate the flashcards now."
    )

    raw_reply = await _call_groq(
        messages=[
            {"role": "system", "content": flashcard_system_prompt},
            {"role": "user", "content": flashcard_user_prompt},
        ],
        temperature=0.5,
    )

    if not raw_reply:
        return _fallback_flashcard_payload(topic)

    parsed = _parse_json_object(raw_reply)
    if not parsed:
        refusal = _extract_refusal_text(raw_reply)
        if refusal:
            return {
                "type": "text",
                "content": refusal,
            }

        if "{" not in raw_reply and "[" not in raw_reply:
            return {
                "type": "text",
                "content": raw_reply.strip(),
            }

        return _fallback_flashcard_payload(topic)

    if str(parsed.get("type", "")).strip().lower() != "flashcard":
        refusal = str(parsed.get("content", "")).strip()
        if refusal:
            return {
                "type": "text",
                "content": refusal,
            }

    return _normalize_flashcard_payload(parsed, topic)


async def generate_mindmap_payload(
    message: str,
    context: Sequence[str],
    difficulty_level: str,
    session_subject: str = "Anyone",
) -> dict[str, Any]:
    """Generate a structured mind map payload."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    normalized_subject = _normalize_session_subject(session_subject)
    topic = _extract_mindmap_topic(message) or _infer_topic_from_context(context)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, normalized_subject)

    mindmap_system_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{runtime_instructions}\n\n"
        "You are creating mind maps for study and education use only.\n"
        "Never generate mind maps about real people or individuals by name.\n"
        "If the request is about any individual, respond with exactly: \"I can only generate educational content about academic topics, not about individuals\"\n"
        "CONTENT QUALITY RULES (MANDATORY):\n"
        "- Every node label must be a real, meaningful academic concept directly related to the topic.\n"
        "- Never use vague or filler labels such as \"Key Principles\", \"Real-world Examples\", \"Use Cases\", \"Related Ideas\", \"Core Concepts\", \"Applications\", \"Methods\", or \"Definitions\".\n"
        "- Each first-level branch must be a specific actual subtopic (not a template heading).\n"
        "- Children of each branch must be more specific facts, mechanisms, or subtopics under that branch.\n"
        "- The mind map must read like actual study notes, not a reusable generic template.\n"
        "Example for topic \"Data Types in Java\": good first-level branches include \"Primitive Types\", \"Reference Types\", \"Type Casting\", \"Wrapper Classes\", \"String Type\".\n"
        "Step 1: Verify whether the requested topic is study or education related.\n"
        "If it is NOT study/education related, politely refuse in one short sentence.\n"
        "Step 2: If the topic is valid, return the mind map in this exact JSON format and nothing else:\n"
        "{\n"
        "  \"type\": \"mindmap\",\n"
        "  \"topic\": \"main topic\",\n"
        "  \"nodes\": [\n"
        "    {\n"
        "      \"id\": \"1\",\n"
        "      \"label\": \"Data Types in Java\",\n"
        "      \"parent\": null\n"
        "    },\n"
        "    {\n"
        "      \"id\": \"2\",\n"
        "      \"label\": \"Primitive Types\",\n"
        "      \"parent\": \"1\"\n"
        "    },\n"
        "    {\n"
        "      \"id\": \"3\",\n"
        "      \"label\": \"int, float, char, boolean\",\n"
        "      \"parent\": \"2\"\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Generate exactly 1 root node, 4-6 main branches, and at least 2 children per branch.\n"
        "Return only JSON for valid topics, with no markdown and no extra text."
    )

    mindmap_user_prompt = (
        f"Current topic for mind map: {topic}\n"
        f"User request: {message}\n"
        "Generate the mind map now."
    )

    retry_user_prompt = (
        f"Current topic for mind map: {topic}\n"
        f"User request: {message}\n"
        "Your previous answer was rejected for being too generic or template-like.\n"
        "Regenerate with concrete, topic-specific academic subtopics only and strict parent-child logic.\n"
        "Do not use labels such as Key Principles, Real-world Examples, Use Cases, Related Ideas, Core Concepts, Applications, Methods, or Definitions.\n"
        "Generate the mind map now."
    )

    prompts = [mindmap_user_prompt, retry_user_prompt]
    for prompt_index, user_prompt in enumerate(prompts):
        raw_reply = await _call_groq(
            messages=[
                {"role": "system", "content": mindmap_system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
        )

        if not raw_reply:
            continue

        parsed = _parse_json_object(raw_reply)
        if not parsed:
            refusal = _extract_refusal_text(raw_reply)
            if refusal:
                return {
                    "type": "text",
                    "content": refusal,
                }

            if "{" not in raw_reply and "[" not in raw_reply:
                if prompt_index == len(prompts) - 1:
                    return {
                        "type": "text",
                        "content": raw_reply.strip(),
                    }
                continue

            continue

        if str(parsed.get("type", "")).strip().lower() != "mindmap":
            refusal = str(parsed.get("content", "")).strip()
            if refusal:
                return {
                    "type": "text",
                    "content": refusal,
                }
            continue

        normalized = _normalize_mindmap_payload(parsed, topic)
        if normalized:
            return normalized

    return _fallback_mindmap_payload(topic)


async def generate_summary_payload(
    message: str,
    context: Sequence[str],
    difficulty_level: str,
    session_subject: str = "Anyone",
) -> dict[str, Any]:
    """Generate a structured concept summary payload."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    normalized_subject = _normalize_session_subject(session_subject)
    topic = _infer_topic_from_context(context)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, normalized_subject)

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
    session_subject: str = "Anyone",
) -> str:
    """Generate AI feedback for a selected quiz answer."""
    normalized_difficulty = _normalize_difficulty(difficulty_level)
    normalized_subject = _normalize_session_subject(session_subject)
    runtime_instructions = _build_runtime_instructions(normalized_difficulty, normalized_subject)

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
        "3) One practical tip."
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
