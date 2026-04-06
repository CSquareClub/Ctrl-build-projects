"""Authentication routes for registering and logging in users."""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from passlib.context import CryptContext

from app.database import get_database
from models.user import User
from schemas.user_schema import LoginRequest, RegisterRequest, UserResponse


router = APIRouter(prefix="/auth", tags=["auth"])
_password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: RegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    try:
        existing_user = await db["users"].find_one({"username": payload.username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists",
            )

        password_hash = _password_context.hash(payload.password)
        user = User.create(username=payload.username, password_hash=password_hash)
        result = await db["users"].insert_one(user.to_document())

        return UserResponse(id=str(result.inserted_id), username=user.username)

    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - guard unexpected failures
        logger.exception("Registration failed for user %s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.post("/login", response_model=UserResponse)
async def login_user(
    payload: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> UserResponse:
    """
    Authenticate a user and return deletion status.
    
    Deletion Status Handling:
    - If deletion_status == "deleted": Block login, account is gone
    - If deletion_status == "scheduled": Return status, let frontend ask user
    - Otherwise: Normal login
    
    NOTE: We no longer auto-cancel deletion on login.
    Frontend will show a popup and call /account/cancel-deletion if user chooses.
    """
    try:
        user_document = await db["users"].find_one({"username": payload.username})
        if not user_document:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        # Check if account has been deleted (soft-delete)
        deletion_status = user_document.get("deletion_status", "none")
        if deletion_status == "deleted":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deleted.",
            )

        password_hash = user_document.get("password_hash")
        if not password_hash:
            logger.warning("User document missing password hash: %s", payload.username)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        if not _password_context.verify(payload.password, password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        # Return user info with deletion status
        # Frontend will handle showing popup if status is "scheduled"
        return UserResponse(
            id=str(user_document["_id"]),
            username=user_document["username"],
            deletion_status=deletion_status,
        )

    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive logging for unexpected failures
        logger.exception("Login failed for user %s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to process login request",
        ) from exc
