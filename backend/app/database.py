"""Compatibility shim for legacy app.database imports."""

from aitutor.app.database import close_mongo_connection, connect_to_mongo, get_database

__all__ = ["connect_to_mongo", "close_mongo_connection", "get_database"]
