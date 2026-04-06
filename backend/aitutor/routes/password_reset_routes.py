"""Password reset routes with random token verification.

Token-Based Flow:
1. User submits reset request (username + email)
2. Backend generates random alphanumeric token (10 chars)
3. Token stored in password_reset_requests.reset_token
4. Status set to token_sent immediately
5. Admin reviews and sends token to user's email
6. User enters token to verify
7. If token matches -> user can reset password
8. Password reset -> status = completed, token invalidated

Email is collected ONLY for contact during reset, NOT stored in user accounts.
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

from app.database import get_database
from models.password_reset import PasswordResetRequest, ResetStatus, generate_reset_token
from schemas.password_reset_schema import (
	CheckExistingResetRequest,
	CreateResetRequest,
	VerifyTokenRequest,
	ResetPasswordRequest,
	CancelResetRequest,
	ResetRequestStatus,
	ResetRequestResponse,
	TokenVerifyResponse,
	PasswordResetResponse,
)


router = APIRouter(prefix="/auth/password-reset", tags=["password-reset"])
_password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

# Collection name for password reset requests
COLLECTION = "password_reset_requests"


@router.post("/check", response_model=ResetRequestStatus)
async def check_existing_request(
	payload: CheckExistingResetRequest,
	db: AsyncIOMotorDatabase = Depends(get_database),
) -> ResetRequestStatus:
	"""
	Check if an active (pending or token_sent) reset request exists for the username.
	Used on modal open to determine if user should continue or start fresh.
	"""
	try:
		# Find active request (not completed or cancelled)
		request = await db[COLLECTION].find_one({
			"username": payload.username,
			"status": {"$in": [ResetStatus.PENDING.value, ResetStatus.TOKEN_SENT.value]}
		})

		if not request:
			return ResetRequestStatus(exists=False, has_active_request=False)

		return ResetRequestStatus(
			exists=True,
			has_active_request=True,
			status=request["status"],
			email=request.get("email"),
			created_at=request.get("created_at"),
			can_verify_token=request["status"] == ResetStatus.TOKEN_SENT.value
		)

	except Exception as exc:
		logger.exception("Failed to check reset request for %s", payload.username)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to check reset request status",
		) from exc


@router.post("/request", response_model=ResetRequestResponse)
async def create_reset_request(
	payload: CreateResetRequest,
	db: AsyncIOMotorDatabase = Depends(get_database),
) -> ResetRequestResponse:
	"""
	Create or update a password reset request.
	
	- Verifies username exists in users collection
	- Creates new request or updates existing pending request
	- Only one active request per user allowed
	"""
	try:
		# Verify username exists
		user = await db["users"].find_one({"username": payload.username})
		if not user:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="Username not found",
			)

		# Check for existing active request
		existing = await db[COLLECTION].find_one({
			"username": payload.username,
			"status": {"$in": [ResetStatus.PENDING.value, ResetStatus.TOKEN_SENT.value]}
		})

		now = datetime.now(timezone.utc)

		if existing:
			# Update existing request with new token
			new_token = generate_reset_token(10)
			await db[COLLECTION].update_one(
				{"_id": existing["_id"]},
				{
					"$set": {
						"email": payload.email,
						"message": payload.message,
						"reset_token": new_token,
						"status": ResetStatus.TOKEN_SENT.value,
						"updated_at": now,
					}
				}
			)
			logger.info("Updated reset request for user: %s (new token generated)", payload.username)
		else:
			# Create new request with token (status = token_sent immediately)
			reset_request = PasswordResetRequest.create(
				username=payload.username,
				email=payload.email,
				message=payload.message,
			)
			await db[COLLECTION].insert_one(reset_request.to_document())
			logger.info("Created reset request for user: %s (token generated)", payload.username)

		return ResetRequestResponse(
			success=True,
			message="Password reset request submitted successfully.",
			status=ResetStatus.TOKEN_SENT.value,
		)

	except HTTPException:
		raise
	except Exception as exc:
		logger.exception("Failed to create reset request for %s", payload.username)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to submit reset request",
		) from exc


@router.post("/verify-token", response_model=TokenVerifyResponse)
async def verify_reset_token(
	payload: VerifyTokenRequest,
	db: AsyncIOMotorDatabase = Depends(get_database),
) -> TokenVerifyResponse:
	"""
	Verify the reset token entered by user.
	
	Compares the user-entered token against password_reset_requests.reset_token.
	Only proceeds if token matches AND status is token_sent.
	"""
	try:
		# Check for active request with token_sent status
		request = await db[COLLECTION].find_one({
			"username": payload.username,
			"status": ResetStatus.TOKEN_SENT.value
		})

		if not request:
			return TokenVerifyResponse(
				verified=False,
				message="No active reset request found. Please submit a new request.",
			)

		# Get stored reset token
		stored_token = request.get("reset_token", "")
		
		# Compare provided token with stored reset_token (case-insensitive)
		if payload.reset_token.strip().upper() == stored_token.strip().upper():
			logger.info("Token verified successfully for user: %s", payload.username)
			return TokenVerifyResponse(
				verified=True,
				message="Token verified successfully. You can now reset your password.",
			)
		else:
			logger.warning("Invalid token attempt for user: %s", payload.username)
			return TokenVerifyResponse(
				verified=False,
				message="Invalid reset token. Please check and try again.",
			)

	except Exception as exc:
		logger.exception("Failed to verify token for %s", payload.username)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to verify reset token",
		) from exc


@router.post("/reset", response_model=PasswordResetResponse)
async def reset_password(
	payload: ResetPasswordRequest,
	db: AsyncIOMotorDatabase = Depends(get_database),
) -> PasswordResetResponse:
	"""
	Reset the user's password after token verification.
	
	- Validates passwords match
	- Hashes new password
	- Updates user document
	- Marks reset request as completed
	- Invalidates reset token
	"""
	try:
		# Validate passwords match
		if payload.new_password != payload.confirm_password:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="Passwords do not match",
			)

		# Check for active request with token_sent status
		request = await db[COLLECTION].find_one({
			"username": payload.username,
			"status": ResetStatus.TOKEN_SENT.value
		})

		if not request:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="No verified reset request found. Please complete verification first.",
			)

		# Hash new password
		new_hash = _password_context.hash(payload.new_password)
		now = datetime.now(timezone.utc)

		# Update user's password
		result = await db["users"].update_one(
			{"username": payload.username},
			{"$set": {"password_hash": new_hash}}
		)

		if result.modified_count == 0:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail="User not found",
			)

		# Mark request as completed and invalidate token
		await db[COLLECTION].update_one(
			{"_id": request["_id"]},
			{
				"$set": {
					"status": ResetStatus.COMPLETED.value,
					"reset_token": None,  # Invalidate token
					"updated_at": now,
				}
			}
		)

		logger.info("Password reset completed for user: %s", payload.username)

		return PasswordResetResponse(
			success=True,
			message="Password reset successful! You can now login with your new password.",
		)

	except HTTPException:
		raise
	except Exception as exc:
		logger.exception("Failed to reset password for %s", payload.username)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to reset password",
		) from exc


@router.post("/cancel", response_model=ResetRequestResponse)
async def cancel_reset_request(
	payload: CancelResetRequest,
	db: AsyncIOMotorDatabase = Depends(get_database),
) -> ResetRequestResponse:
	"""
	Cancel an existing reset request.
	Sets status to cancelled so user can start fresh.
	"""
	try:
		now = datetime.now(timezone.utc)
		
		result = await db[COLLECTION].update_one(
			{
				"username": payload.username,
				"status": {"$in": [ResetStatus.PENDING.value, ResetStatus.TOKEN_SENT.value]}
			},
			{
				"$set": {
					"status": ResetStatus.CANCELLED.value,
					"reset_token": None,  # Invalidate token on cancel
					"updated_at": now,
				}
			}
		)

		if result.modified_count == 0:
			return ResetRequestResponse(
				success=False,
				message="No active reset request found to cancel.",
				status="none",
			)

		logger.info("Cancelled reset request for user: %s", payload.username)

		return ResetRequestResponse(
			success=True,
			message="Reset request cancelled. You can submit a new request.",
			status=ResetStatus.CANCELLED.value,
		)

	except Exception as exc:
		logger.exception("Failed to cancel reset request for %s", payload.username)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to cancel reset request",
		) from exc


@router.get("/status/{username}", response_model=ResetRequestStatus)
async def get_reset_status(
	username: str,
	db: AsyncIOMotorDatabase = Depends(get_database),
) -> ResetRequestStatus:
	"""
	Get the current status of a reset request.
	Used for refresh safety - resume UI to correct step.
	"""
	try:
		request = await db[COLLECTION].find_one({
			"username": username,
			"status": {"$in": [ResetStatus.PENDING.value, ResetStatus.TOKEN_SENT.value]}
		})

		if not request:
			return ResetRequestStatus(exists=False, has_active_request=False)

		return ResetRequestStatus(
			exists=True,
			has_active_request=True,
			status=request["status"],
			email=request.get("email"),
			created_at=request.get("created_at"),
			can_verify_token=request["status"] == ResetStatus.TOKEN_SENT.value
		)

	except Exception as exc:
		logger.exception("Failed to get reset status for %s", username)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Failed to get reset status",
		) from exc
