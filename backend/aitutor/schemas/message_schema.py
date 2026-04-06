"""Pydantic schemas for chat message endpoints."""
from datetime import datetime

from typing import Optional

from pydantic import BaseModel, Field


class CreateMessageRequest(BaseModel):
	"""Request body for creating a chat message."""

	chat_id: str = Field(..., min_length=1)
	user_id: str = Field(..., min_length=1)
	role: str = Field(..., pattern="^(user|assistant)$")
	content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
	"""Response model returned when listing or creating messages."""

	id: str
	chat_id: str
	user_id: str
	role: str
	content: str
	created_at: datetime
	message_index: Optional[int] = None
	response_level: Optional[str] = None


class SendMessageRequest(BaseModel):
	"""Request body for sending a chat message and receiving a reply."""

	chat_id: str = Field(..., min_length=1)
	user_id: str = Field(..., min_length=1)
	content: str = Field(..., min_length=1)
	api_prompt: Optional[str] = Field(default=None)
	
	# Educational mode settings
	difficulty_level: Optional[str] = Field(default="Neutral")
	session_subject: Optional[str] = Field(default="Anyone")
	
	# Optional fields for stop handling (Phase 2)
	# stopped: indicates if user stopped rendering mid-way
	# stop_index: character index where rendering was stopped
	stopped: Optional[bool] = Field(default=False)
	stop_index: Optional[int] = Field(default=None)


class QuizAnswerRequest(BaseModel):
	"""Request body for submitting a quiz answer and getting AI feedback."""

	chat_id: str = Field(..., min_length=1)
	user_id: str = Field(..., min_length=1)
	topic: str = Field(..., min_length=1)
	question: str = Field(..., min_length=1)
	options: dict = Field(...)
	selected_option: str = Field(..., min_length=1)
	correct_option: str = Field(..., min_length=1)
	explanation: str = Field(default="")
	difficulty_level: Optional[str] = Field(default="Neutral")
	session_subject: Optional[str] = Field(default="Anyone")
