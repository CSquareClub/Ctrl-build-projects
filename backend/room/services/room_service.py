import uuid
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from ..models import Room, RoomMember, RoomMessage
from fastapi import HTTPException

# Collections
ROOM_COLLECTION = "study_rooms"
MEMBER_COLLECTION = "study_room_members"
MESSAGE_COLLECTION = "study_room_messages"
USER_COLLECTION = "users"

async def _get_db():
	return await get_database()

def generate_invite_code(length: int = 8) -> str:
	import secrets
	import string
	return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))

async def create_room(name: str, admin_username: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]

	invite_code = generate_invite_code()
	
	new_room = Room.create(
		name=name,
		admin_username=admin_username,
		invite_code=invite_code
	)
	
	room_doc = new_room.to_document()
	result = await rooms_coll.insert_one(room_doc)
	room_id = str(result.inserted_id)
	
	# Add the creator as Admin
	new_member = RoomMember.create(
		room_id=room_id,
		username=admin_username,
		role="admin"
	)
	await members_coll.insert_one(new_member.to_document())
	
	return await get_room_by_id(room_id)

async def join_room_by_code(invite_code: str, username: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]

	room_doc = await rooms_coll.find_one({"invite_code": invite_code})
	if not room_doc:
		raise HTTPException(status_code=404, detail="Room not found by invite code")
		
	room_id = str(room_doc["_id"])
	
	# Check if user is already a member
	existing_member = await members_coll.find_one({"room_id": room_id, "username": username})
	if existing_member:
		return await get_room_by_id(room_id)
		
	# Add member
	new_member = RoomMember.create(
		room_id=room_id,
		username=username,
		role="member"
	)
	await members_coll.insert_one(new_member.to_document())
	
	return await get_room_by_id(room_id)

async def invite_user_by_username(room_id: str, inviter_username: str, target_username: str) -> dict:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	users_coll = db[USER_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]

	# Validate room
	room = await rooms_coll.find_one({"_id": ObjectId(room_id)})
	if not room:
		raise HTTPException(status_code=404, detail="Room not found")

	# Check if inviter is in the room
	inviter_member = await members_coll.find_one({"room_id": room_id, "username": inviter_username})
	if not inviter_member:
		raise HTTPException(status_code=403, detail="You are not a member of this room")
	
	# Validate target user exists globally
	target_user = await users_coll.find_one({"username": target_username})
	if not target_user:
		raise HTTPException(status_code=404, detail="Target user not found on the platform")

	# Check if target user is already in the room
	existing_member = await members_coll.find_one({"room_id": room_id, "username": target_username})
	if existing_member:
		raise HTTPException(status_code=400, detail="User is already in this room")

	# Invite/Add member directly for now
	new_member = RoomMember.create(
		room_id=room_id,
		username=target_username,
		role="member"
	)
	await members_coll.insert_one(new_member.to_document())
	
	return {"message": f"Successfully added {target_username} to the room."}

async def get_room_by_id(room_id: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	
	doc = await rooms_coll.find_one({"_id": ObjectId(room_id)})
	if doc:
		return _format_room_doc(doc)
	raise HTTPException(status_code=404, detail="Room not found")

async def get_rooms_for_user(username: str) -> List[dict]:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]
	
	# Find all room IDs user belongs to
	member_docs = await members_coll.find({"username": username}).to_list(length=100)
	room_ids = [ObjectId(d["room_id"]) for d in member_docs]
	
	if not room_ids:
		return []
		
	# Fetch rooms
	rooms = await rooms_coll.find({"_id": {"$in": room_ids}}).to_list(length=100)
	return [_format_room_doc(r) for r in rooms]

# --- Message Services ---

async def send_message(room_id: str, sender_username: str, content: str) -> dict:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	messages_coll = db[MESSAGE_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]

	room = await rooms_coll.find_one({"_id": ObjectId(room_id)})
	if not room:
		raise HTTPException(status_code=404, detail="Room not found")

	member = await members_coll.find_one({"room_id": room_id, "username": sender_username})
	if not member:
		raise HTTPException(status_code=403, detail="You are not a member of this room")
		
	new_message = RoomMessage.create(
		room_id=room_id,
		sender_username=sender_username,
		content=content
	)
	
	doc = new_message.to_document()
	result = await messages_coll.insert_one(doc)
	doc["_id"] = result.inserted_id
	
	return _format_message_doc(doc)

async def get_messages(room_id: str, username: str) -> List[dict]:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	messages_coll = db[MESSAGE_COLLECTION]

	member = await members_coll.find_one({"room_id": room_id, "username": username})
	if not member:
		raise HTTPException(status_code=403, detail="You are not a member of this room")
		
	messages = await messages_coll.find({"room_id": room_id}).sort("sent_at", 1).to_list(length=500)
	return [_format_message_doc(m) for m in messages]

# -- Helpers ---

def _format_room_doc(doc: dict) -> dict:
	doc["id"] = str(doc.pop("_id"))
	return doc

def _format_message_doc(doc: dict) -> dict:
	doc["id"] = str(doc.pop("_id"))
	return doc
