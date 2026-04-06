from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional, List
from ..schemas import (
	RoomCreateRequest, RoomJoinRequest, RoomJoinRequestResponse, RoomInviteRequest,
	RoomRemoveMemberRequest, RoomResponse, RoomListResponse,
	RoomActionResponse, RoomInvitationListResponse, RoomJoinApprovalListResponse,
	LeaveRoomResponse,
	MessageCreateRequest, MessageResponse, MessageListResponse,
	MemberListResponse
)
from ..services import (
	create_room, join_room_by_code, invite_user_by_username,
	get_pending_invitations, accept_invitation, reject_invitation,
	get_join_requests, approve_join_request, reject_join_request,
	get_room_by_id, get_rooms_for_user, send_message, get_messages,
	get_room_members, remove_member_from_room, leave_room, delete_room
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
	result = await create_room(req.name, description=req.description, admin_username=x_username)
	return result

@router.post("/join", response_model=RoomJoinRequestResponse)
async def api_join_room(req: RoomJoinRequest, x_username: str = Depends(get_current_user)):
	"""Creates a join request using a room invite code."""
	result = await join_room_by_code(req.invite_code, x_username)
	return result

@router.post("/{room_id}/invite", response_model=RoomActionResponse)
async def api_invite_user(room_id: str, req: RoomInviteRequest, x_username: str = Depends(get_current_user)):
	"""Sends an invitation to a user. User must accept to join."""
	result = await invite_user_by_username(
		room_id=room_id,
		inviter_username=x_username,
		target_username=req.target_username
	)
	return result

@router.get("/invitations/me", response_model=RoomInvitationListResponse)
async def api_get_my_invitations(x_username: str = Depends(get_current_user)):
	"""Returns pending invitations for the current user."""
	invitations = await get_pending_invitations(x_username)
	return {"invitations": invitations}

@router.post("/invitations/{invitation_id}/accept", response_model=RoomActionResponse)
async def api_accept_invitation(invitation_id: str, x_username: str = Depends(get_current_user)):
	"""Accept an invitation and join the corresponding room."""
	result = await accept_invitation(invitation_id, x_username)
	return result

@router.post("/invitations/{invitation_id}/reject", response_model=RoomActionResponse)
async def api_reject_invitation(invitation_id: str, x_username: str = Depends(get_current_user)):
	"""Reject an invitation."""
	result = await reject_invitation(invitation_id, x_username)
	return result

@router.get("/{room_id}/join-requests", response_model=RoomJoinApprovalListResponse)
async def api_get_join_requests(room_id: str, x_username: str = Depends(get_current_user)):
	"""List pending join requests for a room. Admin only."""
	requests = await get_join_requests(room_id, x_username)
	return {"requests": requests}

@router.post("/{room_id}/join-requests/{request_id}/approve", response_model=RoomActionResponse)
async def api_approve_join_request(room_id: str, request_id: str, x_username: str = Depends(get_current_user)):
	"""Approve a pending join request. Admin only."""
	result = await approve_join_request(room_id, request_id, x_username)
	return result

@router.post("/{room_id}/join-requests/{request_id}/reject", response_model=RoomActionResponse)
async def api_reject_join_request(room_id: str, request_id: str, x_username: str = Depends(get_current_user)):
	"""Reject a pending join request. Admin only."""
	result = await reject_join_request(room_id, request_id, x_username)
	return result

@router.get("/{room_id}/members", response_model=MemberListResponse)
async def api_get_members(room_id: str, x_username: str = Depends(get_current_user)):
	"""Lists all members of a room for current user."""
	members = await get_room_members(room_id, x_username)
	return {"members": members}

@router.post("/{room_id}/remove-member", response_model=RoomActionResponse)
async def api_remove_member(room_id: str, req: RoomRemoveMemberRequest, x_username: str = Depends(get_current_user)):
	"""Removes a member from a room. Admin only."""
	result = await remove_member_from_room(room_id, admin_username=x_username, target_username=req.target_username)
	return result

@router.post("/{room_id}/leave", response_model=LeaveRoomResponse)
async def api_leave_room(room_id: str, x_username: str = Depends(get_current_user)):
	"""Leave a room. Admin is not allowed to leave without deleting room."""
	result = await leave_room(room_id, x_username)
	return result

@router.delete("/{room_id}", response_model=RoomActionResponse)
async def api_delete_room(room_id: str, x_username: str = Depends(get_current_user)):
	"""Deletes an entire room. Admin only."""
	result = await delete_room(room_id, admin_username=x_username)
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
