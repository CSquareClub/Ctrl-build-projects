"""
Account management routes for deletion and account info.

Endpoints:
- POST /account/delete-request: Schedule account for deletion
- GET /account/info/{user_id}: Get account info including deletion status

Deletion Workflow:
1. User requests deletion → deletion_status = "scheduled"
2. User has 30 days to cancel by logging in
3. After 30 days, background job sets deletion_status = "deleted"
4. Deleted accounts cannot log in

Rate Limiting:
- Users can only request deletion once per week
- If they try again within 7 days, return error with next available date
"""
import logging
from datetime import datetime, timezone, timedelta

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

from app.database import get_database
from schemas.account_schema import (
    DeleteAccountRequest,
    DeleteAccountResponse,
    AccountInfoResponse,
    CancelDeletionRequest,
    CancelDeletionResponse,
)


router = APIRouter(prefix="/account", tags=["account"])
logger = logging.getLogger(__name__)
_password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/delete-request", response_model=DeleteAccountResponse)
async def request_account_deletion(
    payload: DeleteAccountRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> DeleteAccountResponse:
    """
    Schedule account for deletion with 30-day grace period.
    
    Process:
    1. Verify username and password match an existing account
    2. Verify keyword is "delete" (handled by schema validator)
    3. Set deletion_status = "scheduled" and deletion_requested_at = now()
    4. Account will be soft-deleted after 30 days if user doesn't log in
    
    IMPORTANT:
    - User can cancel deletion by simply logging in again
    - Login will set deletion_status = "cancelled"
    - No data is deleted immediately, this is a soft-delete system
    
    Args:
        payload: Contains username, password, and keyword confirmation
        db: MongoDB database instance
        
    Returns:
        DeleteAccountResponse with success message
        
    Raises:
        401: Invalid credentials
        404: User not found
    """
    try:
        # Find user by username
        user_document = await db["users"].find_one({"username": payload.username})
        
        if not user_document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Verify password
        password_hash = user_document.get("password_hash")
        if not password_hash or not _password_context.verify(payload.password, password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password",
            )
        
        # Check if already scheduled for deletion
        current_status = user_document.get("deletion_status", "none")
        if current_status == "scheduled":
            return DeleteAccountResponse(
                message="Your account is already scheduled for deletion. Log in to cancel.",
                deletion_scheduled=True,
            )
        
        if current_status == "deleted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account has already been deleted",
            )
        
        # Check rate limit - user can only request deletion once per week
        last_deletion_attempt = user_document.get("last_deletion_attempt")
        if last_deletion_attempt:
            # Calculate the next available date (7 days from last attempt)
            next_available = last_deletion_attempt + timedelta(days=7)
            now = datetime.now(timezone.utc)
            
            if now < next_available:
                # Rate limited - return the next available date
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "message": "You can only request account deletion once per week.",
                        "next_available": next_available.isoformat(),
                    },
                )
        
        # Schedule deletion
        # Set deletion_status = "scheduled", record the request time, and update last attempt
        await db["users"].update_one(
            {"_id": user_document["_id"]},
            {
                "$set": {
                    "deletion_status": "scheduled",
                    "deletion_requested_at": datetime.now(timezone.utc),
                    "last_deletion_attempt": datetime.now(timezone.utc),
                }
            },
        )
        
        logger.info(
            "Account deletion scheduled: user=%s, user_id=%s",
            payload.username,
            str(user_document["_id"]),
        )
        
        return DeleteAccountResponse(
            message="Your account will be deleted in 30 days unless you log in again.",
            deletion_scheduled=True,
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to schedule deletion for user %s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process deletion request",
        ) from exc


@router.get("/info/{user_id}", response_model=AccountInfoResponse)
async def get_account_info(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AccountInfoResponse:
    """
    Get account information for a user.
    
    Used by frontend to display:
    - Username
    - Account creation date
    - Deletion status (none, scheduled, cancelled, deleted)
    
    Args:
        user_id: The user's ObjectId as a string
        db: MongoDB database instance
        
    Returns:
        AccountInfoResponse with account details
    """
    try:
        # Validate user_id format
        try:
            obj_id = ObjectId(user_id)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id format",
            )
        
        # Find user
        user_document = await db["users"].find_one({"_id": obj_id})
        
        if not user_document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Format created_at date
        created_at = user_document.get("created_at")
        if created_at:
            created_at_str = created_at.isoformat()
        else:
            created_at_str = "Unknown"
        
        return AccountInfoResponse(
            id=str(user_document["_id"]),
            username=user_document["username"],
            created_at=created_at_str,
            deletion_status=user_document.get("deletion_status", "none"),
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get account info for user %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get account info",
        ) from exc


@router.post("/cancel-deletion", response_model=CancelDeletionResponse)
async def cancel_account_deletion(
    payload: CancelDeletionRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CancelDeletionResponse:
    """
    Cancel a scheduled account deletion.
    
    Called by frontend when user chooses to cancel deletion during login.
    Sets deletion_status = "cancelled" and clears deletion_requested_at.
    
    Args:
        payload: Contains user_id
        db: MongoDB database instance
        
    Returns:
        CancelDeletionResponse with success message
    """
    try:
        # Validate user_id format
        try:
            obj_id = ObjectId(payload.user_id)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id format",
            )
        
        # Find user
        user_document = await db["users"].find_one({"_id": obj_id})
        
        if not user_document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        # Check if deletion is scheduled
        current_status = user_document.get("deletion_status", "none")
        if current_status != "scheduled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No scheduled deletion to cancel",
            )
        
        # Cancel deletion
        await db["users"].update_one(
            {"_id": obj_id},
            {
                "$set": {
                    "deletion_status": "cancelled",
                    "deletion_requested_at": None,
                }
            },
        )
        
        logger.info(
            "Cancelled scheduled deletion for user: %s",
            user_document["username"],
        )
        
        return CancelDeletionResponse(
            message="Account deletion has been cancelled. Welcome back!",
            deletion_cancelled=True,
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to cancel deletion for user %s", payload.user_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel deletion",
        ) from exc
