"""Domain model representing a room join request."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional

JoinRequestStatus = Literal["pending", "approved", "rejected"]


@dataclass(slots=True)
class RoomJoinRequest:
	"""Represents a user request to join a room by invite code."""
	room_id: str
	requester_username: str
	status: JoinRequestStatus
	created_at: datetime
	reviewed_at: Optional[datetime] = None
	reviewed_by: Optional[str] = None
	_id: Optional[str] = None

	@classmethod
	def create(cls, *, room_id: str, requester_username: str) -> "RoomJoinRequest":
		"""Factory helper for new pending join requests."""
		return cls(
			room_id=room_id,
			requester_username=requester_username,
			status="pending",
			created_at=datetime.now(timezone.utc),
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize for MongoDB persistence."""
		return {
			"room_id": self.room_id,
			"requester_username": self.requester_username,
			"status": self.status,
			"created_at": self.created_at,
			"reviewed_at": self.reviewed_at,
			"reviewed_by": self.reviewed_by,
		}
