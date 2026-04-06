"""
Pydantic schemas for help/support endpoints.

These schemas handle request validation and response serialization
for the help system API endpoints.
"""
from datetime import datetime
from typing import Literal, List
from pydantic import BaseModel, Field


class HelpSubmitRequest(BaseModel):
    """
    Request body for submitting a help request.
    
    Sent from frontend when user submits a problem
    via the Help/Support form in the info modal.
    """
    username: str = Field(..., min_length=1, description="Username of the requesting user")
    user_id: str = Field(..., min_length=1, description="User's ObjectId as string")
    problem: str = Field(..., min_length=1, max_length=2000, description="Problem description")


class HelpSubmitResponse(BaseModel):
    """
    Response body after successfully submitting a help request.
    """
    message: str
    request_id: str


class HelpRequestStatus(BaseModel):
    """
    Individual help request with its current status.
    Used in the list response for GET /help/status/{user_id}
    """
    id: str
    problem: str
    status: Literal["working", "fixed"]
    created_at: datetime


class HelpStatusResponse(BaseModel):
    """
    Response body for GET /help/status/{user_id}.
    Returns all help requests for a user with their statuses.
    """
    requests: List[HelpRequestStatus]
    total: int
