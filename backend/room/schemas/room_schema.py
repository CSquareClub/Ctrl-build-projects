"""Pydantic schemas for Room request and response validation."""
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime
from typing import Optional, List

class RoomCreateRequest(BaseModel):
	name: str = Field(..., min_length=1, max_length=100)
	description: str = Field(default="", max_length=500)

class RoomJoinRequest(BaseModel):
	invite_code: str = Field(..., min_length=4)

class RoomJoinRequestResponse(BaseModel):
	message: str
	room_id: str
	room_name: str
	status: str

class RoomInviteRequest(BaseModel):
	target_username: str = Field(..., min_length=1)

class RoomRemoveMemberRequest(BaseModel):
	target_username: str = Field(..., min_length=1)

class RoomResponse(BaseModel):
	id: str
	name: str
	description: str
	admin_username: str
	invite_code: str
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)

class RoomListResponse(BaseModel):
	rooms: List[RoomResponse]

class RoomActionResponse(BaseModel):
	message: str

class RoomInvitationResponse(BaseModel):
	id: str
	room_id: str
	room_name: str
	inviter_username: str
	status: str
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)

class RoomInvitationListResponse(BaseModel):
	invitations: List[RoomInvitationResponse]

class RoomJoinApprovalResponse(BaseModel):
	id: str
	room_id: str
	room_name: str
	requester_username: str
	status: str
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)

class RoomJoinApprovalListResponse(BaseModel):
	requests: List[RoomJoinApprovalResponse]

class LeaveRoomResponse(BaseModel):
	message: str
	room_deleted: bool = False
	new_admin_username: Optional[str] = None
