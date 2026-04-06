"""Routes for creating and retrieving chat messages."""
import asyncio
import re
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.database import get_database
from models.message import Message
from schemas.message_schema import (
    CreateMessageRequest,
    MessageResponse,
    QuizAnswerRequest,
    SendMessageRequest,
)
from services.ai_services import (
    generate_mindmap_payload,
    generate_flashcard_payload,
    generate_ai_reply_with_mode,
    generate_quiz_feedback_reply,
    generate_quiz_payload,
    generate_summary_payload,
)
from services.logic_engine import process_logic
# Import the new rename module
from rename import handle_chat_rename


message_router = APIRouter(prefix="/messages", tags=["messages"])
chat_interaction_router = APIRouter(prefix="/chat", tags=["chat"])

# --- SECURITY: Stop marker used to hide remaining text from frontend ---
STOP_MARKER = "[user stopped response]"
QUIZ_ANSWER_PREFIX = "quiz answer:"
SESSION_SUBJECTS = ("Anyone", "Maths", "Physics", "Chemistry", "Coding")
SUBJECT_KEYWORDS = {
    "Maths": (
        "math", "maths", "algebra", "geometry", "calculus", "equation",
        "integral", "integrate", "derivative", "differentiate", "matrix",
        "probability", "statistics", "trigonometry", "sine", "cosine",
        "tangent", "limit", "logarithm", "polynomial", "factorization",
    ),
    "Physics": (
        "physics", "mechanics", "kinematics", "dynamics", "force", "motion",
        "velocity", "acceleration", "momentum", "energy", "work", "power",
        "gravity", "gravitational", "newton", "friction", "torque",
        "thermodynamics", "temperature", "heat", "wave", "optics",
        "electricity", "electric", "magnetism", "magnetic", "circuit",
        "voltage", "current", "resistance", "quantum", "relativity",
    ),
    "Chemistry": (
        "chemistry", "atom", "molecule", "mole", "molar", "reaction",
        "compound", "element", "periodic", "acid", "base", "salt", "ph",
        "ionic", "covalent", "bond", "redox", "oxidation", "reduction",
        "equilibrium", "stoichiometry", "organic", "inorganic", "hydrocarbon",
        "polymer", "titration", "catalyst",
    ),
    "Coding": (
        "code", "coding", "program", "programming", "python", "java",
        "javascript", "c++", "c#", "algorithm", "data structure", "function",
        "variable", "loop", "array", "list", "dictionary", "class", "object",
        "api", "bug", "debug", "compile", "runtime", "script", "sql",
        "database", "frontend", "backend", "recursion", "two sum", "leetcode",
    ),
}
SUBJECT_SUGGESTIONS = {
    "Maths": (
        "Solve a quadratic equation step by step",
        "Explain derivatives with an example",
        "Teach me probability basics",
    ),
    "Physics": (
        "Explain Newton's laws with real-life examples",
        "Solve a velocity-acceleration problem",
        "Teach me basics of electric circuits",
    ),
    "Chemistry": (
        "Explain ionic vs covalent bonding",
        "Teach me acid-base and pH basics",
        "Solve a simple stoichiometry problem",
    ),
    "Coding": (
        "Write Python code for binary search",
        "Explain recursion with a simple example",
        "Teach me time complexity with examples",
    ),
}
PERSONAL_REFUSAL_MESSAGE = "I can only generate educational content about academic topics, not about individuals"
KUSH_IDENTITY_RESPONSE = "Kush Dalal is a student at Chandigarh University."
KUSH_IDENTITY_PATTERN = re.compile(r"^\s*(?:who\s+is|who\'s)\s+kush\s+dalal\s*[?.!]*\s*$", re.IGNORECASE)
PERSONAL_QUERY_PATTERNS = (
    re.compile(r"^\s*(?:who\s+is|who\'s)\s+(.+?)\s*[?.!]*\s*$", re.IGNORECASE),
    re.compile(r"^\s*(?:tell\s+me\s+about|information\s+about|facts\s+about|biography\s+of|bio\s+of)\s+(.+?)\s*[?.!]*\s*$", re.IGNORECASE),
)
STRUCTURED_TARGET_PATTERNS = (
    re.compile(r"\b(?:quiz|test)\b(?:\s+me)?\s+(?:on|about|for)\s+(.+)$", re.IGNORECASE),
    re.compile(r"\b(?:flash\s*cards?|study\s*cards?)\b\s+(?:on|about|for)\s+(.+)$", re.IGNORECASE),
    re.compile(r"\bmind\s*map\b\s+(?:on|about|for|of)\s+(.+)$", re.IGNORECASE),
    re.compile(r"\b(?:make|create|generate|give)\b.*\b(?:quiz|flash\s*cards?|study\s*cards?)\b\s+(?:on|about|for)\s+(.+)$", re.IGNORECASE),
    re.compile(r"\b(?:make|create|generate|build|give)\b.*\bmind\s*map\b\s+(?:on|about|for|of)\s+(.+)$", re.IGNORECASE),
)
ACADEMIC_TOPIC_HINTS = (
    "math", "maths", "algebra", "geometry", "calculus", "statistics", "probability",
    "physics", "chemistry", "biology", "coding", "programming", "algorithm", "theorem",
    "equation", "law", "laws", "integral", "derivative", "mechanics", "thermodynamics",
    "electricity", "magnetism", "atom", "molecule", "stoichiometry", "acid", "base",
    "history", "geography", "economics", "democracy", "photosynthesis", "ecosystem",
    "python", "java", "javascript", "html", "css", "sql", "database", "api", "dsa",
    "data structure", "machine learning", "deep learning", "neural network", "ai", "cybersecurity",
    "blockchain", "frontend", "backend", "react", "node", "operating system", "network",
    "compiler", "encryption", "cryptography", "recursion", "trigonometry", "linear algebra",
)
PERSON_LIKE_SINGLE_TOKENS = {
    "einstein", "newton", "tesla", "musk", "obama", "gandhi", "mandela", "darwin", "curie",
    "feynman", "oppenheimer", "ramanujan", "turing", "lovelace", "plato", "aristotle", "socrates",
    "napoleon", "lincoln", "shakespeare", "mozart", "beethoven", "hitler", "stalin", "putin",
    "trump", "biden", "ambani", "tata", "elon", "kush",
}

