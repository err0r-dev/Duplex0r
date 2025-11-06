from __future__ import annotations

import io
import uuid
from typing import Tuple

from pypdf import PdfReader, PdfWriter


class PDFProcessingError(RuntimeError):
    """Raised when a PDF cannot be processed."""


def interleave_pdfs(pdf_a: bytes, pdf_b: bytes) -> Tuple[bytes, str]:
    """Interleave pages from two PDFs and return the combined bytes with a generated filename."""
    try:
        reader_a = PdfReader(io.BytesIO(pdf_a))
        reader_b = PdfReader(io.BytesIO(pdf_b))
    except Exception as exc:  # pragma: no cover - library-specific errors
        raise PDFProcessingError("Unable to read one of the PDF files") from exc

    writer = PdfWriter()
    max_len = max(len(reader_a.pages), len(reader_b.pages))

    for idx in range(max_len):
        if idx < len(reader_a.pages):
            writer.add_page(reader_a.pages[idx])
        if idx < len(reader_b.pages):
            writer.add_page(reader_b.pages[idx])

    buffer = io.BytesIO()
    try:
        writer.write(buffer)
    except Exception as exc:  # pragma: no cover - library-specific errors
        raise PDFProcessingError("Failed to build merged PDF") from exc

    buffer.seek(0)
    filename = f"interleaved-{uuid.uuid4().hex}.pdf"
    return buffer.read(), filename


__all__ = ["interleave_pdfs", "PDFProcessingError"]
