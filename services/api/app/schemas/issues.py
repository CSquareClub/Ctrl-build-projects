from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IssueAuthor(BaseModel):
    login: Optional[str] = None
    id: Optional[int] = None
    html_url: Optional[str] = None
    type: Optional[str] = None


class NormalizedIssue(BaseModel):
    id: int
    number: int
    title: str
    body: str
    state: str
    labels: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    html_url: str
    url: str
    author: IssueAuthor
    comment_count: int
    canonical_text: str
    metadata: dict = Field(default_factory=dict)


class ListIssuesResponse(BaseModel):
    owner: str
    repo: str
    state: str
    include_pull_requests: bool
    total_count: int
    issues: list[NormalizedIssue]
