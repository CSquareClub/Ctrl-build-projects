"""HTTP routes for chat metadata operations."""
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from models.chat import Chat
from schemas.chat_schema import ChatCreate, ChatListResponse, ChatResponse


router = APIRouter(prefix="/chats", tags=["chats"])

DEFAULT_CHAT_TITLE = "New Chat"


def _resolve_title(raw_title: Optional[str]) -> str:
    """Return a sanitized title or the default when none is provided."""
    if not raw_title:
        return DEFAULT_CHAT_TITLE
    cleaned = raw_title.strip()
    return cleaned if cleaned else DEFAULT_CHAT_TITLE


def _parse_object_id(raw_id: str) -> ObjectId:
	"""Safely convert a string into a MongoDB ObjectId."""
	if not ObjectId.is_valid(raw_id):
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user_id")
	return ObjectId(raw_id)


@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
	payload: ChatCreate,
	db: AsyncIOMotorDatabase = Depends(get_database),
):
	"""Create a new chat document for the supplied user."""
	user_object_id = _parse_object_id(payload.user_id)

	user_exists = await db["users"].find_one({"_id": user_object_id})
	if not user_exists:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	title = _resolve_title(payload.title)
	chat = Chat.create(user_id=user_object_id, title=title)
	document = chat.to_document()

	result = await db["chats"].insert_one(document)

	return ChatResponse(
		id=str(result.inserted_id),
		title=document["title"],
		created_at=document["created_at"],
	)


@router.get("/{user_id}", response_model=ChatListResponse)
async def list_chats(
	user_id: str,
	db: AsyncIOMotorDatabase = Depends(get_database),
):
	"""
	Fetch chats for a user sorted by newest first.
	
	SOFT DELETE FILTER:
	- Only returns chats where deleted_at is null (active chats)
	- Soft-deleted chats remain in DB but are hidden from user
	"""
	user_object_id = _parse_object_id(user_id)

	user_exists = await db["users"].find_one({"_id": user_object_id})
	if not user_exists:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

	# SOFT DELETE: Filter out deleted chats (deleted_at must be null or not exist)
	cursor = (
		db["chats"]
		.find({
			"user_id": user_object_id,
			"deleted_at": {"$eq": None}  # Only active (non-deleted) chats
		})
		.sort("created_at", -1)
	)

	chats: list[ChatResponse] = []
	async for document in cursor:
		chats.append(
			ChatResponse(
				id=str(document["_id"]),
				title=document.get("title", DEFAULT_CHAT_TITLE),
				created_at=document["created_at"],
			)
		)

	return ChatListResponse(chats=chats)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
	chat_id: str,
	user_id: str,
	db: AsyncIOMotorDatabase = Depends(get_database),
):
	"""
	SOFT DELETE a chat.
	
	Behavior:
	- Sets deleted_at = current datetime (marks as deleted)
	- Chat remains in MongoDB for audit/recovery
	- Messages are NOT touched
	- Chat will no longer appear in list_chats
	
	Security:
	- Validates chat belongs to the requesting user
	"""
	from datetime import datetime, timezone
	
	chat_object_id = _parse_object_id(chat_id)
	user_object_id = _parse_object_id(user_id)

	# Verify chat exists and belongs to user
	chat = await db["chats"].find_one({"_id": chat_object_id, "user_id": user_object_id})
	if not chat:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Chat not found or access denied"
		)
	
	# Check if already deleted
	if chat.get("deleted_at") is not None:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Chat already deleted"
		)

	# SOFT DELETE: Set deleted_at timestamp instead of removing document
	await db["chats"].update_one(
		{"_id": chat_object_id},
		{"$set": {"deleted_at": datetime.now(timezone.utc)}}
	)
	
	# Return 204 No Content on success
	return None


@router.post("/{chat_id}/cleanup", status_code=status.HTTP_200_OK)
async def cleanup_empty_chat(
	chat_id: str,
	user_id: str,
	db: AsyncIOMotorDatabase = Depends(get_database),
):
	"""
	AUTO-CLEANUP: Soft delete empty chats to prevent blank entries in sidebar.
	
	Definition:
	- An "empty chat" = a chat with ZERO messages (user or assistant).
	
	Behavior:
	- If chat has 0 messages:
	    - Set deleted_at = current timestamp (soft delete)
	    - Set title = "Empty chat" (for audit trail)
	- If chat has messages:
	    - Do nothing, return success
	
	Called when:
	- User switches to another chat
	- User creates a new chat
	- User reloads/closes the page
	
	Security:
	- Validates chat exists and belongs to the requesting user
	"""
	from datetime import datetime, timezone
	
	chat_object_id = _parse_object_id(chat_id)
	user_object_id = _parse_object_id(user_id)

	# Verify chat exists and belongs to user
	chat = await db["chats"].find_one({"_id": chat_object_id, "user_id": user_object_id})
	if not chat:
		# Chat doesn't exist or doesn't belong to user - silently succeed
		# (may have been deleted already, or never created)
		return {"cleaned": False, "reason": "chat_not_found"}
	
	# Already deleted - no action needed
	if chat.get("deleted_at") is not None:
		return {"cleaned": False, "reason": "already_deleted"}

	# Count messages for this chat
	message_count = await db["messages"].count_documents({"chat_id": chat_object_id})
	
	if message_count == 0:
		# EMPTY CHAT: Soft delete with "Empty chat" title for audit
		await db["chats"].update_one(
			{"_id": chat_object_id},
			{"$set": {
				"deleted_at": datetime.now(timezone.utc),
				"title": "Empty chat"
			}}
		)
		return {"cleaned": True, "reason": "empty_chat_deleted"}
	
	# Chat has messages - do NOT delete
	return {"cleaned": False, "reason": "chat_has_messages"}
