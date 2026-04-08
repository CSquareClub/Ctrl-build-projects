"""Helpers for integrating the AI resume analyzer with FastAPI routes."""

from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
import shutil

from starlette.concurrency import run_in_threadpool

from backend.utils.parser import extract_text


async def analyze_uploaded_resume(source_path: Path, filename: str, job_description: str) -> dict:
    """
    Validate an uploaded PDF and send it to the AI module using a temp file.

    The AI call is run in a threadpool because it is blocking work and the
    FastAPI route using it is async.
    """
    temporary_path = _copy_to_temporary_pdf(source_path=source_path, filename=filename)

    try:
        # Validate that the uploaded file is a readable PDF before AI processing.
        await run_in_threadpool(extract_text, str(temporary_path))
        analysis = await run_in_threadpool(_run_ai_analysis, str(temporary_path), job_description)
    finally:
        temporary_path.unlink(missing_ok=True)

    return _normalize_analysis_result(analysis)


def _copy_to_temporary_pdf(source_path: Path, filename: str) -> Path:
    suffix = Path(filename).suffix or ".pdf"
    with NamedTemporaryFile(delete=False, suffix=suffix) as temporary_file:
        temporary_path = Path(temporary_file.name)

    with source_path.open("rb") as source_file, temporary_path.open("wb") as destination_file:
        shutil.copyfileobj(source_file, destination_file)

    return temporary_path


def _run_ai_analysis(file_path: str, job_description: str) -> dict:
    try:
        from ai_pipeline import analyze_resume
    except ModuleNotFoundError as error:
        raise ImportError(
            "The AI pipeline module could not be imported. Expected `ai_pipeline.py` at the project root."
        ) from error

    return analyze_resume(file_path, job_description)


def _normalize_analysis_result(analysis: dict) -> dict:
    """
    Keep the API response stable even if the AI module omits optional keys.
    """
    return {
        "match_score": float(analysis.get("match_score", 0.0)),
        "fraud_score": int(analysis.get("fraud_score", 0)),
        "final_score": float(analysis.get("final_score", 0.0)),
        "skills": list(analysis.get("skills", [])),
        "missing_skills": list(analysis.get("missing_skills", [])),
        "fraud_reasons": list(analysis.get("fraud_reasons", [])),
        "explanation": str(analysis.get("explanation", "")),
    }
