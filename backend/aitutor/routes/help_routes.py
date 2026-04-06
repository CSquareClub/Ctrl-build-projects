"""
Help/Support routes for submitting and tracking support requests.

Endpoints:
- POST /help/submit: Submit a new help request
- GET /help/status/{user_id}: Get all help requests for a user

Status Workflow:
1. User submits problem → status = "working"
2. Admin manually updates in MongoDB → status = "fixed"
3. Frontend can poll status and show ✔️ when fixed
"""
import logging
from typing import List

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from models.help_request import HelpRequest
from schemas.help_request_schema import (
    HelpSubmitRequest,
    HelpSubmitResponse,
    HelpRequestStatus,
    HelpStatusResponse,
)


router = APIRouter(prefix="/help", tags=["help"])
logger = logging.getLogger(__name__)


@router.post("/submit", response_model=HelpSubmitResponse, status_code=status.HTTP_201_CREATED)
async def submit_help_request(
    payload: HelpSubmitRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> HelpSubmitResponse:
    """
    Submit a new help/support request.
    
    This endpoint creates a new help request in the database with:
    - status = "working" (default, awaiting admin review)
    - created_at = current timestamp
    
    The admin will manually update status to "fixed" in MongoDB
    when the issue is resolved.
    
    Args:
        payload: Contains username, user_id, and problem description
        db: MongoDB database instance
        
    Returns:
        HelpSubmitResponse with success message and request ID
    """
    try:
        # Validate user_id is a valid ObjectId format
        try:
            ObjectId(payload.user_id)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id format",
            )
        
        # Create help request with default status and timestamp
        help_request = HelpRequest.create(
            username=payload.username,
            user_id=payload.user_id,
            problem=payload.problem,
        )
        
        # Insert into help_requests collection
        result = await db["help_requests"].insert_one(help_request.to_document())
        
        logger.info(
            "Help request submitted: user=%s, request_id=%s",
            payload.username,
            str(result.inserted_id),
        )
        
        return HelpSubmitResponse(
            message="Your request has been submitted. We'll look into it!",
            request_id=str(result.inserted_id),
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to submit help request for user %s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit help request",
        ) from exc


@router.get("/status/{user_id}", response_model=HelpStatusResponse)
async def get_help_status(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> HelpStatusResponse:
    """
    Get all help requests for a specific user.
    
    Returns a list of all help requests submitted by the user,
    including their current status. Frontend can use this to:
    - Show pending requests
    - Display ✔️ for fixed requests
    
    Args:
        user_id: The user's ObjectId as a string
        db: MongoDB database instance
        
    Returns:
        HelpStatusResponse with list of requests and total count
    """
    try:
        # Validate user_id format
        try:
            ObjectId(user_id)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id format",
            )
        
        # Fetch all help requests for this user, sorted by newest first
        cursor = db["help_requests"].find(
            {"user_id": user_id}
        ).sort("created_at", -1)
        
        requests: List[HelpRequestStatus] = []
        async for doc in cursor:
            requests.append(
                HelpRequestStatus(
                    id=str(doc["_id"]),
                    problem=doc["problem"],
                    status=doc["status"],
                    created_at=doc["created_at"],
                )
            )
        
        return HelpStatusResponse(
            requests=requests,
            total=len(requests),
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch help status for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch help status",
        ) from exc
