"""
Account Deletion Service - Handles 30-day auto-deletion logic.

This service runs on server startup to process accounts that have been
scheduled for deletion for more than 30 days.

IMPORTANT:
- This is a SOFT DELETE system
- User records are NOT removed from the database
- Only deletion_status is updated to "deleted"
- Chat history is preserved
- Deleted accounts cannot log in

Workflow:
1. User requests deletion → deletion_status = "scheduled"
2. User can cancel by logging in within 30 days → deletion_status = "cancelled"
3. After 30 days without login → deletion_status = "deleted" (this service)
4. Deleted users are blocked from logging in
"""
import logging
from datetime import datetime, timezone, timedelta

from motor.motor_asyncio import AsyncIOMotorDatabase


logger = logging.getLogger(__name__)

# Grace period before account is soft-deleted (30 days)
DELETION_GRACE_PERIOD_DAYS = 30


async def process_scheduled_deletions(db: AsyncIOMotorDatabase) -> int:
    """
    Process all accounts scheduled for deletion that have exceeded the grace period.
    
    This function:
    1. Finds all users where deletion_status = "scheduled"
    2. Checks if deletion_requested_at is more than 30 days ago
    3. Updates those accounts to deletion_status = "deleted"
    
    Called on server startup and can be called by a scheduled job.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        Number of accounts that were soft-deleted
    """
    try:
        # Calculate the cutoff date (30 days ago)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=DELETION_GRACE_PERIOD_DAYS)
        
        # Find all users scheduled for deletion past the grace period
        # Criteria:
        # - deletion_status = "scheduled"
        # - deletion_requested_at <= cutoff_date (more than 30 days ago)
        query = {
            "deletion_status": "scheduled",
            "deletion_requested_at": {"$lte": cutoff_date},
        }
        
        # Count before update for logging
        count_to_delete = await db["users"].count_documents(query)
        
        if count_to_delete == 0:
            logger.info("No accounts pending deletion past grace period")
            return 0
        
        # Update all matching accounts to "deleted" status
        result = await db["users"].update_many(
            query,
            {
                "$set": {
                    "deletion_status": "deleted",
                    "deleted_at": datetime.now(timezone.utc),
                }
            },
        )
        
        logger.info(
            "Soft-deleted %d accounts that exceeded 30-day grace period",
            result.modified_count,
        )
        
        return result.modified_count
        
    except Exception as exc:
        logger.exception("Error processing scheduled deletions")
        raise


async def get_pending_deletion_count(db: AsyncIOMotorDatabase) -> int:
    """
    Get count of accounts currently scheduled for deletion.
    
    Useful for admin dashboards to see how many accounts are pending.
    
    Args:
        db: MongoDB database instance
        
    Returns:
        Number of accounts with deletion_status = "scheduled"
    """
    return await db["users"].count_documents({"deletion_status": "scheduled"})


async def cancel_scheduled_deletion(
    db: AsyncIOMotorDatabase,
    user_id: str,
) -> bool:
    """
    Cancel a scheduled deletion for a user.
    
    Called during login when user logs in before 30-day period expires.
    Sets deletion_status = "cancelled" and clears deletion_requested_at.
    
    Args:
        db: MongoDB database instance
        user_id: The user's ObjectId as string
        
    Returns:
        True if cancellation was successful, False otherwise
    """
    from bson import ObjectId
    
    try:
        result = await db["users"].update_one(
            {"_id": ObjectId(user_id), "deletion_status": "scheduled"},
            {
                "$set": {
                    "deletion_status": "cancelled",
                    "deletion_requested_at": None,
                }
            },
        )
        
        if result.modified_count > 0:
            logger.info("Cancelled deletion for user: %s", user_id)
            return True
        return False
        
    except Exception as exc:
        logger.exception("Failed to cancel deletion for user %s", user_id)
        return False
