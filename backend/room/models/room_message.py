"""Domain model representing a message sent in a study room."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

@dataclass(slots=True)
class RoomMessage:
	"""Represents a chat message within a study room."""
	room_id: str
	sender_username: str
	content: str
	sent_at: datetime
	_id: Optional[str] = None

	@classmethod
	def create(cls, *, room_id: str, sender_username: str, content: str) -> "RoomMessage":
		"""Factory logic to create a new message."""
		return cls(
			room_id=room_id,
			sender_username=sender_username,
			content=content,
			sent_at=datetime.now(timezone.utc)
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize for MongoDB."""
		return {
			"room_id": self.room_id,
			"sender_username": self.sender_username,
			"content": self.content,
			"sent_at": self.sent_at,
		}
