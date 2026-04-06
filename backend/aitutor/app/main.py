"""
FastAPI application entry point.
Sets up the server with MongoDB connection and health check route.
"""
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase

# Load environment variables before the FastAPI app is created
backend_root = Path(__file__).resolve().parents[2]
env_file = backend_root / ".env"
load_dotenv(dotenv_path=env_file, override=False)

logger = logging.getLogger(__name__)
if not os.getenv("GROQ_API_KEY"):
    logger.error("GROQ_API_KEY is missing. Check backend/.env configuration.")

from app.database import close_mongo_connection, connect_to_mongo, get_database
from routes.auth_routes import router as auth_router
from routes.chat_routes import router as chat_router
from routes.message_routes import chat_interaction_router, message_router
from routes.ui_routes import ui_router
from routes.password_reset_routes import router as password_reset_router
from routes.help_routes import router as help_router
from routes.account_routes import router as account_router
from routes.quiz_routes import router as quiz_router
from routes.flashcard_routes import router as flashcard_router
from routes.mindmap_routes import router as mindmap_router
from services.deletion_service import process_scheduled_deletions

# Create FastAPI application instance
app = FastAPI(
    title="Chatbot Backend API",
    description="FastAPI backend with MongoDB support",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(password_reset_router)
app.include_router(message_router)
app.include_router(chat_interaction_router)
app.include_router(ui_router)
app.include_router(help_router)
app.include_router(account_router)
app.include_router(quiz_router)
app.include_router(flashcard_router)
app.include_router(mindmap_router)


@app.on_event("startup")
async def startup_event():
    """
    Runs on application startup.
    1. Establishes MongoDB connection
    2. Processes scheduled deletions (accounts past 30-day grace period)
    """
    await connect_to_mongo()
    
    # Ensure educational content indexes exist.
    # quiz_id/flashcard_id/mindmap_id must be unique and queries by chat should be fast.
    try:
        db = get_database()
        await db["messages"].create_index([("chat_id", 1), ("message_index", 1)])
        await db["quizzes"].create_index("quiz_id", unique=True)
        await db["quizzes"].create_index(
            [("chat_id", 1), ("message_index", 1), ("created_at", 1)]
        )
        await db["flashcards"].create_index("flashcard_id", unique=True)
        await db["flashcards"].create_index(
            [("chat_id", 1), ("message_index", 1), ("created_at", 1)]
        )
        await db["mindmaps"].create_index("mindmap_id", unique=True)
        await db["mindmaps"].create_index(
            [("chat_id", 1), ("message_index", 1), ("created_at", 1)]
        )
        await db["quiz_attempts"].create_index(
            [("quiz_id", 1), ("question_index", 1), ("created_at", 1)]
        )
        await db["quiz_attempts"].create_index([("quiz_id", 1), ("created_at", 1)])
    except Exception as e:
        print(f"⚠ Failed to ensure educational indexes: {e}")

    # Process any accounts scheduled for deletion that have exceeded 30 days.
    # This runs on every server start to catch any accounts that passed the deadline.
    try:
        db = get_database()
        deleted_count = await process_scheduled_deletions(db)
        if deleted_count > 0:
            print(f"✓ Processed {deleted_count} account(s) past 30-day deletion period")
    except Exception as e:
        print(f"⚠ Failed to process scheduled deletions: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Runs on application shutdown.
    Closes MongoDB connection.
    """
    await close_mongo_connection()


@app.get("/health", tags=["health"])
async def health_check(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Health check endpoint to verify application and database status.
    
    Returns:
        dict: Status response with ok status.
    """
    return {"status": "ok"}


@app.get("/debug/insert", tags=["debug"])
async def debug_insert(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Insert a test document to validate MongoDB writes."""
    debug_doc = {
        "message": "MongoDB write successful",
        "timestamp": datetime.now(timezone.utc)
    }

    result = await db["debug_test"].insert_one(debug_doc)
    return {"inserted_id": str(result.inserted_id)}
