"""Domain model for chat messages stored in MongoDB."""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId


MessageRole = Literal["user", "assistant"]


@dataclass(slots=True)
class Message:
	"""Represents a persisted message within a chat."""

	chat_id: ObjectId
	user_id: ObjectId
	role: MessageRole
	content: str
	created_at: datetime
	message_index: Optional[int] = None
	_id: Optional[ObjectId] = None

	@classmethod
	def create(
		cls,
		*,
		chat_id: ObjectId,
		user_id: ObjectId,
		role: MessageRole,
		content: str,
	) -> "Message":
		"""Factory helper that assigns UTC timestamp."""
		return cls(
			chat_id=chat_id,
			user_id=user_id,
			role=role,
			content=content,
			created_at=datetime.now(timezone.utc),
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize the message for MongoDB insertion."""
		payload = asdict(self)
		payload.pop("_id")
		return payload
