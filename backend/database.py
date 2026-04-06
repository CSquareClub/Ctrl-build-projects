"""
ChatTutor — Database Configuration
SQLite via SQLAlchemy ORM
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "sqlite:///./chattutor_v2.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


def get_db():
    """Dependency to get DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
