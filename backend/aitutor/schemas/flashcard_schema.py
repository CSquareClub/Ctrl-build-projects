"""Pydantic schemas for flashcard persistence endpoints."""
from datetime import datetime

from pydantic import BaseModel, Field


class FlashcardItem(BaseModel):
    """Single flashcard payload persisted within a set."""

    front: str = Field(..., min_length=1)
    back: str = Field(..., min_length=1)


class SaveFlashcardRequest(BaseModel):
    """Request body for saving generated flashcards."""

    user_id: str = Field(..., min_length=1)
    chat_id: str = Field(..., min_length=1)
    message_index: int = Field(..., ge=0)
    topic: str = Field(..., min_length=1)
    cards: list[FlashcardItem]


class FlashcardResponse(BaseModel):
    """Single flashcard set response shape."""

    flashcard_id: str
    user_id: str
    chat_id: str
    message_index: int
    topic: str
    cards: list[FlashcardItem]
    created_at: datetime


class FlashcardListResponse(BaseModel):
    """List response for flashcard sets in a chat."""

    flashcards: list[FlashcardResponse]
