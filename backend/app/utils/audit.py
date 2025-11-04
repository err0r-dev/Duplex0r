from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActionLog, ErrorLog


async def log_action(
    db: AsyncSession,
    *,
    action: str,
    session_id: uuid.UUID | None = None,
    details: dict | None = None,
) -> None:
    record = ActionLog(session_id=session_id, action=action, details=details)
    db.add(record)
    await db.flush()


async def log_error(
    db: AsyncSession,
    *,
    location: str,
    message: str,
    session_id: uuid.UUID | None = None,
    details: dict | None = None,
) -> None:
    record = ErrorLog(
        session_id=session_id,
        location=location,
        message=message,
        details=details,
    )
    db.add(record)
    await db.flush()
