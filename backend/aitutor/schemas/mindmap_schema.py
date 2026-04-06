"""Pydantic schemas for mind map persistence endpoints."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MindMapNode(BaseModel):
    """Single node payload persisted within a mind map."""

    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    parent: Optional[str] = None


class SaveMindMapRequest(BaseModel):
    """Request body for saving generated mind maps."""

    user_id: str = Field(..., min_length=1)
    chat_id: str = Field(..., min_length=1)
    message_index: int = Field(..., ge=0)
    topic: str = Field(..., min_length=1)
    nodes: list[MindMapNode]


class MindMapResponse(BaseModel):
    """Single mind map response shape."""

    mindmap_id: str
    user_id: str
    chat_id: str
    message_index: int
    topic: str
    nodes: list[MindMapNode]
    created_at: datetime


class MindMapListResponse(BaseModel):
    """List response for mind maps in a chat."""

    mindmaps: list[MindMapResponse]
