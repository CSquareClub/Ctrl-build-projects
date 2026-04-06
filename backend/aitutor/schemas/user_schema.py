"""Pydantic schemas for authentication endpoints."""
from typing import Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
	"""Request body for registering a user."""

	username: str = Field(..., min_length=3)
	password: str = Field(..., min_length=4)


class LoginRequest(BaseModel):
	"""Request body for authenticating a user."""

	username: str = Field(..., min_length=3)
	password: str = Field(..., min_length=4)


class UserResponse(BaseModel):
	"""
	Response body returned after register/login.
	
	Deletion status values:
	- "none": Account is active (default)
	- "scheduled": Account is scheduled for deletion (30-day waiting period)
	- "cancelled": User logged in and cancelled scheduled deletion
	- "deleted": Account is soft-deleted (login blocked)
	"""

	id: str
	username: str
	deletion_status: Optional[str] = "none"
