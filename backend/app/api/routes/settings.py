from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.schemas import SettingsResponse

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
async def read_settings() -> SettingsResponse:
    return SettingsResponse(
        database={
            "host": settings.database_host,
            "port": str(settings.database_port),
            "user": settings.database_user,
            "password": settings.database_password,
            "database": settings.database_name,
        }
    )
