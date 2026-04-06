"""Domain model representing an authenticated user account."""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional, Literal


# Deletion status values:
# - "none": Account is active (default)
# - "scheduled": User requested deletion, 30-day grace period started
# - "cancelled": User logged in and cancelled scheduled deletion
# - "deleted": Account is soft-deleted after 30 days
DeletionStatus = Literal["none", "scheduled", "cancelled", "deleted"]


@dataclass(slots=True)
class User:
	"""
	Represents a persisted user document.
	
	Deletion System:
	- deletion_status: Current state of account deletion
	- deletion_requested_at: Timestamp when deletion was requested (for 30-day calculation)
	"""

	username: str
	password_hash: str
	created_at: datetime
	deletion_status: DeletionStatus = "none"
	deletion_requested_at: Optional[datetime] = None
	_id: Optional[str] = None

	@classmethod
	def create(cls, *, username: str, password_hash: str) -> "User":
		"""
		Factory helper to create a new user with defaults.
		
		Defaults:
		- created_at = current UTC time
		- deletion_status = "none"
		- deletion_requested_at = None
		"""
		return cls(
			username=username,
			password_hash=password_hash,
			created_at=datetime.now(timezone.utc),
			deletion_status="none",
			deletion_requested_at=None,
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize the user for MongoDB insertion."""
		payload = asdict(self)
		payload.pop("_id")
		return payload
