"""Main FastAPI application for ResumeRanker."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated
import shutil

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.services.resume_analysis import analyze_uploaded_resume

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
async def upload_resume(
    file: Annotated[UploadFile | None, File(None)],
    job_description: Annotated[str | None, Form(None)] = None,
) -> dict:
    """
    Upload a PDF resume, analyze it with the AI pipeline, and keep it in memory.
    """
    if file is None:
        raise HTTPException(status_code=400, detail="Resume file is required.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing.")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    active_job_description = (job_description or job_description_text).strip()
    if not active_job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description is required. Submit it in the form or upload one first.",
        )

    destination = DATA_DIR / file.filename

    try:
        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        analysis = await analyze_uploaded_resume(
            source_path=destination,
            filename=file.filename,
            job_description=active_job_description,
        )
    except ValueError as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(error)) from error
    except ImportError as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(error)) from error
    except Exception as error:  # pragma: no cover - defensive beginner-friendly error handling
        destination.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="AI processing failed for the uploaded resume.") from error
    finally:
        await file.close()

    resume_id = len(uploaded_resumes) + 1
    resume_record = {
        "id": resume_id,
        "filename": file.filename,
        "file_path": str(destination),
        "analysis": analysis,
    }
    uploaded_resumes.append(resume_record)

    return {
        "resume_id": resume_id,
        "filename": file.filename,
        "message": "Resume uploaded successfully.",
        "analysis": analysis,
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
    """Return all uploaded resumes ranked by their AI final score."""
    if not uploaded_resumes:
        raise HTTPException(status_code=404, detail="No resumes have been uploaded yet.")

    ranked_resumes = []
    for resume in uploaded_resumes:
        analysis = resume["analysis"]
        ranked_resumes.append(
            {
                "resume_id": resume["id"],
                "filename": resume["filename"],
                "score": analysis["final_score"],
                "match_score": analysis["match_score"],
                "fraud_score": analysis["fraud_score"],
                "skills": analysis["skills"],
                "missing_skills": analysis["missing_skills"],
                "fraud_reasons": analysis["fraud_reasons"],
            }
        )

    ranked_resumes.sort(key=lambda item: item["score"], reverse=True)
    return {"ranked_resumes": ranked_resumes}


@app.get("/analysis/{resume_id}")
def get_analysis(resume_id: int) -> dict:
    """Return detailed analysis for one uploaded resume."""
    resume = next((item for item in uploaded_resumes if item["id"] == resume_id), None)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")

    analysis = resume["analysis"]
    return {
        "resume_id": resume["id"],
        "filename": resume["filename"],
        "match_score": analysis["match_score"],
        "fraud_score": analysis["fraud_score"],
        "final_score": analysis["final_score"],
        "skills": analysis["skills"],
        "missing_skills": analysis["missing_skills"],
        "fraud_reasons": analysis["fraud_reasons"],
        "explanation": analysis["explanation"],
    }
