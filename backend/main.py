"""Primary backend ASGI entrypoint.

Run with:
    uvicorn main:app --reload
"""

from app.main import app
from room import room_router

app.include_router(room_router)

__all__ = ["app"]
