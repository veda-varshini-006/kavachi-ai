from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="KAVACH_",
        extra="ignore"
    )

    # Base paths
    data_root: Path = Path("data")
    db_path: Path = Path("data/kavach.db")

    # API configuration
    cors_origins: str = "http://localhost:3000"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    log_level: str = "INFO"

    # Database
    database_url: str = ""  # If blank, SQLite fallback is used

    @property
    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        # Create data directory if it doesn't exist
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{self.db_path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