# NOTE: Greeting/small-talk detection logic has been moved to:
# backend/rename/backuprenamelogic.py
# The rename module handles all chat title rename logic.


def _sanitize_response_content(content: str) -> str:
    """
    Sanitize message content before sending to frontend.
    
    SECURITY: If the message contains the stop marker, we must:
    - Split on the FIRST occurrence of the marker
    - Return ONLY the text BEFORE the marker
    - Discard the marker and everything after it
    
    This ensures hidden/stopped text is NEVER exposed to the frontend,
    even through DevTools or Network tab inspection.
    
    MongoDB continues to store the full response for audit purposes.
    """
    if STOP_MARKER in content:
        # Split on first occurrence only, keep text before marker
        visible_part = content.split(STOP_MARKER, 1)[0]
        # Strip trailing whitespace that was added before the marker
        return visible_part.rstrip()
    return content


def _is_quiz_answer_text(content: str) -> bool:
    """Detect legacy quiz-answer marker text used by popup interactions."""
    return isinstance(content, str) and content.strip().lower().startswith(QUIZ_ANSWER_PREFIX)


def _parse_object_id(value: str, field_name: str) -> ObjectId:
    """Convert string to ObjectId with validation."""
    if not ObjectId.is_valid(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return ObjectId(value)


async def _next_message_index(db: AsyncIOMotorDatabase, chat_id: ObjectId) -> int:
    """Return the next sequential message index for a chat."""
    latest_with_index = await (
        db["messages"]
        .find({"chat_id": chat_id, "message_index": {"$exists": True}})
        .sort("message_index", -1)
        .limit(1)
        .to_list(length=1)
    )

    if latest_with_index:
        latest_index = latest_with_index[0].get("message_index")
        if isinstance(latest_index, int) and latest_index >= 0:
            return latest_index + 1

    # Legacy fallback: old chats may not yet have message_index populated.
    return await db["messages"].count_documents({"chat_id": chat_id})


def _normalize_difficulty_level(value: Optional[str]) -> str:
    """Normalize UI difficulty labels to a stable set for backend handling."""
    if not value:
        return "Neutral"

    normalized = value.strip().lower()
    if normalized == "beginner":
        return "Beginner"
    if normalized == "intermediate":
        return "Intermediate"
    if normalized == "advanced":
        return "Advanced"
    return "Neutral"


def _normalize_session_subject(value: Optional[str]) -> str:
    """Normalize session subject selector values."""
    if not value:
        return "Anyone"

    normalized = value.strip().lower()
    mapping = {
        "anyone": "Anyone",
        "maths": "Maths",
        "physics": "Physics",
        "chemistry": "Chemistry",
        "coding": "Coding",
    }
    candidate = mapping.get(normalized)
    if candidate in SESSION_SUBJECTS:
        return candidate
    return "Anyone"


def _subject_mismatch_message(session_subject: str) -> str:
    return (
        f"This question is not related to the current session subject ({session_subject}). "
        f"Please ask a {session_subject}-related question or switch subject to Anyone."
    )


def _build_subject_guard_snippet(session_subject: str) -> str:
    if session_subject == "Anyone":
        return ""

    mismatch_message = _subject_mismatch_message(session_subject)
    return (
        "[SESSION SUBJECT MODE]\n"
        f"Current session subject: {session_subject}.\n"
        f"Answer only in the context of {session_subject}.\n"
        "If the user's question is unrelated, respond with ONLY this exact sentence and nothing else:\n"
        f'"{mismatch_message}"'
    )


def _normalize_for_subject_match(value: str) -> str:
    sanitized = re.sub(r"[^a-z0-9+#\s]", " ", value.lower())
    collapsed = re.sub(r"\s+", " ", sanitized).strip()
    return f" {collapsed} " if collapsed else ""


def _detect_subject_matches(value: str) -> set[str]:
    normalized = _normalize_for_subject_match(value)
    if not normalized:
        return set()

    matches: set[str] = set()
    for subject, keywords in SUBJECT_KEYWORDS.items():
        for keyword in keywords:
            probe = keyword if " " in keyword or "+" in keyword or "#" in keyword else f" {keyword} "
            if probe in normalized:
                matches.add(subject)
                break
    return matches


def _is_subject_control_message(value: str) -> bool:
    lowered = value.strip().lower()
    if lowered == "summarize" or lowered.startswith("summarize "):
        return True
    if lowered in {"quiz me", "test me"}:
        return True

    if "flashcard" in lowered or "flash card" in lowered or "study card" in lowered:
        return True

    if "mind map" in lowered or "mindmap" in lowered:
        return True

    return False


def _is_quiz_request(value: str) -> bool:
    lowered = value.strip().lower()
    if "quiz me" in lowered or "test me" in lowered:
        return True

    if re.search(r"\b(?:make|create|generate|give)\b.*\bquiz\b", lowered):
        return True

    return bool(re.search(r"\bquiz\b\s+(?:on|about)\b", lowered))


def _is_flashcard_request(value: str) -> bool:
    lowered = value.strip().lower()
    if "flashcard" in lowered or "flash card" in lowered:
        return True

    if re.search(r"\b(?:make|create|generate|give)\b.*\bflash\s*cards?\b", lowered):
        return True

    return bool(re.search(r"\bflash\s*cards?\b\s+(?:on|about|for)\b", lowered))


def _is_mindmap_request(value: str) -> bool:
    lowered = value.strip().lower()
    if "mind map" in lowered or "mindmap" in lowered:
        return True

    if re.search(r"\b(?:make|create|generate|build|give)\b.*\bmind\s*map\b", lowered):
        return True

    return bool(re.search(r"\bmind\s*map\b\s+(?:on|about|for|of)\b", lowered))


def _normalize_person_target(raw_value: str) -> str:
    candidate = raw_value.strip().strip('"\'').strip()
    candidate = re.sub(r"\s+", " ", candidate)
    candidate = re.sub(r"[?.!,;:]+$", "", candidate).strip()
    return candidate


def _contains_academic_topic_hint(value: str) -> bool:
    lowered = f" {value.lower()} "
    for hint in ACADEMIC_TOPIC_HINTS:
        token = hint if " " in hint else f" {hint} "
        if token in lowered:
            return True
    return False


def _looks_like_person_name(target: str) -> bool:
    normalized_target = _normalize_person_target(target)
    if not normalized_target:
        return False

    lowered = normalized_target.lower()
    if lowered == "kush dalal":
        return True

    if _contains_academic_topic_hint(lowered):
        return False

    if any(char.isdigit() for char in lowered):
        return False

    parts = [item for item in lowered.split(" ") if item]
    if not parts or len(parts) > 4:
        return False

    for part in parts:
        if not re.fullmatch(r"[a-z][a-z\'\.-]*", part):
            return False

    if len(parts) == 1:
        return parts[0] in PERSON_LIKE_SINGLE_TOKENS

    connectives = {"the", "a", "an", "of", "in", "on", "for", "to", "with", "and"}
    if any(part in connectives for part in parts):
        return False

    return True


def _is_kush_identity_query(value: str) -> bool:
    return bool(KUSH_IDENTITY_PATTERN.match(value or ""))


def _extract_structured_request_target(value: str) -> Optional[str]:
    for pattern in STRUCTURED_TARGET_PATTERNS:
        match = pattern.search(value)
        if not match:
            continue

        target = _normalize_person_target(match.group(1))
        if target:
            return target

    return None


def _is_structured_request_about_person(value: str) -> bool:
    if not (_is_quiz_request(value) or _is_flashcard_request(value) or _is_mindmap_request(value)):
        return False

    target = _extract_structured_request_target(value)
    if not target:
        return False

    return _looks_like_person_name(target)


def _is_general_person_question(value: str) -> bool:
    for pattern in PERSONAL_QUERY_PATTERNS:
        match = pattern.match(value)
        if not match:
            continue

        target = _normalize_person_target(match.group(1))
        if not target:
            continue

        if _contains_academic_topic_hint(target):
            continue

        if _looks_like_person_name(target):
            return True

        # For direct "who is X" style, treat unknown one-token names as personal.
        if "who" in pattern.pattern.lower() and re.fullmatch(r"[A-Za-z][A-Za-z\'\.-]{2,}", target):
            return True

    return False


def _extract_summary_target(value: str) -> Optional[str]:
    match = re.match(r"^\s*summarize\s+(.+?)\s*$", value or "", re.IGNORECASE)
    if not match:
        return None
    return _normalize_person_target(match.group(1))


def _is_summary_request_about_person(value: str, context: List[str]) -> bool:
    target = _extract_summary_target(value)
    if target and _looks_like_person_name(target):
        return True

    for entry in reversed(context):
        if not isinstance(entry, str):
            continue

        lowered = entry.lower().strip()
        if not lowered.startswith("user:"):
            continue

        user_text = entry.split(":", 1)[1].strip()
        if not user_text:
            continue

        if user_text.lower().startswith("summarize"):
            continue

        return (
            _is_kush_identity_query(user_text)
            or _is_general_person_question(user_text)
            or _is_structured_request_about_person(user_text)
        )

    return False


def _get_personal_guard_response(value: str) -> Optional[str]:
    if _is_kush_identity_query(value):
        return KUSH_IDENTITY_RESPONSE

    if _is_structured_request_about_person(value):
        return PERSONAL_REFUSAL_MESSAGE

    if _is_general_person_question(value):
        return PERSONAL_REFUSAL_MESSAGE

    return None


def _should_block_for_subject(user_message: str, session_subject: str) -> bool:
    if session_subject == "Anyone":
        return False

    if _is_subject_control_message(user_message):
        return False

    matches = _detect_subject_matches(user_message)
    if session_subject in matches:
        return False

    other_subject_matches = {subject for subject in matches if subject != session_subject}
    return len(other_subject_matches) > 0


def _build_subject_mismatch_response(session_subject: str) -> str:
    base = _subject_mismatch_message(session_subject)
    suggestions = SUBJECT_SUGGESTIONS.get(session_subject, ())
    if not suggestions:
        return base

    suggestion_lines = "\n".join(f"- {suggestion}" for suggestion in suggestions)
    return f"{base}\n\nYou can ask me things like:\n{suggestion_lines}"


def _build_prompt_for_api(
    content: str,
    api_prompt: Optional[str],
    difficulty_level: str,
    session_subject: str,
) -> str:
    """Build the exact prompt text sent to AI calls."""
    if api_prompt and api_prompt.strip():
        base_prompt = api_prompt.strip()
    else:
        base_content = content.strip() or content
        if difficulty_level == "Neutral":
            base_prompt = base_content
        else:
            base_prompt = f"{base_content} at {difficulty_level.lower()} level"

    subject_guard = _build_subject_guard_snippet(session_subject)
    if subject_guard and "[SESSION SUBJECT MODE]" not in base_prompt:
        return f"{base_prompt}\n\n{subject_guard}"

    return base_prompt


@message_router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    payload: CreateMessageRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    chat_id = _parse_object_id(payload.chat_id, "chat_id")
    user_id = _parse_object_id(payload.user_id, "user_id")

    chat_document = await db["chats"].find_one({"_id": chat_id, "user_id": user_id})
    if not chat_document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found for user")

    message_index = await _next_message_index(db, chat_id)
    message = Message.create(
        chat_id=chat_id,
        user_id=user_id,
        role=payload.role,
        content=payload.content,
    )
    message.message_index = message_index
    result = await db["messages"].insert_one(message.to_document())

    return MessageResponse(
        id=str(result.inserted_id),
        chat_id=str(chat_id),
        user_id=str(user_id),
        role=message.role,
        content=message.content,
        created_at=message.created_at,
        message_index=message_index,
        response_level=None,
    )


@message_router.get("/{chat_id}", response_model=list[MessageResponse])
async def list_messages(
    chat_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> list[MessageResponse]:
    parsed_chat_id = _parse_object_id(chat_id, "chat_id")

    cursor = (
        db["messages"]
        .find({"chat_id": parsed_chat_id})
        .sort("created_at", 1)
    )

    documents = await cursor.to_list(length=None)

    messages: list[MessageResponse] = []
    skip_next_assistant_feedback = False
    for sequential_index, document in enumerate(documents):
        stored_index = document.get("message_index")
        if stored_index != sequential_index:
            await db["messages"].update_one(
                {"_id": document["_id"]},
                {"$set": {"message_index": sequential_index}},
            )

        role = document.get("role", "user")
        raw_content = str(document.get("content", ""))

        # Backward compatibility: hide legacy quiz popup interactions from chat history.
        # Legacy rows were stored as:
        # - user: "Quiz answer: X"
        # - assistant: generated feedback right after it
        if skip_next_assistant_feedback and role != "assistant":
            skip_next_assistant_feedback = False

        is_marked_quiz_interaction = bool(document.get("is_quiz_interaction"))
        if role == "user" and (_is_quiz_answer_text(raw_content) or is_marked_quiz_interaction):
            skip_next_assistant_feedback = True
            continue

        if role == "assistant" and (skip_next_assistant_feedback or is_marked_quiz_interaction):
            skip_next_assistant_feedback = False
            continue

        # SECURITY: Sanitize assistant responses to hide stopped text
        # User messages pass through unchanged, assistant messages are sanitized
        sanitized_content = _sanitize_response_content(raw_content) if role == "assistant" else raw_content
        
        messages.append(
            MessageResponse(
                id=str(document["_id"]),
                chat_id=str(document["chat_id"]),
                user_id=str(document["user_id"]),
                role=role,
                content=sanitized_content,  # Sanitized content for frontend
                created_at=document["created_at"],
                message_index=sequential_index,
                response_level=document.get("response_level"),
            )
        )

    return messages


@chat_interaction_router.post("/send")
async def send_message(
    payload: SendMessageRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    PHASE 2 FIX: Generate AI response but do NOT save it yet.
    
    The assistant message is NOT saved here. It will be saved
    by the /chat/finalize endpoint after frontend sends stop data.
    This ensures ONLY ONE save operation with correct stop marker.
    """
    chat_id = _parse_object_id(payload.chat_id, "chat_id")
    user_id = _parse_object_id(payload.user_id, "user_id")

    chat_document = await db["chats"].find_one({"_id": chat_id, "user_id": user_id})
    if not chat_document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found for user")

    # Save user message with sequential index.
    next_index = await _next_message_index(db, chat_id)
    assistant_index = next_index + 1

    user_message = Message.create(
        chat_id=chat_id,
        user_id=user_id,
        role="user",
        content=payload.content,
    )
    user_message.message_index = next_index
    await db["messages"].insert_one(user_message.to_document())

    # ========================
    # CHAT AUTO-RENAME (using rename module)
    # ========================
    # CHAT AUTO-RENAME (using rename module)
    # ========================
    # This uses the rename controller which decides:
    # 1. Rule-based rename on FIRST meaningful message
    # 2. AI-based rename FORCED on 3rd user message
    #
    # The controller runs SYNCHRONOUSLY to update title immediately.
    # ========================
    current_title = chat_document.get("title", "New Chat")
    is_deleted = chat_document.get("deleted_at") is not None
    
    # Count user messages for rename strategy decision
    user_message_count = await db["messages"].count_documents({
        "chat_id": chat_id,
        "role": "user"
    })
    
    # Let the rename controller handle it - returns new title if renamed
    new_title = await handle_chat_rename(
        db=db,
        chat_id=chat_id,
        user_message=payload.content,
        current_title=current_title,
        is_deleted=is_deleted,
        user_message_count=user_message_count
    )

    # Build context for AI
    context_cursor = (
        db["messages"]
        .find({"chat_id": chat_id})
        .sort("created_at", -1)
        .limit(10)
    )

    context: List[str] = []
    async for document in context_cursor:
        role = document.get("role", "user")
        content = document.get("content", "")
        context.append(f"{role}: {content}")
    context.reverse()

    # --- EDUCATIONAL FEATURE ROUTING ---
    # Detect quiz/summary triggers in user message
    content_lower = payload.content.strip().lower()
    difficulty = _normalize_difficulty_level(payload.difficulty_level)
    session_subject = _normalize_session_subject(payload.session_subject)
    prompt_for_api = _build_prompt_for_api(
        payload.content,
        payload.api_prompt,
        difficulty,
        session_subject,
    )
    response_level = difficulty if difficulty != "Neutral" else None

    personal_guard_response = _get_personal_guard_response(payload.content)
    if personal_guard_response is not None:
        assistant_message = Message.create(
            chat_id=chat_id,
            user_id=user_id,
            role="assistant",
            content=personal_guard_response,
        )
        assistant_document = assistant_message.to_document()
        assistant_document["message_index"] = assistant_index
        assistant_document["ai_generated"] = False
        assistant_document["was_stopped"] = False
        if response_level:
            assistant_document["response_level"] = response_level

        result = await db["messages"].insert_one(assistant_document)
        response = {
            "type": "text",
            "content": personal_guard_response,
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(result.inserted_id),
            "message_index": assistant_index,
            "pending": False,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    if _should_block_for_subject(payload.content, session_subject):
        reply = _build_subject_mismatch_response(session_subject)

        assistant_message = Message.create(
            chat_id=chat_id,
            user_id=user_id,
            role="assistant",
            content=reply,
        )
        assistant_document = assistant_message.to_document()
        assistant_document["message_index"] = assistant_index
        assistant_document["ai_generated"] = False
        assistant_document["was_stopped"] = False
        if response_level:
            assistant_document["response_level"] = response_level

        result = await db["messages"].insert_one(assistant_document)
        response = {
            "type": "text",
            "content": reply,
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(result.inserted_id),
            "message_index": assistant_index,
            "pending": False,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    is_mindmap = _is_mindmap_request(payload.content)
    is_flashcard = _is_flashcard_request(payload.content)
    is_quiz = _is_quiz_request(payload.content)
    is_summary = content_lower.strip() == "summarize" or content_lower.strip().startswith("summarize ")

    if is_summary and _is_summary_request_about_person(payload.content, context):
        assistant_message = Message.create(
            chat_id=chat_id,
            user_id=user_id,
            role="assistant",
            content=PERSONAL_REFUSAL_MESSAGE,
        )
        assistant_document = assistant_message.to_document()
        assistant_document["message_index"] = assistant_index
        assistant_document["ai_generated"] = False
        assistant_document["was_stopped"] = False
        if response_level:
            assistant_document["response_level"] = response_level

        result = await db["messages"].insert_one(assistant_document)
        response = {
            "type": "text",
            "content": PERSONAL_REFUSAL_MESSAGE,
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(result.inserted_id),
            "message_index": assistant_index,
            "pending": False,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    if is_mindmap:
        mindmap_data = await generate_mindmap_payload(
            message=prompt_for_api,
            context=context,
            difficulty_level=difficulty,
            session_subject=session_subject,
        )

        if str(mindmap_data.get("type", "")).strip().lower() != "mindmap":
            refusal_text = str(mindmap_data.get("content", "")).strip()
            if not refusal_text:
                refusal_text = "I can only create mind maps for study or education-related topics."

            assistant_message = Message.create(
                chat_id=chat_id,
                user_id=user_id,
                role="assistant",
                content=refusal_text,
            )
            assistant_document = assistant_message.to_document()
            assistant_document["message_index"] = assistant_index
            assistant_document["ai_generated"] = True
            assistant_document["was_stopped"] = False
            if response_level:
                assistant_document["response_level"] = response_level
            result = await db["messages"].insert_one(assistant_document)

            response = {
                "type": "text",
                "content": refusal_text,
                "chat_id": str(chat_id),
                "user_id": str(user_id),
                "message_id": str(result.inserted_id),
                "message_index": assistant_index,
                "pending": False,
                "response_level": response_level,
            }
            if new_title:
                response["new_title"] = new_title
            return response

        node_count = len(mindmap_data.get("nodes", []))
        mindmap_summary = (
            f"🧠 Mind Map: {mindmap_data.get('topic', 'Topic')} — {node_count} nodes generated."
        )
        assistant_message = Message.create(
            chat_id=chat_id, user_id=user_id, role="assistant", content=mindmap_summary,
        )
        assistant_document = assistant_message.to_document()
        assistant_document["message_index"] = assistant_index
        assistant_document["ai_generated"] = True
        assistant_document["was_stopped"] = False
        if response_level:
            assistant_document["response_level"] = response_level
        result = await db["messages"].insert_one(assistant_document)

        response = {
            "type": "mindmap",
            "content": mindmap_summary,
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(result.inserted_id),
            "message_index": assistant_index,
            "pending": False,
            "mindmap": mindmap_data,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    if is_flashcard:
        flashcard_data = await generate_flashcard_payload(
            message=prompt_for_api,
            context=context,
            difficulty_level=difficulty,
            session_subject=session_subject,
        )

        if str(flashcard_data.get("type", "")).strip().lower() != "flashcard":
            refusal_text = str(flashcard_data.get("content", "")).strip()
            if not refusal_text:
                refusal_text = "I can only create flashcards for study or education-related topics."

            assistant_message = Message.create(
                chat_id=chat_id,
                user_id=user_id,
                role="assistant",
                content=refusal_text,
            )
            assistant_document = assistant_message.to_document()
            assistant_document["message_index"] = assistant_index
            assistant_document["ai_generated"] = True
            assistant_document["was_stopped"] = False
            if response_level:
                assistant_document["response_level"] = response_level
            result = await db["messages"].insert_one(assistant_document)

            response = {
                "type": "text",
                "content": refusal_text,
                "chat_id": str(chat_id),
                "user_id": str(user_id),
                "message_id": str(result.inserted_id),
                "message_index": assistant_index,
                "pending": False,
                "response_level": response_level,
            }
            if new_title:
                response["new_title"] = new_title
            return response

        card_count = len(flashcard_data.get("cards", []))
        flashcard_summary = (
            f"📚 Flashcards: {flashcard_data.get('topic', 'Topic')} — {card_count} cards generated."
        )
        assistant_message = Message.create(
            chat_id=chat_id, user_id=user_id, role="assistant", content=flashcard_summary,
        )
        assistant_document = assistant_message.to_document()
        assistant_document["message_index"] = assistant_index
        assistant_document["ai_generated"] = True
        assistant_document["was_stopped"] = False
        if response_level:
            assistant_document["response_level"] = response_level
        result = await db["messages"].insert_one(assistant_document)

        response = {
            "type": "flashcard",
            "content": flashcard_summary,
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(result.inserted_id),
            "message_index": assistant_index,
            "pending": False,
            "flashcard": flashcard_data,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    if is_quiz:
        # Generate structured quiz JSON
        quiz_data = await generate_quiz_payload(
            message=prompt_for_api,
            context=context,
            difficulty_level=difficulty,
            session_subject=session_subject,
        )

        if str(quiz_data.get("type", "")).strip().lower() != "quiz":
            refusal_text = str(quiz_data.get("content", "")).strip()
            if not refusal_text:
                refusal_text = "I can only create quizzes for study or education-related topics."

            assistant_message = Message.create(
                chat_id=chat_id,
                user_id=user_id,
                role="assistant",
                content=refusal_text,
            )
            assistant_document = assistant_message.to_document()
            assistant_document["message_index"] = assistant_index
            assistant_document["ai_generated"] = True
            assistant_document["was_stopped"] = False
            if response_level:
                assistant_document["response_level"] = response_level
            result = await db["messages"].insert_one(assistant_document)

            response = {
                "type": "text",
                "content": refusal_text,
                "chat_id": str(chat_id),
                "user_id": str(user_id),
                "message_id": str(result.inserted_id),
                "message_index": assistant_index,
                "pending": False,
                "response_level": response_level,
            }
            if new_title:
                response["new_title"] = new_title
            return response

        # Save a text summary to DB so history makes sense
        question_count = len(quiz_data.get("questions", []))
        quiz_summary = (
            f"📝 Quiz: {quiz_data.get('topic', 'Topic')} — {question_count} questions generated."
        )
        assistant_message = Message.create(
            chat_id=chat_id, user_id=user_id, role="assistant", content=quiz_summary,
        )
        assistant_document = assistant_message.to_document()
        assistant_document["message_index"] = assistant_index
        assistant_document["ai_generated"] = True
        assistant_document["was_stopped"] = False
        if response_level:
            assistant_document["response_level"] = response_level
        result = await db["messages"].insert_one(assistant_document)

        response = {
            "type": "quiz",
            "content": quiz_summary,
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(result.inserted_id),
            "message_index": assistant_index,
            "pending": False,
            "quiz": quiz_data,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    elif is_summary:
        # Generate structured summary JSON
        summary_data = await generate_summary_payload(
            message=prompt_for_api,
            context=context,
            difficulty_level=difficulty,
            session_subject=session_subject,
        )

        # Save a text summary to DB
        summary_text = (
            f"📋 Summary: {summary_data.get('topic', 'Topic')}\n"
            f"Definition: {summary_data.get('one_line_definition', '')}\n"
            f"Key Points: {', '.join(summary_data.get('key_points', []))}"
        )
        assistant_message = Message.create(
            chat_id=chat_id, user_id=user_id, role="assistant", content=summary_text,
        )
        assistant_document = assistant_message.to_document()
        assistant_document["message_index"] = assistant_index
        assistant_document["ai_generated"] = True
        assistant_document["was_stopped"] = False
        if response_level:
            assistant_document["response_level"] = response_level
        result = await db["messages"].insert_one(assistant_document)

        response = {
            "type": "summary",
            "content": summary_text,
            "chat_id": str(chat_id),
            "user_id": str(user_id),
            "message_id": str(result.inserted_id),
            "message_index": assistant_index,
            "pending": False,
            "summary": summary_data,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    # --- Normal chat flow (with difficulty setting) ---
    reply = process_logic(payload.content)
    used_ai = False
    if reply is None:
        reply = await generate_ai_reply_with_mode(
            message=prompt_for_api,
            context=context,
            difficulty_level=difficulty,
            session_subject=session_subject,
        )
        used_ai = True

    # --- DATA LOSS FIX: ALWAYS save full response IMMEDIATELY ---
    assistant_message = Message.create(
        chat_id=chat_id,
        user_id=user_id,
        role="assistant",
        content=reply,
    )
    assistant_document = assistant_message.to_document()
    assistant_document["message_index"] = assistant_index
    assistant_document["ai_generated"] = True
    assistant_document["was_stopped"] = False
    if response_level:
        assistant_document["response_level"] = response_level
    
    result = await db["messages"].insert_one(assistant_document)
    saved_message_id = result.inserted_id

    # Return response with message_id and new_title for frontend update
    response = {
        "type": "text",
        "content": reply,
        "chat_id": str(chat_id),
        "user_id": str(user_id),
        "message_id": str(saved_message_id),
        "message_index": assistant_index,
        "pending": False,
        "response_level": response_level,
    }
    
    if new_title:
        response["new_title"] = new_title
    
    return response


# --- Schema for applying STOP marker to already-saved response ---
class FinalizeResponseRequest(BaseModel):
    """
    Request body for applying STOP marker to an already-saved bot response.
    
    DATA LOSS FIX:
    - Bot responses are saved IMMEDIATELY in /chat/send
    - This endpoint only UPDATES the saved message if user stopped
    - If frontend never calls this, full response remains safely saved
    """
    chat_id: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)
    message_id: str = Field(..., min_length=1)  # ID of the saved message to update
    full_response: str = Field(..., min_length=1)
    stopped: bool = Field(default=False)
    stop_index: Optional[int] = Field(default=None)


@chat_interaction_router.post("/finalize", response_model=MessageResponse)
async def finalize_response(
    payload: FinalizeResponseRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> MessageResponse:
    """
    DATA LOSS FIX: Update already-saved message with STOP marker.
    
    This endpoint is called by frontend after:
    - Rendering completes normally (stopped=false) → No update needed
    - User clicks stop button (stopped=true) → Update to add marker
    
    IMPORTANT: The bot message was already saved in /chat/send.
    This endpoint only UPDATES the existing record if the user stopped.
    If frontend disappears without calling this, no data is lost.
    
    Update logic:
    - If stopped == false: Do nothing (message already saved correctly)
    - If stopped == true AND stop_index is valid:
        - Update message content to: shown + "[user stopped response]" + remaining
        - Set was_stopped = true
    """
    chat_id = _parse_object_id(payload.chat_id, "chat_id")
    user_id = _parse_object_id(payload.user_id, "user_id")
    message_id = _parse_object_id(payload.message_id, "message_id")

    # Verify chat exists and belongs to user
    chat_document = await db["chats"].find_one({"_id": chat_id, "user_id": user_id})
    if not chat_document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found for user")

    # Verify message exists and belongs to this chat
    existing_message = await db["messages"].find_one({
        "_id": message_id,
        "chat_id": chat_id,
        "user_id": user_id,
        "role": "assistant"
    })
    if not existing_message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # If not stopped, no update needed - message is already saved with full content
    if not payload.stopped:
        return MessageResponse(
            id=str(existing_message["_id"]),
            chat_id=str(existing_message["chat_id"]),
            user_id=str(existing_message["user_id"]),
            role=existing_message["role"],
            content=existing_message["content"],
            created_at=existing_message["created_at"],
            message_index=existing_message.get("message_index"),
            response_level=existing_message.get("response_level"),
        )

    # User stopped - apply marker if stop_index is valid
    final_content = payload.full_response  # Fallback

    if (payload.stop_index is not None and 
        isinstance(payload.stop_index, int) and 
        0 <= payload.stop_index <= len(payload.full_response)):
        
        # Split response at stop_index and insert marker
        shown_part = payload.full_response[:payload.stop_index]
        remaining_part = payload.full_response[payload.stop_index:]
        final_content = shown_part + " [user stopped response] " + remaining_part

    # UPDATE the existing message with stop marker
    await db["messages"].update_one(
        {"_id": message_id},
        {"$set": {
            "content": final_content,
            "was_stopped": True
        }}
    )

    return MessageResponse(
        id=str(message_id),
        chat_id=str(chat_id),
        user_id=str(user_id),
        role="assistant",
        content=final_content,
        created_at=existing_message["created_at"],
        message_index=existing_message.get("message_index"),
        response_level=existing_message.get("response_level"),
    )


@chat_interaction_router.post("/quiz-answer")
async def submit_quiz_answer(
    payload: QuizAnswerRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Submit a quiz answer and receive AI-generated feedback.

    The frontend sends the question details and selected answer.
    The backend generates contextual feedback using AI.
    """
    chat_id = _parse_object_id(payload.chat_id, "chat_id")
    user_id = _parse_object_id(payload.user_id, "user_id")

    chat_document = await db["chats"].find_one({"_id": chat_id, "user_id": user_id})
    if not chat_document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found for user")

    difficulty = _normalize_difficulty_level(payload.difficulty_level)
    session_subject = _normalize_session_subject(payload.session_subject)
    response_level = difficulty if difficulty != "Neutral" else None

    # Generate AI feedback for the selected answer
    feedback = await generate_quiz_feedback_reply(
        topic=payload.topic,
        question=payload.question,
        options=payload.options,
        selected_option=payload.selected_option,
        correct_option=payload.correct_option,
        explanation=payload.explanation,
        difficulty_level=difficulty,
        session_subject=session_subject,
    )

    is_correct = payload.selected_option.strip().upper() == payload.correct_option.strip().upper()

    # IMPORTANT: Quiz popup interactions are isolated from chat history.
    # Do NOT save user quiz selections or AI quiz feedback in messages collection.

    return {
        "feedback": feedback,
        "is_correct": is_correct,
        "correct_option": payload.correct_option,
        "response_level": response_level,
    }
