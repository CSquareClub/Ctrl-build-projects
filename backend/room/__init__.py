"""
Initialization for the Study Room module.
Exposes the main API router for integration.
"""
from .routes.room_routes import router as room_router

__all__ = ["room_router"]
