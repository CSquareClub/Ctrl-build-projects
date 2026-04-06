"""Pydantic schemas for chat endpoints."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChatCreate(BaseModel):
	"""Request body for creating a chat."""

	user_id: str = Field(..., min_length=1)
	title: Optional[str] = Field(default=None)


class ChatResponse(BaseModel):
	"""Response model representing an individual chat."""

	id: str
	title: str
	created_at: datetime


class ChatListResponse(BaseModel):
	"""Wrapper for returning a list of chats."""

	chats: list[ChatResponse]
