from fastapi import FastAPI

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
