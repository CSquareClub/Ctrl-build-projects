from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI

# Support direct execution via `python main.py` from this directory.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.router import build_api_router
from app.core.logging import configure_logging
from app.core.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.api_name,
        version=settings.api_version,
    )
    app.include_router(build_api_router(settings))
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
