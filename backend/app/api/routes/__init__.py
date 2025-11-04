from __future__ import annotations

from fastapi import APIRouter

from . import health, logs, sessions, settings

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(settings.router, tags=["settings"])
api_router.include_router(logs.router, tags=["logs"])
api_router.include_router(sessions.router, tags=["sessions"])
