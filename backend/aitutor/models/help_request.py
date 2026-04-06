"""
Domain model representing a help/support request submitted by a user.

Help Request Lifecycle:
1. User submits a problem → status = "working"
2. Admin manually updates status in MongoDB → status = "fixed"
3. Frontend displays green ✔️ when status = "fixed"
"""
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional, Literal


# Valid status values for a help request
HelpStatus = Literal["working", "fixed"]


@dataclass(slots=True)
class HelpRequest:
    """
    Represents a persisted help request document.
    
    Attributes:
        username: The username of the user who submitted the request
        user_id: The ObjectId (as string) of the user
        problem: The description of the problem/issue
        status: Current status - "working" (in progress) or "fixed" (resolved)
        created_at: Timestamp when the request was submitted
        _id: MongoDB document ID (optional, set after insertion)
    """

    username: str
    user_id: str
    problem: str
    status: HelpStatus
    created_at: datetime
    _id: Optional[str] = None

    @classmethod
    def create(
        cls,
        *,
        username: str,
        user_id: str,
        problem: str,
    ) -> "HelpRequest":
        """
        Factory helper to create a new help request with default values.
        
        - Sets status to "working" (admin will update to "fixed" when resolved)
        - Stamps creation time to current UTC time
        """
        return cls(
            username=username,
            user_id=user_id,
            problem=problem,
            status="working",
            created_at=datetime.now(timezone.utc),
        )

    def to_document(self) -> dict[str, object]:
        """
        Serialize the help request for MongoDB insertion.
        Excludes _id as MongoDB will generate it.
        """
        payload = asdict(self)
        payload.pop("_id")
        return payload
