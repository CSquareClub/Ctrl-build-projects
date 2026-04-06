"""Domain model representing a member inside a study room."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Literal

MemberRole = Literal["admin", "member"]

@dataclass(slots=True)
class RoomMember:
	"""Represents the mapping of a user to a specific study room."""
	room_id: str
	username: str
	role: MemberRole
	joined_at: datetime
	_id: Optional[str] = None

	@classmethod
	def create(cls, *, room_id: str, username: str, role: MemberRole = "member") -> "RoomMember":
		"""Factory logic to map a new member to a room."""
		return cls(
			room_id=room_id,
			username=username,
			role=role,
			joined_at=datetime.now(timezone.utc)
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize for MongoDB."""
		return {
			"room_id": self.room_id,
			"username": self.username,
			"role": self.role,
			"joined_at": self.joined_at,
		}
