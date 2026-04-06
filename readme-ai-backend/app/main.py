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

        # 5. Robust Cleaning (Fixes 'Inception' bug and hallucinations like 'obj[middle_code]')
        clean_readme = raw_result.strip()

        # Strip markdown fences if the model wraps output
        if "```" in clean_readme:
            parts = clean_readme.split("```")
            if len(parts) >= 3:
                # Take the content between the first and last triple backticks
                clean_readme = parts[1]
                # Remove common language labels from the start
                for label in ["markdown", "md", "text"]:
                    if clean_readme.lower().startswith(label):
                        clean_readme = clean_readme[len(label):].strip()

        # Fallback for self-referential hallucinations
        if "obj[" in clean_readme or len(clean_readme) < 100:
            clean_readme = f"# {clean_path.split('/')[-1].upper()}\n\nAnalyzed {len(detected_files)} files. Specific architectural summary pending due to complex recursion logic."

        # 6. Professional Formatting & Audit
        # Uses your formatter.py logic to add badges and check sections
        formatted = format_readme(clean_readme, detected_files)

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

@app.get("/health")
def health_check():
    """Simple endpoint for the frontend to verify the API is online."""
    return {"status": "online", "engine": "Qwen2.5-Coder:7b"}
