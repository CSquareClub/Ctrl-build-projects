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

    github_api_base_url: str = Field(
        default="https://api.github.com",
        alias="OPENISSUE_GITHUB_API_BASE_URL",
    )
    github_timeout_seconds: float = Field(
        default=20.0,
        alias="OPENISSUE_GITHUB_TIMEOUT_SECONDS",
    )
    github_token: Optional[str] = Field(default=None, alias="OPENISSUE_GITHUB_TOKEN")

    embedding_provider: str = Field(
        default="minilm-local",
        alias="OPENISSUE_EMBEDDING_PROVIDER",
    )
    embedding_model_name: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        alias="OPENISSUE_EMBEDDING_MODEL_NAME",
    )
    embedding_vector_dim: int = Field(
        default=256,
        alias="OPENISSUE_EMBEDDING_VECTOR_DIM",
    )

    vector_store_provider: str = Field(
        default="sqlite-local",
        alias="OPENISSUE_VECTOR_STORE_PROVIDER",
    )
    vector_store_path: str = Field(
        default=".openissue/openissue_vectors.db",
        alias="OPENISSUE_VECTOR_STORE_PATH",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
