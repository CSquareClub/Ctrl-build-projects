"""Pydantic schemas for password reset endpoints."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ========================
# REQUEST SCHEMAS
# ========================

class CheckExistingResetRequest(BaseModel):
	"""Request to check if an active reset request exists for a user."""
	username: str = Field(..., min_length=3)


class CreateResetRequest(BaseModel):
	"""Request to create/update a password reset request."""
	username: str = Field(..., min_length=3)
	email: str = Field(..., min_length=5, description="Contact email for verification")
	message: Optional[str] = Field(None, max_length=500, description="Optional message from user")


class VerifyTokenRequest(BaseModel):
	"""Request to verify the reset token."""
	username: str = Field(..., min_length=3)
	reset_token: str = Field(..., min_length=1, description="Reset token to verify")


class ResetPasswordRequest(BaseModel):
	"""Request to reset the password after hash verification."""
	username: str = Field(..., min_length=3)
	new_password: str = Field(..., min_length=4)
	confirm_password: str = Field(..., min_length=4)


class CancelResetRequest(BaseModel):
	"""Request to cancel an existing reset request."""
	username: str = Field(..., min_length=3)


# ========================
# RESPONSE SCHEMAS
# ========================

class ResetRequestStatus(BaseModel):
	"""Response showing current reset request status."""
	exists: bool
	has_active_request: bool = False  # Alias for frontend compatibility
	status: Optional[str] = None
	email: Optional[str] = None
	created_at: Optional[datetime] = None
	can_verify_token: bool = False  # True when status is token_sent


class ResetRequestResponse(BaseModel):
	"""Response after creating/updating a reset request."""
	success: bool
	message: str
	status: str


class TokenVerifyResponse(BaseModel):
	"""Response after verifying reset token."""
	verified: bool
	message: str


class PasswordResetResponse(BaseModel):
	"""Response after password reset completion."""
	success: bool
	message: str
