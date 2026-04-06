"""Domain model for persisted flashcards."""
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from bson import ObjectId


@dataclass(slots=True)
class FlashcardSet:
    """Represents a flashcard set generated for a user chat."""

    flashcard_id: str
    user_id: ObjectId
    chat_id: ObjectId
    message_index: int
    topic: str
    cards: list[dict[str, Any]]
    created_at: datetime
    _id: Optional[ObjectId] = None

    @classmethod
    def create(
        cls,
        *,
        user_id: ObjectId,
        chat_id: ObjectId,
        message_index: int,
        topic: str,
        cards: list[dict[str, Any]],
    ) -> "FlashcardSet":
        """Factory helper that assigns a unique flashcard_id and timestamp."""
        return cls(
            flashcard_id=uuid4().hex,
            user_id=user_id,
            chat_id=chat_id,
            message_index=message_index,
            topic=topic,
            cards=cards,
            created_at=datetime.now(timezone.utc),
        )

    def to_document(self) -> dict[str, object]:
        """Serialize flashcard payload for MongoDB insertion."""
        payload = asdict(self)
        payload.pop("_id")
        return payload
