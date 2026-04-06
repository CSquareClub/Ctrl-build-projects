"""Domain model for password reset requests.

Email is collected ONLY during password reset for contact/verification purposes.
It is NOT stored in user accounts.

Token-based verification flow:
1. User submits request -> status = pending
2. Request created with random reset_token -> status = token_sent
3. Admin sends token to user's email
4. User enters token to verify -> proceeds to password reset
5. Password reset -> status = completed, token invalidated

Statuses:
- pending: Request submitted (legacy, transitions immediately to token_sent)
- token_sent: Reset token generated and ready for verification
- completed: Password successfully reset
- cancelled: Request was cancelled
"""
from dataclasses import dataclass, asdict, field
from datetime import datetime, timezone
from typing import Optional
from enum import Enum
import secrets
import string


def generate_reset_token(length: int = 10) -> str:
	"""Generate a random alphanumeric reset token."""
	alphabet = string.ascii_uppercase + string.digits
	return ''.join(secrets.choice(alphabet) for _ in range(length))


class ResetStatus(str, Enum):
	"""Password reset request status."""
	PENDING = "pending"  # Legacy, kept for compatibility
	TOKEN_SENT = "token_sent"  # Token generated and ready for verification
	COMPLETED = "completed"
	CANCELLED = "cancelled"


@dataclass(slots=True)
class PasswordResetRequest:
	"""Represents a password reset request document."""

	username: str
	email: str
	status: str
	created_at: datetime
	updated_at: datetime
	reset_token: Optional[str] = None  # Random alphanumeric token for verification
	message: Optional[str] = None
	_id: Optional[str] = None

	@classmethod
	def create(
		cls,
		*,
		username: str,
		email: str,
		message: Optional[str] = None
	) -> "PasswordResetRequest":
		"""Factory helper to create a new reset request with generated token."""
		now = datetime.now(timezone.utc)
		return cls(
			username=username,
			email=email,
			message=message,
			reset_token=generate_reset_token(10),  # Generate 10-char random token
			status=ResetStatus.TOKEN_SENT.value,  # Immediately ready for verification
			created_at=now,
			updated_at=now,
		)

	def to_document(self) -> dict[str, object]:
		"""Serialize the request for MongoDB insertion."""
		payload = asdict(self)
		payload.pop("_id")
		return payload
