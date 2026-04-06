from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import HTTPException

from app.database import get_database
from ..models import Room, RoomInvitation, RoomJoinRequest, RoomMember, RoomMessage

# Collections
ROOM_COLLECTION = "study_rooms"
MEMBER_COLLECTION = "study_room_members"
MESSAGE_COLLECTION = "study_room_messages"
INVITATION_COLLECTION = "study_room_invitations"
JOIN_REQUEST_COLLECTION = "study_room_join_requests"
USER_COLLECTION = "users"

# Status values
STATUS_PENDING = "pending"
STATUS_ACCEPTED = "accepted"
STATUS_REJECTED = "rejected"
STATUS_APPROVED = "approved"


def _utcnow() -> datetime:
	return datetime.now(timezone.utc)


async def _get_db():
	return get_database()


def _to_object_id(value: str, label: str = "id") -> ObjectId:
	if not ObjectId.is_valid(value):
		raise HTTPException(status_code=400, detail=f"Invalid {label}")
	return ObjectId(value)


def generate_invite_code(length: int = 8) -> str:
	import secrets
	import string

	return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))


async def _get_room_doc_or_404(rooms_coll, room_id: str) -> dict:
	room_doc = await rooms_coll.find_one({"_id": _to_object_id(room_id, "room id")})
	if not room_doc:
		raise HTTPException(status_code=404, detail="Room not found")
	return room_doc


async def _get_member_doc(members_coll, room_id: str, username: str) -> dict:
	member_doc = await members_coll.find_one({"room_id": room_id, "username": username})
	if not member_doc:
		raise HTTPException(status_code=403, detail="You are not a member of this room")
	return member_doc


async def _require_admin(room_doc: dict, member_doc: dict, username: str):
	if room_doc.get("admin_username") != username or member_doc.get("role") != "admin":
		raise HTTPException(status_code=403, detail="Only room admin can perform this action")


async def create_room(name: str, description: str, admin_username: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]

	invite_code = generate_invite_code()

	new_room = Room.create(
		name=name,
		description=description,
		admin_username=admin_username,
		invite_code=invite_code,
	)

	room_doc = new_room.to_document()
	result = await rooms_coll.insert_one(room_doc)
	room_id = str(result.inserted_id)

	new_member = RoomMember.create(room_id=room_id, username=admin_username, role="admin")
	await members_coll.insert_one(new_member.to_document())

	return await get_room_by_id(room_id)


async def join_room_by_code(invite_code: str, username: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]

	room_doc = await rooms_coll.find_one({"invite_code": invite_code})
	if not room_doc:
		raise HTTPException(status_code=404, detail="Room not found by invite code")

	room_id = str(room_doc["_id"])
	room_name = room_doc.get("name", "Room")

	existing_member = await members_coll.find_one({"room_id": room_id, "username": username})
	if existing_member:
		return {
			"message": "You are already a member of this room.",
			"room_id": room_id,
			"room_name": room_name,
			"status": "already-member",
		}

	existing_request = await join_requests_coll.find_one(
		{"room_id": room_id, "requester_username": username, "status": STATUS_PENDING}
	)
	if existing_request:
		return {
			"message": "Join request already pending admin approval.",
			"room_id": room_id,
			"room_name": room_name,
			"status": STATUS_PENDING,
		}

	join_request = RoomJoinRequest.create(room_id=room_id, requester_username=username)
	await join_requests_coll.insert_one(join_request.to_document())

	return {
		"message": "Join request sent. Wait for admin approval.",
		"room_id": room_id,
		"room_name": room_name,
		"status": STATUS_PENDING,
	}


async def invite_user_by_username(room_id: str, inviter_username: str, target_username: str) -> dict:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]
	invitations_coll = db[INVITATION_COLLECTION]

	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)
	inviter_member = await _get_member_doc(members_coll, room_id, inviter_username)
	await _require_admin(room_doc, inviter_member, inviter_username)

	if inviter_username == target_username:
		raise HTTPException(status_code=400, detail="Admin cannot invite themselves")

	existing_member = await members_coll.find_one({"room_id": room_id, "username": target_username})
	if existing_member:
		raise HTTPException(status_code=400, detail="User is already in this room")

	pending_invite = await invitations_coll.find_one(
		{"room_id": room_id, "target_username": target_username, "status": STATUS_PENDING}
	)
	if pending_invite:
		raise HTTPException(status_code=400, detail="Invitation already pending for this user")

	invitation = RoomInvitation.create(
		room_id=room_id,
		inviter_username=inviter_username,
		target_username=target_username,
	)
	await invitations_coll.insert_one(invitation.to_document())

	return {"message": f"Invitation sent to {target_username}."}


