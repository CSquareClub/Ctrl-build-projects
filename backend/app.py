"""Main FastAPI application for ResumeRanker."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated
import shutil

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.ai.model import get_resume_score
from backend.utils.parser import extract_text

app = FastAPI(title="ResumeRanker API")

# Allow frontend apps to connect during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder used to store uploaded PDF files.
DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# In-memory storage for hackathon use.
job_description_text = ""
uploaded_resumes: list[dict] = []


@app.get("/")
def read_root() -> dict:
    """Health-check endpoint."""
    return {"message": "ResumeRanker API running"}


@app.post("/upload-resume")
async def upload_resume(file: Annotated[UploadFile, File(...)]) -> dict:
    """
    Upload a PDF resume, save it, extract text, and keep it in memory.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    destination = DATA_DIR / file.filename

    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        resume_text = extract_text(str(destination))
    except ValueError as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - defensive beginner-friendly error handling
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to process the uploaded PDF.") from error
    finally:
        await file.close()

    resume_id = len(uploaded_resumes) + 1
    resume_record = {
        "id": resume_id,
        "filename": file.filename,
        "file_path": str(destination),
        "text": resume_text,
    }
    uploaded_resumes.append(resume_record)

    return {
        "resume_id": resume_id,
        "filename": file.filename,
        "message": "Resume uploaded successfully.",
        "text_preview": resume_text[:500],
    }


@app.post("/upload-job")
def upload_job(job_description: Annotated[str, Form(...)]) -> dict:
    """Store the latest job description in memory."""
    global job_description_text

    cleaned_text = job_description.strip()
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    job_description_text = cleaned_text
    return {
        "message": "Job description stored successfully.",
        "job_description_preview": job_description_text[:500],
    }


@app.get("/rank")
def rank_resumes() -> dict:
    """Score all uploaded resumes against the stored job description."""
    if not job_description_text:
        raise HTTPException(status_code=400, detail="Upload a job description first.")

    if not uploaded_resumes:
        raise HTTPException(status_code=404, detail="No resumes have been uploaded yet.")

    ranked_resumes = []
    for resume in uploaded_resumes:
        analysis = get_resume_score(resume["text"], job_description_text)
        ranked_resumes.append(
            {
                "resume_id": resume["id"],
                "filename": resume["filename"],
                "score": analysis["score"],
                "matched_skills": analysis["matched_skills"],
                "missing_skills": analysis["missing_skills"],
            }
        )

    ranked_resumes.sort(key=lambda item: item["score"], reverse=True)
    return {"ranked_resumes": ranked_resumes}


@app.get("/analysis/{resume_id}")
def get_analysis(resume_id: int) -> dict:
    """Return detailed analysis for one uploaded resume."""
    if not job_description_text:
        raise HTTPException(status_code=400, detail="Upload a job description first.")

    resume = next((item for item in uploaded_resumes if item["id"] == resume_id), None)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    analysis = get_resume_score(resume["text"], job_description_text)
    return {
        "resume_id": resume["id"],
        "filename": resume["filename"],
        "score": analysis["score"],
        "matched_skills": analysis["matched_skills"],
        "missing_skills": analysis["missing_skills"],
    }
