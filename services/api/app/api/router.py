from fastapi import APIRouter

from app.api.health import router as health_router
from app.core.settings import Settings


def build_api_router(settings: Settings) -> APIRouter:
    api_router = APIRouter(prefix=settings.api_prefix)
    api_router.include_router(health_router)
    return api_router
