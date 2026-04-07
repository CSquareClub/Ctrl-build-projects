"""
Run this once to create all DB tables.
In production, use Alembic migrations instead.

Usage:
    python run_migrations.py
"""
import asyncio
from dotenv import load_dotenv

load_dotenv()

from db.database import init_db

if __name__ == "__main__":
    asyncio.run(init_db())
    print("✓ All tables created successfully.")
