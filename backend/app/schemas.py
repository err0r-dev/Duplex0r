from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SessionCreateResponse(BaseModel):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SessionFileResponse(BaseModel):
    id: uuid.UUID
    original_filename: str
    sort_index: int
    file_size: int = Field(ge=0)
    preview_url: str

    model_config = ConfigDict(from_attributes=True)


class SessionDetailResponse(BaseModel):
    id: uuid.UUID
    created_at: datetime
    files: list[SessionFileResponse]

    model_config = ConfigDict(from_attributes=True)


class InterlaceRequest(BaseModel):
    file_order: list[uuid.UUID]
    desired_name: str | None = None


class InterlaceResponse(BaseModel):
    job_id: uuid.UUID
    download_url: str
    preview_url: str


class ReorderRequest(BaseModel):
    file_order: list[uuid.UUID]


class SettingsResponse(BaseModel):
    database: dict[str, str]


class FrontendErrorReport(BaseModel):
    session_id: uuid.UUID | None = None
    location: str
    message: str
    stack: str | None = None
    metadata: dict[str, str] | None = None


class LogAcknowledgement(BaseModel):
    status: str = Field(default="logged")
