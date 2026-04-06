"""Domain model representing a room invitation."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional

InvitationStatus = Literal["pending", "accepted", "rejected"]


@dataclass(slots=True)
class RoomInvitation:
	"""Represents an invitation sent by room admin to a user."""
	room_id: str
	inviter_username: str
	target_username: str
	status: InvitationStatus
	created_at: datetime
	responded_at: Optional[datetime] = None
	_id: Optional[str] = None

	@classmethod
	def create(cls, *, room_id: str, inviter_username: str, target_username: str) -> "RoomInvitation":
		"""Factory helper for new pending invitation records."""
		return cls(
			room_id=room_id,
			inviter_username=inviter_username,
			target_username=target_username,
			status="pending",
			created_at=datetime.now(timezone.utc),
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize for MongoDB persistence."""
		return {
			"room_id": self.room_id,
			"inviter_username": self.inviter_username,
			"target_username": self.target_username,
			"status": self.status,
			"created_at": self.created_at,
			"responded_at": self.responded_at,
		}
