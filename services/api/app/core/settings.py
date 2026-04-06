from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    api_name: str = Field(default="OpenIssue API", alias="OPENISSUE_API_NAME")
    api_version: str = Field(default="0.1.0", alias="OPENISSUE_API_VERSION")
    api_env: str = Field(default="development", alias="OPENISSUE_API_ENV")
    api_host: str = Field(default="0.0.0.0", alias="OPENISSUE_API_HOST")
    api_port: int = Field(default=8000, alias="OPENISSUE_API_PORT")
    api_log_level: str = Field(default="info", alias="OPENISSUE_API_LOG_LEVEL")
    api_prefix: str = Field(default="/api", alias="OPENISSUE_API_PREFIX")

    github_token: Optional[str] = Field(default=None, alias="OPENISSUE_GITHUB_TOKEN")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
