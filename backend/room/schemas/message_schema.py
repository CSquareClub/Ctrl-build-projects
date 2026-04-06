"""Pydantic schemas for Room Message and Membership validation."""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List
from ..models.room_member import MemberRole

class MessageCreateRequest(BaseModel):
	content: str = Field(..., min_length=1)

class MessageResponse(BaseModel):
	id: str
	room_id: str
	sender_username: str
	content: str
	sent_at: datetime

	model_config = ConfigDict(from_attributes=True)

class MessageListResponse(BaseModel):
	messages: List[MessageResponse]

class MemberResponse(BaseModel):
	id: str
	room_id: str
	username: str
	role: MemberRole
	joined_at: datetime

	model_config = ConfigDict(from_attributes=True)

class MemberListResponse(BaseModel):
	members: List[MemberResponse]
