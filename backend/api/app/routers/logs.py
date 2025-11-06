from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import ProcessingLog
from ..schemas import ProcessingLogOut

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/", response_model=List[ProcessingLogOut])
async def list_logs(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ProcessingLog).order_by(ProcessingLog.created_at.desc()))
    logs = result.scalars().all()
    return [ProcessingLogOut.model_validate(log) for log in logs]


@router.delete("/")
async def clear_logs(session: AsyncSession = Depends(get_session)):
    """Delete all processing logs."""
    result = await session.execute(select(ProcessingLog))
    logs = result.scalars().all()
    for log in logs:
        await session.delete(log)
    await session.commit()
    return {"message": f"Deleted {len(logs)} log(s)", "count": len(logs)}


__all__ = ["router"]
