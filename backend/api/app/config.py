from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    
    app_name: str = "Dupl3x API"
    allow_origins: List[str] = Field(default_factory=lambda: ["*"])
    database_url: str = Field(
        default="sqlite+aiosqlite:///" + str((Path(__file__).resolve().parent / "../data/app.db").resolve())
    )
    static_dir: Path = Field(default=Path(__file__).resolve().parent / "../data/output")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def is_postgres(self) -> bool:
        return self.database_url.startswith("postgresql") or self.database_url.startswith("postgres")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.static_dir.mkdir(parents=True, exist_ok=True)
    return settings


__all__ = ["Settings", "get_settings"]
