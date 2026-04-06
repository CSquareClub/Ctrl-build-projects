"""Domain model representing a study room."""
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

@dataclass(slots=True)
class Room:
	"""Represents a created study room."""
	name: str
	admin_username: str
	invite_code: str
	created_at: datetime
	_id: Optional[str] = None

	@classmethod
	def create(cls, *, name: str, admin_username: str, invite_code: str) -> "Room":
		"""Factory logic to generate a new Room with safe defaults."""
		return cls(
			name=name,
			admin_username=admin_username,
			invite_code=invite_code,
			created_at=datetime.now(timezone.utc)
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize for MongoDB."""
		return {
			"name": self.name,
			"admin_username": self.admin_username,
			"invite_code": self.invite_code,
			"created_at": self.created_at,
		}
