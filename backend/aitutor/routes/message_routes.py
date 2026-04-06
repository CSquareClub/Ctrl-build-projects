"""Routes for creating and retrieving chat messages."""
import asyncio
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
    generate_ai_reply,
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


def _parse_object_id(value: str, field_name: str) -> ObjectId:
    """Convert string to ObjectId with validation."""
    if not ObjectId.is_valid(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return ObjectId(value)


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


def _build_prompt_for_api(content: str, api_prompt: Optional[str], difficulty_level: str) -> str:
    """Build the exact prompt text sent to AI calls."""
    if api_prompt and api_prompt.strip():
        return api_prompt.strip()

    base_content = content.strip() or content
    if difficulty_level == "Neutral":
        return base_content

    return f"{base_content} at {difficulty_level.lower()} level"


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

    message = Message.create(chat_id=chat_id, user_id=user_id, role=payload.role, content=payload.content)
    result = await db["messages"].insert_one(message.to_document())

    return MessageResponse(
        id=str(result.inserted_id),
        chat_id=str(chat_id),
        user_id=str(user_id),
        role=message.role,
        content=message.content,
        created_at=message.created_at,
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

    messages: list[MessageResponse] = []
    async for document in cursor:
        # SECURITY: Sanitize assistant responses to hide stopped text
        # User messages pass through unchanged, assistant messages are sanitized
        raw_content = document["content"]
        sanitized_content = _sanitize_response_content(raw_content) if document["role"] == "assistant" else raw_content
        
        messages.append(
            MessageResponse(
                id=str(document["_id"]),
                chat_id=str(document["chat_id"]),
                user_id=str(document["user_id"]),
                role=document["role"],
                content=sanitized_content,  # Sanitized content for frontend
                created_at=document["created_at"],
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

    # Save user message (this is fine, user messages don't need stop handling)
    user_message = Message.create(
        chat_id=chat_id,
        user_id=user_id,
        role="user",
        content=payload.content,
    )
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
    guided = bool(payload.guided_learning)
    prompt_for_api = _build_prompt_for_api(payload.content, payload.api_prompt, difficulty)
    response_level = difficulty if difficulty != "Neutral" else None

    is_quiz = any(trigger in content_lower for trigger in ["quiz me", "test me"])
    is_summary = content_lower.strip() == "summarize" or content_lower.strip().startswith("summarize ")

    if is_quiz:
        # Generate structured quiz JSON
        quiz_data = await generate_quiz_payload(
            message=prompt_for_api,
            context=context,
            difficulty_level=difficulty,
            guided_learning=guided,
        )

        # Save a text summary to DB so history makes sense
        quiz_summary = f"📝 Quiz: {quiz_data.get('topic', 'Topic')} — 3 questions generated."
        assistant_message = Message.create(
            chat_id=chat_id, user_id=user_id, role="assistant", content=quiz_summary,
        )
        assistant_document = assistant_message.to_document()
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
            guided_learning=guided,
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
            "pending": False,
            "summary": summary_data,
            "response_level": response_level,
        }
        if new_title:
            response["new_title"] = new_title
        return response

    # --- Normal chat flow (with mode settings) ---
    reply = process_logic(payload.content)
    used_ai = False
    if reply is None:
        reply = await generate_ai_reply_with_mode(
            message=prompt_for_api,
            context=context,
            difficulty_level=difficulty,
            guided_learning=guided,
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
    guided = bool(payload.guided_learning)
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
        guided_learning=guided,
    )

    is_correct = payload.selected_option.strip().upper() == payload.correct_option.strip().upper()

    # Save answer + feedback as messages in the chat
    user_answer_text = f"Quiz answer: {payload.selected_option}"
    user_msg = Message.create(chat_id=chat_id, user_id=user_id, role="user", content=user_answer_text)
    await db["messages"].insert_one(user_msg.to_document())

    assistant_msg = Message.create(chat_id=chat_id, user_id=user_id, role="assistant", content=feedback)
    assistant_doc = assistant_msg.to_document()
    assistant_doc["ai_generated"] = True
    assistant_doc["was_stopped"] = False
    if response_level:
        assistant_doc["response_level"] = response_level
    result = await db["messages"].insert_one(assistant_doc)

    return {
        "feedback": feedback,
        "is_correct": is_correct,
        "correct_option": payload.correct_option,
        "message_id": str(result.inserted_id),
        "response_level": response_level,
    }
