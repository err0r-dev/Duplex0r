from __future__ import annotations

import datetime as dt
from io import BytesIO

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_session
from ..models import ProcessingLog
from ..services.pdf import PDFProcessingError, interleave_pdfs

router = APIRouter(prefix="/process", tags=["processing"])


@router.post("/", response_description="Interleaved PDF download")
async def process_pdfs(
    first_pdf: UploadFile = File(..., description="First PDF file"),
    second_pdf: UploadFile = File(..., description="Second PDF file"),
    order: str = Form("first_second", pattern="^(first_second|second_first)$"),
    reverse_first: str = Form("false", description="Reverse first PDF pages"),
    reverse_second: str = Form("false", description="Reverse second PDF pages"),
    session: AsyncSession = Depends(get_session),
):
    settings = get_settings()

    pdf_a = await first_pdf.read()
    pdf_b = await second_pdf.read()

    # Convert string booleans to actual booleans
    reverse_a = reverse_first.lower() == "true"
    reverse_b = reverse_second.lower() == "true"

    swapped = order == "second_first"
    if swapped:
        pdf_a, pdf_b = pdf_b, pdf_a
        reverse_a, reverse_b = reverse_b, reverse_a

    log_entry = ProcessingLog(
        created_at=dt.datetime.utcnow(),
        first_pdf_name=first_pdf.filename or "first.pdf",
        second_pdf_name=second_pdf.filename or "second.pdf",
        swapped_order=swapped,
        output_filename="",
        status="pending",
    )
    session.add(log_entry)
    await session.flush()

    try:
        merged_bytes, filename = interleave_pdfs(pdf_a, pdf_b, reverse_a, reverse_b)
    except PDFProcessingError as exc:
        log_entry.status = "error"
        log_entry.error_message = str(exc)
        await session.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    output_path = settings.static_dir / filename
    output_path.write_bytes(merged_bytes)

    log_entry.status = "completed"
    log_entry.output_filename = filename
    await session.commit()

    buffer = BytesIO(merged_bytes)
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(buffer, media_type="application/pdf", headers=headers)
