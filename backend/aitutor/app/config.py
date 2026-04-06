"""
Configuration management for the FastAPI application.
Loads settings from environment variables.
"""
from dataclasses import dataclass
import os
from pathlib import Path
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=False)


@dataclass(slots=True)
class Settings:
    """Application settings loaded from environment variables."""

    mongodb_url: str = os.getenv("MONGODB_URL", "")
    database_name: str = os.getenv("DATABASE_NAME", "chatbot_db")
    environment: str = os.getenv("ENVIRONMENT", "development")

    def __post_init__(self) -> None:
        if not self.mongodb_url:
            raise ValueError("MONGODB_URL environment variable is required")


settings = Settings()
