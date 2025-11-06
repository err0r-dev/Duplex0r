from __future__ import annotations

import io

from pypdf import PdfReader, PdfWriter

from backend.api.app.services.pdf import interleave_pdfs


def _make_pdf(page_count: int) -> bytes:
    writer = PdfWriter()
    for _ in range(page_count):
        writer.add_blank_page(width=72, height=72)
    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.read()


def test_interleave_even_pages():
    pdf_a = _make_pdf(2)
    pdf_b = _make_pdf(2)
    merged, _ = interleave_pdfs(pdf_a, pdf_b)
    reader = PdfReader(io.BytesIO(merged))
    assert len(reader.pages) == 4


def test_interleave_handles_missing_pages():
    pdf_a = _make_pdf(3)
    pdf_b = _make_pdf(1)
    merged, _ = interleave_pdfs(pdf_a, pdf_b)
    reader = PdfReader(io.BytesIO(merged))
    assert len(reader.pages) == 4
