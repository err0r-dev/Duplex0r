from __future__ import annotations

import datetime as dt
from typing import Optional

from pydantic import BaseModel, Field
from pydantic.config import ConfigDict


class ProcessingLogOut(BaseModel):
    id: int
    created_at: dt.datetime
    first_pdf_name: str
    second_pdf_name: str
    swapped_order: bool
    output_filename: str
    status: str
    error_message: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class SettingsPayload(BaseModel):
    default_order: str = Field(pattern="^(first_second|second_first)$")


class SettingsResponse(SettingsPayload):
    pass


__all__ = ["ProcessingLogOut", "SettingsPayload", "SettingsResponse"]
