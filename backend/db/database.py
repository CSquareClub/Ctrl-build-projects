import os

import sqlalchemy
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./gitwise.db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables on startup (dev convenience — use Alembic in production)."""
    from db import models  # noqa: F401 — import so models register with Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure new columns exist on older tables (lightweight migration)
        await conn.execute(
            sqlalchemy.text(
                "ALTER TABLE activity_feed ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id)"
            )
        )


async def get_db():
    """FastAPI dependency — yields an AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session
