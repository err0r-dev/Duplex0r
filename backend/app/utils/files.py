from __future__ import annotations

import shutil
import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.config import settings


def session_dir(session_id: uuid.UUID) -> Path:
    directory = settings.storage_root / str(session_id)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


async def persist_upload(session_id: uuid.UUID, upload: UploadFile) -> tuple[str, int]:
    original_name = upload.filename or "document.pdf"
    extension = Path(original_name).suffix.lower() or ".pdf"
    stored_name = f"{uuid.uuid4()}{extension}"
    destination = session_dir(session_id) / stored_name
    size = 0

    async with aiofiles.open(destination, "wb") as file_out:
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            await file_out.write(chunk)

    await upload.seek(0)
    return stored_name, size


def file_path(session_id: uuid.UUID, stored_name: str) -> Path:
    return session_dir(session_id) / stored_name


def remove_session_storage(session_id: uuid.UUID) -> None:
    directory = settings.storage_root / str(session_id)
    if directory.exists():
        shutil.rmtree(directory)