async def get_pending_invitations(username: str) -> List[dict]:
	db = await _get_db()
	invitations_coll = db[INVITATION_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]

	invitations = await invitations_coll.find(
		{"target_username": username, "status": STATUS_PENDING}
	).sort("created_at", -1).to_list(length=200)

	if not invitations:
		return []

	room_ids = [
		_to_object_id(doc["room_id"], "room id")
		for doc in invitations
		if ObjectId.is_valid(doc.get("room_id", ""))
	]
	room_docs = await rooms_coll.find({"_id": {"$in": room_ids}}).to_list(length=200)
	room_map = {str(doc["_id"]): doc.get("name", "Room") for doc in room_docs}

	result = []
	for invitation in invitations:
		formatted = _format_invitation_doc(invitation)
		formatted["room_name"] = room_map.get(formatted["room_id"], "Room")
		result.append(formatted)

	return result


async def accept_invitation(invitation_id: str, username: str) -> dict:
	db = await _get_db()
	invitations_coll = db[INVITATION_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]

	invitation_doc = await invitations_coll.find_one(
		{"_id": _to_object_id(invitation_id, "invitation id"), "target_username": username}
	)
	if not invitation_doc:
		raise HTTPException(status_code=404, detail="Invitation not found")

	if invitation_doc.get("status") != STATUS_PENDING:
		raise HTTPException(status_code=400, detail="Invitation is no longer pending")

	room_id = invitation_doc["room_id"]
	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)

	existing_member = await members_coll.find_one({"room_id": room_id, "username": username})
	if not existing_member:
		member = RoomMember.create(room_id=room_id, username=username, role="member")
		await members_coll.insert_one(member.to_document())

	await invitations_coll.update_one(
		{"_id": invitation_doc["_id"]},
		{"$set": {"status": STATUS_ACCEPTED, "responded_at": _utcnow()}},
	)

	await join_requests_coll.update_many(
		{"room_id": room_id, "requester_username": username, "status": STATUS_PENDING},
		{"$set": {"status": STATUS_REJECTED, "reviewed_at": _utcnow(), "reviewed_by": "invitation-accepted"}},
	)

	return {"message": f"Invitation accepted. You joined {room_doc.get('name', 'room')}."}


async def reject_invitation(invitation_id: str, username: str) -> dict:
	db = await _get_db()
	invitations_coll = db[INVITATION_COLLECTION]

	invitation_doc = await invitations_coll.find_one(
		{"_id": _to_object_id(invitation_id, "invitation id"), "target_username": username}
	)
	if not invitation_doc:
		raise HTTPException(status_code=404, detail="Invitation not found")

	if invitation_doc.get("status") != STATUS_PENDING:
		raise HTTPException(status_code=400, detail="Invitation is no longer pending")

	await invitations_coll.update_one(
		{"_id": invitation_doc["_id"]},
		{"$set": {"status": STATUS_REJECTED, "responded_at": _utcnow()}},
	)

	return {"message": "Invitation rejected."}


async def get_join_requests(room_id: str, admin_username: str) -> List[dict]:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]

	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)
	admin_member_doc = await _get_member_doc(members_coll, room_id, admin_username)
	await _require_admin(room_doc, admin_member_doc, admin_username)

	join_requests = await join_requests_coll.find(
		{"room_id": room_id, "status": STATUS_PENDING}
	).sort("created_at", -1).to_list(length=200)

	result = []
	for request_doc in join_requests:
		formatted = _format_join_request_doc(request_doc)
		formatted["room_name"] = room_doc.get("name", "Room")
		result.append(formatted)

	return result


