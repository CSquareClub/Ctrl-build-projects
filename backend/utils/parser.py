"""PDF parsing helpers for ResumeRanker."""

from __future__ import annotations

import pdfplumber


def extract_text(file_path: str) -> str:
    """
    Extract all text from a PDF file.

    Returns a clean string. Raises ValueError if no readable text is found.
    """
    extracted_pages: list[str] = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(page_text)

    full_text = "\n".join(extracted_pages).strip()

    if not full_text:
        raise ValueError("No readable text found in the PDF.")

    return full_text
