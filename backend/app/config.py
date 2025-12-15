"""
Application configuration settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "AI Log Analyzer API"
    app_version: str = "1.0.0-POC"
    debug: bool = False

    # Ollama Configuration
    ollama_host: str = "http://ollama:11434"
    ollama_model: str = "gpt-oss:20b"
    ollama_timeout: int = 120

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://frontend:80"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