async def approve_join_request(room_id: str, request_id: str, admin_username: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]
	invitations_coll = db[INVITATION_COLLECTION]

	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)
	admin_member_doc = await _get_member_doc(members_coll, room_id, admin_username)
	await _require_admin(room_doc, admin_member_doc, admin_username)

	request_doc = await join_requests_coll.find_one(
		{"_id": _to_object_id(request_id, "join request id"), "room_id": room_id}
	)
	if not request_doc:
		raise HTTPException(status_code=404, detail="Join request not found")

	if request_doc.get("status") != STATUS_PENDING:
		raise HTTPException(status_code=400, detail="Join request is no longer pending")

	requester_username = request_doc["requester_username"]
	existing_member = await members_coll.find_one({"room_id": room_id, "username": requester_username})
	if not existing_member:
		new_member = RoomMember.create(room_id=room_id, username=requester_username, role="member")
		await members_coll.insert_one(new_member.to_document())

	await join_requests_coll.update_one(
		{"_id": request_doc["_id"]},
		{"$set": {"status": STATUS_APPROVED, "reviewed_at": _utcnow(), "reviewed_by": admin_username}},
	)

	await invitations_coll.update_many(
		{"room_id": room_id, "target_username": requester_username, "status": STATUS_PENDING},
		{"$set": {"status": STATUS_REJECTED, "responded_at": _utcnow()}},
	)

	return {"message": f"Approved join request for {requester_username}."}


async def reject_join_request(room_id: str, request_id: str, admin_username: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]

	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)
	admin_member_doc = await _get_member_doc(members_coll, room_id, admin_username)
	await _require_admin(room_doc, admin_member_doc, admin_username)

	request_doc = await join_requests_coll.find_one(
		{"_id": _to_object_id(request_id, "join request id"), "room_id": room_id}
	)
	if not request_doc:
		raise HTTPException(status_code=404, detail="Join request not found")

	if request_doc.get("status") != STATUS_PENDING:
		raise HTTPException(status_code=400, detail="Join request is no longer pending")

	await join_requests_coll.update_one(
		{"_id": request_doc["_id"]},
		{"$set": {"status": STATUS_REJECTED, "reviewed_at": _utcnow(), "reviewed_by": admin_username}},
	)

	return {"message": f"Rejected join request for {request_doc['requester_username']}."}


async def get_room_members(room_id: str, username: str) -> List[dict]:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]

	await _get_room_doc_or_404(rooms_coll, room_id)
	await _get_member_doc(members_coll, room_id, username)

	member_docs = await members_coll.find({"room_id": room_id}).to_list(length=200)
	member_docs.sort(key=lambda item: (item.get("role") != "admin", item.get("joined_at")))
	return [_format_member_doc(doc) for doc in member_docs]


async def remove_member_from_room(room_id: str, admin_username: str, target_username: str) -> dict:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]
	invitations_coll = db[INVITATION_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]

	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)
	admin_member_doc = await _get_member_doc(members_coll, room_id, admin_username)
	await _require_admin(room_doc, admin_member_doc, admin_username)

	if target_username == admin_username:
		raise HTTPException(status_code=400, detail="Admin cannot remove themselves")

	target_member = await members_coll.find_one({"room_id": room_id, "username": target_username})
	if not target_member:
		raise HTTPException(status_code=404, detail="Target member not found in this room")

	if target_member.get("role") == "admin":
		raise HTTPException(status_code=400, detail="Cannot remove the current admin")

	await members_coll.delete_one({"room_id": room_id, "username": target_username})
	await invitations_coll.update_many(
		{"room_id": room_id, "target_username": target_username, "status": STATUS_PENDING},
		{"$set": {"status": STATUS_REJECTED, "responded_at": _utcnow()}},
	)
	await join_requests_coll.update_many(
		{"room_id": room_id, "requester_username": target_username, "status": STATUS_PENDING},
		{"$set": {"status": STATUS_REJECTED, "reviewed_at": _utcnow(), "reviewed_by": admin_username}},
	)

	return {"message": f"Removed {target_username} from room."}


