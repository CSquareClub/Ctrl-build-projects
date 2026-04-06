"""
Pydantic schemas for account management endpoints.

These schemas handle request validation and response serialization
for account deletion and related operations.
"""
from pydantic import BaseModel, Field, field_validator


class DeleteAccountRequest(BaseModel):
    """
    Request body for scheduling account deletion.
    
    Requires:
    - username: Must match the logged-in user
    - password: For verification
    - keyword: Must be exactly "delete" to confirm
    """
    username: str = Field(..., min_length=1, description="Username for verification")
    password: str = Field(..., min_length=1, description="Password for verification")
    keyword: str = Field(..., description="Must be 'delete' to confirm deletion")
    
    @field_validator("keyword")
    @classmethod
    def validate_keyword(cls, v: str) -> str:
        """Ensure keyword is exactly 'delete' (case-insensitive)."""
        if v.lower().strip() != "delete":
            raise ValueError("Keyword must be 'delete' to confirm account deletion")
        return v.lower().strip()


class DeleteAccountResponse(BaseModel):
    """
    Response body after successfully scheduling account deletion.
    """
    message: str
    deletion_scheduled: bool = True


class AccountInfoResponse(BaseModel):
    """
    Response body for account info endpoint.
    Used by frontend to display account status.
    """
    id: str
    username: str
    created_at: str
    deletion_status: str


class CancelDeletionRequest(BaseModel):
    """
    Request body for cancelling a scheduled deletion.
    Called when user chooses to cancel deletion during login.
    """
    user_id: str = Field(..., min_length=1, description="User's ObjectId as string")


class CancelDeletionResponse(BaseModel):
    """
    Response body after successfully cancelling deletion.
    """
    message: str
    deletion_cancelled: bool = True
