from fastapi import APIRouter, Depends

from app.core.dependencies import get_app_settings
from app.core.settings import Settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(settings: Settings = Depends(get_app_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.api_name,
        version=settings.api_version,
        environment=settings.api_env,
    )
