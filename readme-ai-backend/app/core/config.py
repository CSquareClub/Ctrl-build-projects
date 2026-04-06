from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Updated to the powerful Qwen 2.5 Coder model
    ollama_model: str = "qwen2.5-coder:7b"
    ollama_temperature: float = 0.1
    ollama_num_predict: int = 4096

    # Limits for repository parsing
    max_repo_files: int = 50
    max_content_entries: int = 15
    max_content_chars: int = 3000

    class Config:
        env_file = ".env"


settings = Settings()