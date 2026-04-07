import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
    ARRAY, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    github_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    login: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str | None] = mapped_column(String)
    avatar_url: Mapped[str | None] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String)
    access_token: Mapped[str | None] = mapped_column(Text)  # stored encrypted
    public_repos: Mapped[int] = mapped_column(Integer, default=0)
    followers: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    repositories: Mapped[list["Repository"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    prefs: Mapped["UserPrefs | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    github_id: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str | None] = mapped_column(String)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    forks: Mapped[int] = mapped_column(Integer, default=0)
    open_issues: Mapped[int] = mapped_column(Integer, default=0)
    is_monitored: Mapped[bool] = mapped_column(Boolean, default=False)
    webhook_active: Mapped[bool] = mapped_column(Boolean, default=False)
    webhook_id: Mapped[int | None] = mapped_column(Integer)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="repositories")
    triaged_issues: Mapped[list["TriagedIssue"]] = relationship(back_populates="repository", cascade="all, delete-orphan")
    moderation_events: Mapped[list["ModerationEvent"]] = relationship(back_populates="repository", cascade="all, delete-orphan")


class TriagedIssue(Base):
    __tablename__ = "triaged_issues"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    repo_id: Mapped[str] = mapped_column(String, ForeignKey("repositories.id"), nullable=False)
    github_id: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str | None] = mapped_column(Text)
    classification: Mapped[str] = mapped_column(String, nullable=False)  # IssueClassification
    priority_score: Mapped[int] = mapped_column(Integer, default=0)
    labels: Mapped[str] = mapped_column(Text, default="[]")  # JSON array stored as text
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of: Mapped[str | None] = mapped_column(String, ForeignKey("triaged_issues.id"))
    state: Mapped[str] = mapped_column(String, default="open")
    url: Mapped[str | None] = mapped_column(String)
    author: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    analyzed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    repository: Mapped["Repository"] = relationship(back_populates="triaged_issues")


class ModerationEvent(Base):
    __tablename__ = "moderation_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    repo_id: Mapped[str] = mapped_column(String, ForeignKey("repositories.id"), nullable=False)
    delivery_id: Mapped[str | None] = mapped_column(String, unique=True)  # X-GitHub-Delivery idempotency key
    type: Mapped[str] = mapped_column(String, nullable=False)       # EventType
    decision: Mapped[str] = mapped_column(String, nullable=False)   # PASS | FLAG | BLOCK
    severity: Mapped[str] = mapped_column(String, nullable=False)   # CRITICAL | HIGH | MEDIUM | LOW
    title: Mapped[str] = mapped_column(String, nullable=False)
    author: Mapped[str | None] = mapped_column(String)
    author_avatar: Mapped[str | None] = mapped_column(String)
    reason: Mapped[str | None] = mapped_column(Text)
    ai_explanation: Mapped[str | None] = mapped_column(Text)
    file: Mapped[str | None] = mapped_column(String)
    line_start: Mapped[int | None] = mapped_column(Integer)
    line_end: Mapped[int | None] = mapped_column(Integer)
    commit_sha: Mapped[str | None] = mapped_column(String)
    pr_number: Mapped[int | None] = mapped_column(Integer)
    github_url: Mapped[str | None] = mapped_column(String)
    overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    overridden_by: Mapped[str | None] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    repository: Mapped["Repository"] = relationship(back_populates="moderation_events")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    github_id: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String, nullable=False)
    repo: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str | None] = mapped_column(String)
    labels: Mapped[str] = mapped_column(Text, default="[]")       # JSON array
    difficulty: Mapped[str] = mapped_column(String, default="Easy")
    match_score: Mapped[int] = mapped_column(Integer, default=0)
    languages: Mapped[str] = mapped_column(Text, default="[]")    # JSON array
    explanation: Mapped[str | None] = mapped_column(Text)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    bookmarked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="recommendations")


class UserPrefs(Base):
    __tablename__ = "user_prefs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), unique=True, nullable=False)
    skills: Mapped[str] = mapped_column(Text, default="[]")    # JSON array
    domains: Mapped[str] = mapped_column(Text, default="[]")   # JSON array
    experience: Mapped[str] = mapped_column(String, default="beginner")

    user: Mapped["User"] = relationship(back_populates="prefs")


class ActivityFeedEntry(Base):
    __tablename__ = "activity_feed"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False)  # block | triage | flag | pass | readme | batch
    text: Mapped[str] = mapped_column(Text, nullable=False)
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
