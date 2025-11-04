from __future__ import annotations

from pathlib import Path

from PyPDF2 import PdfReader, PdfWriter


def interlace_pdfs(first: Path, second: Path, destination: Path) -> None:
    writer = PdfWriter()
    readers = [PdfReader(str(first)), PdfReader(str(second))]
    max_length = max(len(reader.pages) for reader in readers)

    for index in range(max_length):
        for reader in readers:
            if index < len(reader.pages):
                writer.add_page(reader.pages[index])

    with destination.open("wb") as output_stream:
        writer.write(output_stream)
