from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import AppSetting
from ..schemas import SettingsPayload, SettingsResponse

router = APIRouter(prefix="/settings", tags=["settings"])

DEFAULT_ORDER_KEY = "default_order"
DEFAULT_ORDER_VALUE = "first_second"


@router.get("/", response_model=SettingsResponse)
async def get_settings(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AppSetting).where(AppSetting.key == DEFAULT_ORDER_KEY))
    setting = result.scalar_one_or_none()
    if setting is None:
        await _store_default(session)
        return SettingsResponse(default_order=DEFAULT_ORDER_VALUE)
    return SettingsResponse(default_order=setting.value)


@router.post("/", response_model=SettingsResponse)
async def update_settings(payload: SettingsPayload, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(AppSetting).where(AppSetting.key == DEFAULT_ORDER_KEY))
    setting = result.scalar_one_or_none()
    if setting is None:
        setting = AppSetting(key=DEFAULT_ORDER_KEY, value=payload.default_order)
        session.add(setting)
    else:
        setting.value = payload.default_order
    await session.commit()
    return SettingsResponse(default_order=payload.default_order)


async def _store_default(session: AsyncSession) -> None:
    setting = AppSetting(key=DEFAULT_ORDER_KEY, value=DEFAULT_ORDER_VALUE)
    session.add(setting)
    await session.commit()


__all__ = ["router"]
