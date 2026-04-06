"""Routes for saving and retrieving mind maps."""
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import get_database
from models.mindmap import MindMap
from schemas.mindmap_schema import (
    MindMapListResponse,
    MindMapNode,
    MindMapResponse,
    SaveMindMapRequest,
)


router = APIRouter(prefix="/mindmaps", tags=["mindmaps"])
logger = logging.getLogger(__name__)


def _parse_object_id(raw_id: str, field_name: str) -> ObjectId:
    """Safely convert string ids to Mongo ObjectId."""
    if not ObjectId.is_valid(raw_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name}",
        )
    return ObjectId(raw_id)


def _node_to_dict(node: MindMapNode) -> dict[str, Any]:
    """Serialize pydantic node models in a pydantic v1/v2 compatible way."""
    if hasattr(node, "model_dump"):
        return node.model_dump()
    return node.dict()


def _normalize_stored_nodes(raw_nodes: Any) -> list[MindMapNode]:
    """Normalize stored mind map node payloads for API response."""
    if not isinstance(raw_nodes, list):
        return []

    normalized_nodes: list[MindMapNode] = []
    seen_ids: set[str] = set()
    for item in raw_nodes:
        if not isinstance(item, dict):
            continue

        node_id = str(item.get("id", "")).strip()
        label = str(item.get("label", "")).strip()
        parent_raw = item.get("parent")
        parent = None if parent_raw is None else str(parent_raw).strip() or None

        if not node_id or not label or node_id in seen_ids:
            continue

        seen_ids.add(node_id)
        try:
            normalized_nodes.append(MindMapNode(id=node_id, label=label, parent=parent))
        except Exception:
            continue

    node_ids = {node.id for node in normalized_nodes}
    valid_nodes: list[MindMapNode] = []
    for node in normalized_nodes:
        if node.parent is not None and node.parent not in node_ids:
            continue
        if node.parent == node.id:
            continue
        valid_nodes.append(node)

    return valid_nodes


def _object_id_to_str(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    if value is None:
        return ""
    return str(value)


@router.post("", response_model=MindMapResponse, status_code=status.HTTP_201_CREATED)
async def save_mindmap(
    payload: SaveMindMapRequest,
    db=Depends(get_database),
) -> MindMapResponse:
    """Save a generated mind map."""
    if not payload.nodes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="nodes must contain at least one node",
        )

    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="topic cannot be empty",
        )

    user_object_id = _parse_object_id(payload.user_id, "user_id")
    chat_object_id = _parse_object_id(payload.chat_id, "chat_id")

    user_exists = await db["users"].find_one({"_id": user_object_id})
    if not user_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    chat_exists = await db["chats"].find_one({"_id": chat_object_id, "user_id": user_object_id})
    if not chat_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found or access denied",
        )

    anchor_message = await db["messages"].find_one(
        {"chat_id": chat_object_id, "message_index": payload.message_index}
    )
    if not anchor_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="message_index does not match any message in this chat",
        )

    normalized_nodes = _normalize_stored_nodes([_node_to_dict(node) for node in payload.nodes])
    if len(normalized_nodes) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="nodes must contain a valid root and connected children",
        )

    root_count = sum(1 for node in normalized_nodes if node.parent is None)
    if root_count != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="mind map must contain exactly one root node",
        )

    mindmap = MindMap.create(
        user_id=user_object_id,
        chat_id=chat_object_id,
        message_index=payload.message_index,
        topic=topic,
        nodes=[_node_to_dict(node) for node in normalized_nodes],
    )

    document = mindmap.to_document()
    try:
        await db["mindmaps"].insert_one(document)
    except DuplicateKeyError as exc:
        logger.exception("Duplicate mindmap_id encountered while saving mind map")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A mind map with the same mindmap_id already exists. Please retry.",
        ) from exc

    nodes = _normalize_stored_nodes(document.get("nodes", []))
    return MindMapResponse(
        mindmap_id=document["mindmap_id"],
        user_id=str(user_object_id),
        chat_id=str(chat_object_id),
        message_index=document["message_index"],
        topic=document["topic"],
        nodes=nodes,
        created_at=document["created_at"],
    )


@router.get("/chat/{chat_id}", response_model=MindMapListResponse)
async def list_mindmaps_by_chat(
    chat_id: str,
    db=Depends(get_database),
) -> MindMapListResponse:
    """Fetch all mind maps for a chat ordered by message position."""
    chat_object_id = _parse_object_id(chat_id, "chat_id")

    cursor = db["mindmaps"].find({"chat_id": chat_object_id}).sort(
        [("message_index", 1), ("created_at", 1)]
    )

    mindmaps: list[MindMapResponse] = []
    async for document in cursor:
        nodes = _normalize_stored_nodes(document.get("nodes", []))
        created_at = document.get("created_at")
        if not isinstance(created_at, datetime):
            created_at = datetime.now(timezone.utc)

        mindmaps.append(
            MindMapResponse(
                mindmap_id=str(document.get("mindmap_id", "")),
                user_id=_object_id_to_str(document.get("user_id")),
                chat_id=_object_id_to_str(document.get("chat_id")),
                message_index=int(document.get("message_index", 0)),
                topic=str(document.get("topic", "")),
                nodes=nodes,
                created_at=created_at,
            )
        )

    return MindMapListResponse(mindmaps=mindmaps)
