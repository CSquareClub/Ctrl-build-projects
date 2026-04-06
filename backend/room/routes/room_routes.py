from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
from ..schemas import (
	RoomCreateRequest, RoomJoinRequest, RoomInviteRequest,
	RoomResponse, RoomListResponse,
	MessageCreateRequest, MessageResponse, MessageListResponse
)
from ..services import (
	create_room, join_room_by_code, invite_user_by_username,
	get_room_by_id, get_rooms_for_user, send_message, get_messages
)

router = APIRouter(prefix="/api/room", tags=["Study Room"])

def get_current_user(x_username: str = Header(...)) -> str:
	"""Middleware to fetch current username from headers for this isolated module."""
	if not x_username:
		raise HTTPException(status_code=401, detail="Header X-Username missing")
	return x_username

@router.post("/create", response_model=RoomResponse)
async def api_create_room(req: RoomCreateRequest, x_username: str = Depends(get_current_user)):
	"""Creates a new study room and assigns the requester as Admin."""
	result = await create_room(req.name, admin_username=x_username)
	return result

@router.post("/join", response_model=RoomResponse)
async def api_join_room(req: RoomJoinRequest, x_username: str = Depends(get_current_user)):
	"""Joins a study room using a valid invite code."""
	result = await join_room_by_code(req.invite_code, x_username)
	return result

@router.post("/{room_id}/invite")
async def api_invite_user(room_id: str, req: RoomInviteRequest, x_username: str = Depends(get_current_user)):
	"""Invites a user into a study room."""
	result = await invite_user_by_username(
		room_id=room_id, 
		inviter_username=x_username, 
		target_username=req.target_username
	)
	return result

@router.get("/my-rooms", response_model=RoomListResponse)
async def api_get_my_rooms(x_username: str = Depends(get_current_user)):
	"""Gets all rooms the current user is a part of."""
	rooms = await get_rooms_for_user(x_username)
	return {"rooms": rooms}

@router.post("/{room_id}/messages", response_model=MessageResponse)
async def api_send_message(room_id: str, req: MessageCreateRequest, x_username: str = Depends(get_current_user)):
	"""Sends a message within the study room."""
	result = await send_message(room_id, sender_username=x_username, content=req.content)
	return result

@router.get("/{room_id}/messages", response_model=MessageListResponse)
async def api_get_messages(room_id: str, x_username: str = Depends(get_current_user)):
	"""Fetches chat history for the study room."""
	messages = await get_messages(room_id, username=x_username)
	return {"messages": messages}
