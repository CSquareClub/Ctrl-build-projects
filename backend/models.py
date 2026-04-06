"""
ChatTutor — SQLAlchemy Database Models
Tables: User, Conversation, Content
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    """User profile — stores role, education, goal"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    password = Column(String(200), nullable=False)
    age = Column(Integer, nullable=False)
    education = Column(String(200), nullable=False)
    goal = Column(String(300), nullable=False)
    role = Column(String(20), nullable=False)  # student | job_aspirant | self_learner
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete")
    contents = relationship("Content", back_populates="user", cascade="all, delete")
    trackings = relationship("Tracking", back_populates="user", cascade="all, delete")


class Conversation(Base):
    """Chat history — stores Q&A pairs for memory"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")


class Content(Base):
    """Generated notes and quizzes per topic"""
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic = Column(String(300), nullable=False)
    notes = Column(Text, nullable=True)
    quiz = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="contents")


class Tracking(Base):
    """User progress and activity tracking"""
    __tablename__ = "tracking"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    activity_type = Column(String(50), nullable=False)  # 'quiz', 'notes', 'interview', 'roadmap'
    topic = Column(String(300), nullable=False)
    score = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    time_spent = Column(Integer, nullable=True) # in seconds
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trackings")