async def leave_room(room_id: str, username: str) -> dict:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]
	invitations_coll = db[INVITATION_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]

	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)
	member_doc = await _get_member_doc(members_coll, room_id, username)

	is_admin = room_doc.get("admin_username") == username and member_doc.get("role") == "admin"
	if is_admin:
		raise HTTPException(status_code=400, detail="Admin cannot leave room. Delete room instead.")

	await members_coll.delete_one({"room_id": room_id, "username": username})
	await invitations_coll.update_many(
		{"room_id": room_id, "target_username": username, "status": STATUS_PENDING},
		{"$set": {"status": STATUS_REJECTED, "responded_at": _utcnow()}},
	)
	await join_requests_coll.update_many(
		{"room_id": room_id, "requester_username": username, "status": STATUS_PENDING},
		{"$set": {"status": STATUS_REJECTED, "reviewed_at": _utcnow(), "reviewed_by": "self-left"}},
	)

	return {"message": "You left the room.", "room_deleted": False, "new_admin_username": None}


async def delete_room(room_id: str, admin_username: str) -> dict:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]
	messages_coll = db[MESSAGE_COLLECTION]
	invitations_coll = db[INVITATION_COLLECTION]
	join_requests_coll = db[JOIN_REQUEST_COLLECTION]

	room_doc = await _get_room_doc_or_404(rooms_coll, room_id)
	admin_member_doc = await _get_member_doc(members_coll, room_id, admin_username)
	await _require_admin(room_doc, admin_member_doc, admin_username)

	await rooms_coll.delete_one({"_id": _to_object_id(room_id, "room id")})
	await members_coll.delete_many({"room_id": room_id})
	await messages_coll.delete_many({"room_id": room_id})
	await invitations_coll.delete_many({"room_id": room_id})
	await join_requests_coll.delete_many({"room_id": room_id})

	return {"message": "Room deleted successfully."}


async def get_room_by_id(room_id: str) -> dict:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]

	doc = await rooms_coll.find_one({"_id": _to_object_id(room_id, "room id")})
	if doc:
		return _format_room_doc(doc)
	raise HTTPException(status_code=404, detail="Room not found")


async def get_rooms_for_user(username: str) -> List[dict]:
	db = await _get_db()
	rooms_coll = db[ROOM_COLLECTION]
	members_coll = db[MEMBER_COLLECTION]

	member_docs = await members_coll.find({"username": username}).to_list(length=100)
	room_ids = [
		ObjectId(doc["room_id"])
		for doc in member_docs
		if ObjectId.is_valid(doc.get("room_id", ""))
	]

	if not room_ids:
		return []

	rooms = await rooms_coll.find({"_id": {"$in": room_ids}}).to_list(length=100)
	return [_format_room_doc(room_doc) for room_doc in rooms]


async def send_message(room_id: str, sender_username: str, content: str) -> dict:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	messages_coll = db[MESSAGE_COLLECTION]
	rooms_coll = db[ROOM_COLLECTION]

	await _get_room_doc_or_404(rooms_coll, room_id)
	await _get_member_doc(members_coll, room_id, sender_username)

	new_message = RoomMessage.create(room_id=room_id, sender_username=sender_username, content=content)
	doc = new_message.to_document()
	result = await messages_coll.insert_one(doc)
	doc["_id"] = result.inserted_id

	return _format_message_doc(doc)


async def get_messages(room_id: str, username: str) -> List[dict]:
	db = await _get_db()
	members_coll = db[MEMBER_COLLECTION]
	messages_coll = db[MESSAGE_COLLECTION]

	await _get_member_doc(members_coll, room_id, username)

	messages = await messages_coll.find({"room_id": room_id}).sort("sent_at", 1).to_list(length=500)
	return [_format_message_doc(message_doc) for message_doc in messages]


def _format_room_doc(doc: dict) -> dict:
	doc["id"] = str(doc.pop("_id"))
	return doc


def _format_message_doc(doc: dict) -> dict:
	doc["id"] = str(doc.pop("_id"))
	return doc


def _format_member_doc(doc: dict) -> dict:
	doc["id"] = str(doc.pop("_id"))
	return doc


def _format_invitation_doc(doc: dict) -> dict:
	doc["id"] = str(doc.pop("_id"))
	return doc


def _format_join_request_doc(doc: dict) -> dict:
	doc["id"] = str(doc.pop("_id"))
	return doc
