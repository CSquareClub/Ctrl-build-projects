from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.parser import get_repo_context
from app.services.formatter import format_readme
from app.core.engine import call_qwen
from pydantic import BaseModel
import os
import logging

# Setup logging to help debug import or runtime issues
logger = logging.getLogger(__name__)

app = FastAPI(title="README-AI Backend")

# 1. Enable CORS (Cross-Origin Resource Sharing)
# This is required so that your v0.app frontend can make requests to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; change to specific domain for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RepoRequest(BaseModel):
    path: str

@app.post("/generate")
def generate_readme(request: RepoRequest):
    """
    Main endpoint to generate a README.
    Defined as a standard 'def' (not async) because the inner functions
    (file parsing and ollama generation) are synchronous, blocking operations.
    FastAPI will automatically run this in an external threadpool.
    """
    # 2. Path Cleaning & Validation
    clean_path = "".join(char for char in request.path if ord(char) >= 32).strip()

    if not os.path.exists(clean_path):
        raise HTTPException(status_code=404, detail=f"Path not found: {clean_path}")

    try:
        # 3. Extract Repository Context
        # get_repo_context returns (context_text, list_of_detected_files)
        context, detected_files = get_repo_context(clean_path)

        # 4. Call AI Model (Qwen2.5-Coder via Ollama)
        raw_result = call_qwen(context)

        # 5. Professional Formatting & Audit
        # Uses your formatter.py logic to strip fences, add badges, and check sections
        formatted = format_readme(raw_result, detected_files)

        return {
            "status": "success",
            "metadata": {
                "title": formatted.title,
                "sections": formatted.sections,
                "warnings": formatted.warnings
            },
            "readme": formatted.content
        }

    except RuntimeError as e:
        # Catch specific AI service errors (e.g., Ollama offline)
        logger.error(f"AI Service Error: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        # Catch any other unexpected errors
        logger.error(f"Unexpected Error: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")