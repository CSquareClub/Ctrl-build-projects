"""Routes for saving and retrieving flashcard sets."""
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import get_database
from models.flashcard import FlashcardSet
from schemas.flashcard_schema import (
    FlashcardItem,
    FlashcardListResponse,
    FlashcardResponse,
    SaveFlashcardRequest,
)


router = APIRouter(prefix="/flashcards", tags=["flashcards"])
logger = logging.getLogger(__name__)


def _parse_object_id(raw_id: str, field_name: str) -> ObjectId:
    """Safely convert string ids to Mongo ObjectId."""
    if not ObjectId.is_valid(raw_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return ObjectId(raw_id)


def _card_to_dict(card: FlashcardItem) -> dict[str, str]:
    """Serialize pydantic card models in a pydantic v1/v2 compatible way."""
    if hasattr(card, "model_dump"):
        return card.model_dump()
    return card.dict()


def _normalize_stored_cards(raw_cards: Any) -> list[FlashcardItem]:
    """Normalize stored flashcard payloads for API response."""
    if not isinstance(raw_cards, list):
        return []

    normalized_cards: list[FlashcardItem] = []
    for item in raw_cards:
        if not isinstance(item, dict):
            continue

        front = str(item.get("front", "")).strip()
        back = str(item.get("back", "")).strip()
        if not front or not back:
            continue

        try:
            normalized_cards.append(FlashcardItem(front=front, back=back))
        except Exception:
            continue

    return normalized_cards


def _object_id_to_str(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    if value is None:
        return ""
    return str(value)


@router.post("", response_model=FlashcardResponse, status_code=status.HTTP_201_CREATED)
async def save_flashcards(
    payload: SaveFlashcardRequest,
    db=Depends(get_database),
) -> FlashcardResponse:
    """Save a generated flashcard set."""
    if not payload.cards:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="cards must contain at least one flashcard",
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

    flashcard_set = FlashcardSet.create(
        user_id=user_object_id,
        chat_id=chat_object_id,
        message_index=payload.message_index,
        topic=topic,
        cards=[_card_to_dict(card) for card in payload.cards],
    )

    document = flashcard_set.to_document()
    try:
        await db["flashcards"].insert_one(document)
    except DuplicateKeyError as exc:
        logger.exception("Duplicate flashcard_id encountered while saving flashcards")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A flashcard set with the same flashcard_id already exists. Please retry.",
        ) from exc

    cards = _normalize_stored_cards(document.get("cards", []))
    return FlashcardResponse(
        flashcard_id=document["flashcard_id"],
        user_id=str(user_object_id),
        chat_id=str(chat_object_id),
        message_index=document["message_index"],
        topic=document["topic"],
        cards=cards,
        created_at=document["created_at"],
    )


@router.get("/chat/{chat_id}", response_model=FlashcardListResponse)
async def list_flashcards_by_chat(
    chat_id: str,
    db=Depends(get_database),
) -> FlashcardListResponse:
    """Fetch all flashcard sets for a chat ordered by message position."""
    chat_object_id = _parse_object_id(chat_id, "chat_id")

    cursor = db["flashcards"].find({"chat_id": chat_object_id}).sort(
        [("message_index", 1), ("created_at", 1)]
    )

    flashcards: list[FlashcardResponse] = []
    async for document in cursor:
        cards = _normalize_stored_cards(document.get("cards", []))
        created_at = document.get("created_at")
        if not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)

        flashcards.append(
            FlashcardResponse(
                flashcard_id=str(document.get("flashcard_id", "")),
                user_id=_object_id_to_str(document.get("user_id")),
                chat_id=_object_id_to_str(document.get("chat_id")),
                message_index=int(document.get("message_index", 0)),
                topic=str(document.get("topic", "")),
                cards=cards,
                created_at=created_at,
            )
        )

    return FlashcardListResponse(flashcards=flashcards)
