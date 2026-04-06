from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class NormalizedIssue(BaseModel):
    id: str
    number: int
    title: str
    body: str = ""
    state: str
    labels: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    html_url: Optional[str] = None
    author: Optional[str] = None
    comment_count: int = 0
    canonical_text: str
    metadata: dict[str, Any] = Field(default_factory=dict)
