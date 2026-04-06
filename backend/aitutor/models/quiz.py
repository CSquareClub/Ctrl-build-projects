"""Domain model for persisted quizzes."""
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from bson import ObjectId


@dataclass(slots=True)
class Quiz:
    """Represents a quiz generated for a user chat."""

    quiz_id: str
    user_id: ObjectId
    chat_id: ObjectId
    message_index: int
    topic: str
    questions: list[dict[str, Any]]
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
        questions: list[dict[str, Any]],
    ) -> "Quiz":
        """Factory helper that assigns a unique quiz_id and timestamp."""
        return cls(
            quiz_id=uuid4().hex,
            user_id=user_id,
            chat_id=chat_id,
            message_index=message_index,
            topic=topic,
            questions=questions,
            created_at=datetime.now(timezone.utc),
        )

    def to_document(self) -> dict[str, object]:
        """Serialize quiz payload for MongoDB insertion."""
        payload = asdict(self)
        payload.pop("_id")
        return payload
