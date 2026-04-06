"""
Database connection management using Motor (async MongoDB driver).
Handles MongoDB Atlas connection lifecycle.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

# Global database client instance
client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo():
    """
    Establish connection to MongoDB Atlas on application startup.
    Creates a Motor async client and initializes the database reference.
    """
    global client, db
    
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    
    # Verify connection by executing a ping command
    await db.command("ping")
    print(f"✓ Connected to MongoDB Atlas: {settings.database_name}")


async def close_mongo_connection():
    """
    Close MongoDB connection on application shutdown.
    Cleans up the Motor client resources.
    """
    global client, db
    
    if client is not None:
        client.close()
        db = None
        print("✓ MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """
    Dependency to access the database in route handlers.
    
    Returns:
        AsyncIOMotorDatabase: The Motor database instance.
        
    Raises:
        RuntimeError: If database is not initialized.
    """
    if db is None:
        raise RuntimeError("Database not initialized. Ensure startup event completed.")
    return db
