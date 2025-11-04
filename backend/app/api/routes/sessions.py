from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import InterlacedJob, SessionFile, SessionRecord
from app.db.session import get_session
from app.pdf import interlace_pdfs
from app.schemas import (
    InterlaceRequest,
    InterlaceResponse,
    ReorderRequest,
    SessionCreateResponse,
    SessionDetailResponse,
    SessionFileResponse,
)
from app.utils.audit import log_action
from app.utils.files import file_path, persist_upload, remove_session_storage

router = APIRouter(prefix="/sessions")


async def _fetch_session(
    session_id: uuid.UUID, db: AsyncSession
) -> SessionRecord:
    result = await db.execute(
        select(SessionRecord)
        .options(selectinload(SessionRecord.files))
        .where(SessionRecord.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    session.files.sort(key=lambda item: item.sort_index)
    return session


def _build_file_response(record: SessionFile) -> SessionFileResponse:
    return SessionFileResponse(
        id=record.id,
        original_filename=record.original_filename,
        sort_index=record.sort_index,
        file_size=record.file_size,
        preview_url=f"/api/sessions/{record.session_id}/files/{record.id}",
    )


async def _build_session_response(
    record: SessionRecord
) -> SessionDetailResponse:
    return SessionDetailResponse(
        id=record.id,
        created_at=record.created_at,
        files=[_build_file_response(file_record) for file_record in record.files],
    )


@router.post("", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_session(db: AsyncSession = Depends(get_session)) -> SessionCreateResponse:
    record = SessionRecord()
    db.add(record)
    await db.flush()
    await log_action(db, action="session_created", session_id=record.id)
    await db.commit()
    await db.refresh(record)
    return SessionCreateResponse.model_validate(record)


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def read_session(
    session_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> SessionDetailResponse:
    session_record = await _fetch_session(session_id, db)
    return await _build_session_response(session_record)


@router.post(
    "/{session_id}/upload",
    response_model=SessionDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_pdfs(
    session_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_session),
) -> SessionDetailResponse:
    if len(files) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exactly two PDF files are required",
        )

    session_record = await _fetch_session(session_id, db)

    # Remove existing files and clear directory
    for existing in list(session_record.files):
        path = file_path(session_id, existing.stored_filename)
        if path.exists():
            path.unlink()
        await db.delete(existing)
    await db.flush()

    stored_records: list[SessionFile] = []
    for index, upload in enumerate(files):
        if not (upload.filename or "").lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{upload.filename or 'File'} must be a PDF",
            )
        stored_name, size = await persist_upload(session_id, upload)
        file_record = SessionFile(
            session_id=session_id,
            original_filename=upload.filename or f"Document {index + 1}.pdf",
            stored_filename=stored_name,
            sort_index=index,
            file_size=size,
        )
        db.add(file_record)
        stored_records.append(file_record)

    await db.flush()
    await log_action(
        db,
        action="files_uploaded",
        session_id=session_id,
        details={"files": [record.original_filename for record in stored_records]},
    )
    await db.commit()

    refreshed_session = await _fetch_session(session_id, db)
    return await _build_session_response(refreshed_session)


@router.post("/{session_id}/order", response_model=SessionDetailResponse)
async def reorder_pdfs(
    session_id: uuid.UUID,
    payload: ReorderRequest,
    db: AsyncSession = Depends(get_session),
) -> SessionDetailResponse:
    session_record = await _fetch_session(session_id, db)
    existing_ids = {file.id for file in session_record.files}
    requested_ids = set(payload.file_order)

    if existing_ids != requested_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File order must reference all uploaded files",
        )

    for index, file_id in enumerate(payload.file_order):
        next_record = next(file for file in session_record.files if file.id == file_id)
        next_record.sort_index = index

    await db.flush()
    await log_action(
        db,
        action="files_reordered",
        session_id=session_id,
        details={"order": [str(file_id) for file_id in payload.file_order]},
    )
    await db.commit()

    refreshed_session = await _fetch_session(session_id, db)
    return await _build_session_response(refreshed_session)


@router.post("/{session_id}/interlace", response_model=InterlaceResponse)
async def interlace(
    session_id: uuid.UUID,
    payload: InterlaceRequest,
    db: AsyncSession = Depends(get_session),
) -> InterlaceResponse:
    session_record = await _fetch_session(session_id, db)
    if len(session_record.files) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Two PDF files are required before interlacing",
        )

    if payload.file_order:
        if set(payload.file_order) != {file.id for file in session_record.files}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File order must include both uploaded files",
            )
        ordered_files = [
            next(file for file in session_record.files if file.id == identifier)
            for identifier in payload.file_order
        ]
    else:
        ordered_files = sorted(session_record.files, key=lambda file: file.sort_index)

    first, second = ordered_files
    destination_name = payload.desired_name or "merged.pdf"
    destination_name = destination_name if destination_name.lower().endswith(".pdf") else f"{destination_name}.pdf"
    stored_result_name = f"{uuid.uuid4()}.pdf"
    destination_path = file_path(session_id, stored_result_name)

    interlace_pdfs(
        file_path(session_id, first.stored_filename),
        file_path(session_id, second.stored_filename),
        destination_path,
    )

    job_record = InterlacedJob(
        session_id=session_id,
        result_filename=destination_name,
        stored_filename=stored_result_name,
    )
    db.add(job_record)
    await db.flush()

    await log_action(
        db,
        action="pdf_interlaced",
        session_id=session_id,
        details={
            "job_id": str(job_record.id),
            "order": [str(file.id) for file in ordered_files],
            "result": destination_name,
        },
    )
    await db.commit()
    await db.refresh(job_record)

    download_path = f"/api/sessions/{session_id}/results/{job_record.id}"
    return InterlaceResponse(
        job_id=job_record.id,
        download_url=download_path,
        preview_url=download_path,
    )


@router.get("/{session_id}/files/{file_id}")
async def fetch_file(
    session_id: uuid.UUID,
    file_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
) -> FileResponse:
    session_record = await _fetch_session(session_id, db)
    match = next((file for file in session_record.files if file.id == file_id), None)
    if match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = file_path(session_id, match.stored_filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file missing")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=match.original_filename,
    )


@router.get("/{session_id}/results/{job_id}")
async def fetch_result(
    session_id: uuid.UUID,
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
) -> FileResponse:
    job_result = await db.get(InterlacedJob, job_id)
    if not job_result or job_result.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")

    path = file_path(session_id, job_result.stored_filename)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored result missing")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=job_result.result_filename,
    )


@router.post("/{session_id}/reset", response_model=SessionDetailResponse)
async def reset_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
) -> SessionDetailResponse:
    session_record = await _fetch_session(session_id, db)

    remove_session_storage(session_id)
    await db.execute(delete(SessionFile).where(SessionFile.session_id == session_id))
    await db.execute(delete(InterlacedJob).where(InterlacedJob.session_id == session_id))
    await log_action(db, action="session_reset", session_id=session_id)
    await db.commit()

    refreshed_session = await _fetch_session(session_id, db)
    return await _build_session_response(refreshed_session)
