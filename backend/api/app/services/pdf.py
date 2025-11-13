from __future__ import annotations

import io
import uuid
from typing import Tuple

from pypdf import PdfReader, PdfWriter


class PDFProcessingError(RuntimeError):
    """Raised when a PDF cannot be processed."""


def interleave_pdfs(
    pdf_a: bytes, pdf_b: bytes, reverse_a: bool = False, reverse_b: bool = False
) -> Tuple[bytes, str]:
    """Interleave pages from two PDFs and return the combined bytes with a generated filename.

    Args:
        pdf_a: First PDF as bytes
        pdf_b: Second PDF as bytes
        reverse_a: If True, reverse the page order of the first PDF before interleaving
        reverse_b: If True, reverse the page order of the second PDF before interleaving
    """
    try:
        reader_a = PdfReader(io.BytesIO(pdf_a))
        reader_b = PdfReader(io.BytesIO(pdf_b))
    except Exception as exc:  # pragma: no cover - library-specific errors
        raise PDFProcessingError("Unable to read one of the PDF files") from exc

    # Get pages as lists so we can reverse them if needed
    pages_a = list(reader_a.pages)
    pages_b = list(reader_b.pages)

    # Reverse page order if requested (for duplex scanning)
    if reverse_a:
        pages_a = list(reversed(pages_a))
    if reverse_b:
        pages_b = list(reversed(pages_b))

    writer = PdfWriter()
    max_len = max(len(pages_a), len(pages_b))

    for idx in range(max_len):
        if idx < len(pages_a):
            writer.add_page(pages_a[idx])
        if idx < len(pages_b):
            writer.add_page(pages_b[idx])

    buffer = io.BytesIO()
    try:
        writer.write(buffer)
    except Exception as exc:  # pragma: no cover - library-specific errors
        raise PDFProcessingError("Failed to build merged PDF") from exc

    buffer.seek(0)
    filename = f"interleaved-{uuid.uuid4().hex}.pdf"
    return buffer.read(), filename


__all__ = ["interleave_pdfs", "PDFProcessingError"]
