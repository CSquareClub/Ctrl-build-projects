"""Domain model for chat metadata stored in MongoDB."""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId


@dataclass(slots=True)
class Chat:
    """
    Represents a chat record owned by a user.
    
    SOFT DELETE:
    - deleted_at: null = active chat (visible to user)
    - deleted_at: datetime = soft deleted (hidden from user, retained in DB)
    """

    user_id: ObjectId
    title: str
    created_at: datetime
    deleted_at: Optional[datetime] = None  # Soft delete: null = active, datetime = deleted
    _id: Optional[ObjectId] = None

    @classmethod
    def create(cls, user_id: ObjectId, title: str) -> "Chat":
        """Factory helper that stamps the current UTC time."""
        return cls(
            user_id=user_id,
            title=title,
            created_at=datetime.now(timezone.utc),
            deleted_at=None,  # New chats are always active
        )

    def to_document(self) -> dict[str, object]:
        """Serialize the chat for MongoDB insertion."""
        payload = asdict(self)
        payload.pop("_id")  # exclude optional id so Mongo can generate one
        return payload
