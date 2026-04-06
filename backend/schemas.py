"""
ChatTutor — Pydantic Schemas
Request/Response validation models
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Auth ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: int
    education: str
    goal: str
    role: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    age: int
    education: str
    goal: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Chat ──────────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    user_id: int
    question: str = Field(..., min_length=1, max_length=2000)


class AskResponse(BaseModel):
    answer: str
    user_id: int


# ─── Content ───────────────────────────────────────────────────────────────

class NotesRequest(BaseModel):
    user_id: int
    topic: str = Field(..., min_length=2, max_length=300)


class NotesResponse(BaseModel):
    topic: str
    notes: str
    content_id: int


class QuizRequest(BaseModel):
    user_id: int
    topic: str = Field(..., min_length=2, max_length=300)
    difficulty: Optional[str] = Field(default="medium", pattern="^(easy|medium|hard)$")


class QuizOption(BaseModel):
    label: str
    text: str


class QuizQuestion(BaseModel):
    question: str
    options: List[QuizOption]
    correct: str
    explanation: str


class QuizResponse(BaseModel):
    topic: str
    questions: List[QuizQuestion]
    content_id: int


# ─── Conversation History ──────────────────────────────────────────────────

class ConversationItem(BaseModel):
    question: str
    answer: str
    timestamp: datetime

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    user_id: int
    conversations: List[ConversationItem]


# ─── Roadmap & Interview ───────────────────────────────────────────────────

class RoadmapRequest(BaseModel):
    user_id: int

class RoadmapModule(BaseModel):
    title: str
    description: str
    topics: List[str]

class RoadmapResponse(BaseModel):
    user_id: int
    goal: str
    modules: List[RoadmapModule]

class InterviewRequest(BaseModel):
    user_id: int

class InterviewQuestion(BaseModel):
    question: str
    answer_hint: str

class InterviewResponse(BaseModel):
    user_id: int
    role_targeted: str
    questions: List[InterviewQuestion]

# ─── Tracking & Progress ───────────────────────────────────────────────────

class TrackingRequest(BaseModel):
    user_id: int
    activity_type: str = Field(..., pattern="^(quiz|notes|interview|roadmap)$")
    topic: str
    score: Optional[int] = None
    total_questions: Optional[int] = None
    time_spent: Optional[int] = None

class TrackingItem(BaseModel):
    id: int
    activity_type: str
    topic: str
    score: Optional[int]
    total_questions: Optional[int]
    time_spent: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class TrackingResponse(BaseModel):
    user_id: int
    history: List[TrackingItem]
