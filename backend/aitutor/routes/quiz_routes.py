"""Routes for saving and retrieving quizzes."""
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import get_database
from models.quiz import Quiz
from schemas.quiz_schema import (
    QuizAttemptListResponse,
    QuizAttemptResponse,
    QuizListResponse,
    QuizQuestion,
    QuizResponse,
    SaveQuizAttemptRequest,
    SaveQuizRequest,
)


router = APIRouter(prefix="/quizzes", tags=["quizzes"])
logger = logging.getLogger(__name__)


def _parse_object_id(raw_id: str, field_name: str) -> ObjectId:
    """Safely convert string ids to Mongo ObjectId."""
    if not ObjectId.is_valid(raw_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return ObjectId(raw_id)


def _question_to_dict(question: QuizQuestion) -> dict[str, Any]:
    """Serialize pydantic question models in a pydantic v1/v2 compatible way."""
    if hasattr(question, "model_dump"):
        return question.model_dump()
    return question.dict()


def _normalize_stored_questions(raw_questions: Any) -> list[QuizQuestion]:
    """Normalize stored quiz question payloads for API response."""
    if not isinstance(raw_questions, list):
        return []

    normalized_questions: list[QuizQuestion] = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue

        normalized_payload = {
            "question": str(item.get("question", "")).strip(),
            "options": item.get("options", []),
            "correct_answer": str(
                item.get("correct_answer")
                or item.get("correct")
                or item.get("correct_option")
                or ""
            ).strip(),
        }

        if not normalized_payload["question"] or not normalized_payload["correct_answer"]:
            continue

        try:
            normalized_questions.append(QuizQuestion(**normalized_payload))
        except Exception:
            continue

    return normalized_questions


def _object_id_to_str(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    if value is None:
        return ""
    return str(value)


def _normalize_selected_option(raw_value: str) -> str:
    normalized = raw_value.strip().upper()
    return normalized[0] if normalized else ""


@router.post("", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
async def save_quiz(
    payload: SaveQuizRequest,
    db=Depends(get_database),
) -> QuizResponse:
    """Save a generated quiz document."""
    if not payload.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="questions must contain at least one question",
        )

    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="topic cannot be empty",
        )

    user_object_id = _parse_object_id(payload.user_id, "user_id")
    chat_object_id = _parse_object_id(payload.chat_id, "chat_id")

    user_exists = await db["users"].find_one({"_id": user_object_id})
    if not user_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    chat_exists = await db["chats"].find_one({"_id": chat_object_id, "user_id": user_object_id})
    if not chat_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or access denied",
        )

    anchor_message = await db["messages"].find_one(
        {"chat_id": chat_object_id, "message_index": payload.message_index}
    )
    if not anchor_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message_index does not match any message in this chat",
        )

    quiz = Quiz.create(
        user_id=user_object_id,
        chat_id=chat_object_id,
        message_index=payload.message_index,
        topic=topic,
        questions=[_question_to_dict(question) for question in payload.questions],
    )

    document = quiz.to_document()
    try:
        await db["quizzes"].insert_one(document)
    except DuplicateKeyError as exc:
        logger.exception("Duplicate quiz_id encountered while saving quiz")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A quiz with the same quiz_id already exists. Please retry.",
        ) from exc

    questions = _normalize_stored_questions(document.get("questions", []))
    return QuizResponse(
        quiz_id=document["quiz_id"],
        user_id=str(user_object_id),
        chat_id=str(chat_object_id),
        message_index=document["message_index"],
        topic=document["topic"],
        questions=questions,
        created_at=document["created_at"],
    )


@router.get("/chat/{chat_id}", response_model=QuizListResponse)
async def list_quizzes_by_chat(
    chat_id: str,
    db=Depends(get_database),
) -> QuizListResponse:
    """Fetch all quizzes for a chat ordered by message position."""
    chat_object_id = _parse_object_id(chat_id, "chat_id")

    cursor = db["quizzes"].find({"chat_id": chat_object_id}).sort(
        [("message_index", 1), ("created_at", 1)]
    )

    quizzes: list[QuizResponse] = []
    async for document in cursor:
        questions = _normalize_stored_questions(document.get("questions", []))
        created_at = document.get("created_at")
        if not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)

        quizzes.append(
            QuizResponse(
                quiz_id=str(document.get("quiz_id", "")),
                user_id=_object_id_to_str(document.get("user_id")),
                chat_id=_object_id_to_str(document.get("chat_id")),
                message_index=int(document.get("message_index", 0)),
                topic=str(document.get("topic", "")),
                questions=questions,
                created_at=created_at,
            )
        )

    return QuizListResponse(quizzes=quizzes)


@router.post("/attempts", response_model=QuizAttemptResponse, status_code=status.HTTP_201_CREATED)
async def save_quiz_attempt(
    payload: SaveQuizAttemptRequest,
    db=Depends(get_database),
) -> QuizAttemptResponse:
    """Save an answer attempt for a specific quiz question."""
    quiz_id = payload.quiz_id.strip()
    if not quiz_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quiz_id cannot be empty",
        )

    quiz_exists = await db["quizzes"].find_one({"quiz_id": quiz_id})
    if not quiz_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    selected_option = _normalize_selected_option(payload.selected_option)
    if selected_option not in {"A", "B", "C", "D"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="selected_option must start with A, B, C, or D",
        )

    attempt_document = {
        "quiz_id": quiz_id,
        "question_index": payload.question_index,
        "selected_option": selected_option,
        "is_correct": bool(payload.is_correct),
        "created_at": datetime.now(timezone.utc),
    }

    result = await db["quiz_attempts"].insert_one(attempt_document)
    return QuizAttemptResponse(
        attempt_id=str(result.inserted_id),
        quiz_id=attempt_document["quiz_id"],
        question_index=attempt_document["question_index"],
        selected_option=attempt_document["selected_option"],
        is_correct=attempt_document["is_correct"],
        created_at=attempt_document["created_at"],
    )


@router.get("/{quiz_id}/attempts", response_model=QuizAttemptListResponse)
async def list_quiz_attempts(
    quiz_id: str,
    db=Depends(get_database),
) -> QuizAttemptListResponse:
    """Fetch all attempts made for a quiz."""
    normalized_quiz_id = quiz_id.strip()
    if not normalized_quiz_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quiz_id cannot be empty",
        )

    quiz_exists = await db["quizzes"].find_one({"quiz_id": normalized_quiz_id})
    if not quiz_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    cursor = db["quiz_attempts"].find({"quiz_id": normalized_quiz_id}).sort("created_at", 1)

    attempts: list[QuizAttemptResponse] = []
    async for document in cursor:
        created_at = document.get("created_at")
        if not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)

        attempts.append(
            QuizAttemptResponse(
                attempt_id=str(document.get("_id", "")),
                quiz_id=str(document.get("quiz_id", "")),
                question_index=int(document.get("question_index", 0)),
                selected_option=str(document.get("selected_option", "")),
                is_correct=bool(document.get("is_correct", False)),
                created_at=created_at,
            )
        )

    return QuizAttemptListResponse(quiz_id=normalized_quiz_id, attempts=attempts)
