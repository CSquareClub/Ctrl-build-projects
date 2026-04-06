from fastapi import APIRouter

from app.api.health import router as health_router
from app.core.settings import Settings
from app.routes.analyze import router as analyze_router
from app.routes.classification import router as classification_router
from app.routes.issues import router as issues_router
from app.routes.similar import router as similar_router
from app.routes.vectors import router as vectors_router


def build_api_router(settings: Settings) -> APIRouter:
    api_router = APIRouter(prefix=settings.api_prefix)
    api_router.include_router(health_router)
    api_router.include_router(issues_router)
    api_router.include_router(vectors_router)
    api_router.include_router(similar_router)
    api_router.include_router(classification_router)
    api_router.include_router(analyze_router)
    return api_router
