"""Compatibility ASGI module for uvicorn app.main:app."""

from pathlib import Path
import sys

backend_root = Path(__file__).resolve().parents[1]
aitutor_root = backend_root / "aitutor"
if str(aitutor_root) not in sys.path:
	sys.path.insert(0, str(aitutor_root))

from aitutor.app.main import app

__all__ = ["app"]
