"""Pydantic schemas for quiz persistence endpoints."""
from datetime import datetime

from pydantic import BaseModel, Field


class QuizQuestion(BaseModel):
    """Question payload persisted within a quiz."""

    question: str = Field(..., min_length=1)
    options: list[str] | dict[str, str] = Field(...)
    correct_answer: str = Field(..., min_length=1)
    explanation: str = Field(default="")


class SaveQuizRequest(BaseModel):
    """Request body for saving a generated quiz."""

    user_id: str = Field(..., min_length=1)
    chat_id: str = Field(..., min_length=1)
    message_index: int = Field(..., ge=0)
    topic: str = Field(..., min_length=1)
    questions: list[QuizQuestion]


class QuizResponse(BaseModel):
    """Single quiz response shape."""

    quiz_id: str
    user_id: str
    chat_id: str
    message_index: int
    topic: str
    questions: list[QuizQuestion]
    created_at: datetime


class QuizListResponse(BaseModel):
    """List response for quizzes in a chat."""

    quizzes: list[QuizResponse]


class SaveQuizAttemptRequest(BaseModel):
    """Request body for saving a quiz attempt."""

    quiz_id: str = Field(..., min_length=1)
    question_index: int = Field(..., ge=0)
    selected_option: str = Field(..., min_length=1)
    is_correct: bool


class QuizAttemptResponse(BaseModel):
    """Single quiz attempt response shape."""

    attempt_id: str
    quiz_id: str
    question_index: int
    selected_option: str
    is_correct: bool
    created_at: datetime


class QuizAttemptListResponse(BaseModel):
    """List response for attempts of a quiz."""

    quiz_id: str
    attempts: list[QuizAttemptResponse]
