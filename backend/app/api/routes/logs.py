from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas import FrontendErrorReport, LogAcknowledgement
from app.utils.audit import log_error

router = APIRouter(prefix="/logs")


@router.post("/errors", response_model=LogAcknowledgement, status_code=status.HTTP_201_CREATED)
async def capture_frontend_error(
    payload: FrontendErrorReport,
    db: AsyncSession = Depends(get_session),
) -> LogAcknowledgement:
    await log_error(
        db,
        location=payload.location,
        message=payload.message,
        session_id=payload.session_id,
        details={
            "stack": payload.stack,
            "metadata": payload.metadata,
        },
    )
    await db.commit()
    return LogAcknowledgement()
