import logging

from app.core.settings import Settings


def configure_logging(settings: Settings) -> None:
    level_name = settings.api_log_level.upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
