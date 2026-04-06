"""Pydantic schemas for Room request and response validation."""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List

class RoomCreateRequest(BaseModel):
	name: str = Field(..., min_length=1, max_length=100)

class RoomJoinRequest(BaseModel):
	invite_code: str = Field(..., min_length=4)

class RoomInviteRequest(BaseModel):
	target_username: str = Field(..., min_length=1)

class RoomResponse(BaseModel):
	id: str
	name: str
	admin_username: str
	invite_code: str
	created_at: datetime
	
	model_config = ConfigDict(from_attributes=True)

class RoomListResponse(BaseModel):
	rooms: List[RoomResponse]
