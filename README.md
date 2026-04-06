# Tesseract Resume Ranker

Python resume screening pipeline that:

- detects whether an uploaded resume looks fake or template-based
- ranks only resumes that appear real
- returns a JSON-safe result that backend services can send straight to clients

## Install From GitHub

After this branch is merged to `main`:

```bash
pip install git+https://github.com/Uday-Jav/Tesseract.git
```

If your backend teammate needs the AI branch right now:

```bash
pip install git+https://github.com/Uday-Jav/Tesseract.git@feature-ai
```

## Local Setup

```bash
git clone https://github.com/Uday-Jav/Tesseract.git
cd Tesseract
pip install -r requirements.txt
```

## Backend Usage

### 1. Analyze a resume from a file path

```python
from ai_pipeline import analyze_resume

result = analyze_resume(
    "C:/resumes/candidate.pdf",
    "Looking for a Python developer with SQL and machine learning experience.",
)
```

### 2. Analyze an uploaded PDF directly from backend bytes

This is the easiest way to use it in FastAPI, Flask, or Django after a file upload.

```python
from ai_pipeline import analyze_resume_bytes

result = analyze_resume_bytes(
    file_bytes=uploaded_pdf_bytes,
    job_description="Looking for a Python developer with SQL and machine learning experience.",
    filename="candidate.pdf",
)
```

### 3. FastAPI example

```python
from fastapi import FastAPI, File, Form, UploadFile
from ai_pipeline import analyze_resume_bytes

app = FastAPI()

@app.post("/analyze-resume")
async def analyze_resume_api(
    job_description: str = Form(...),
    resume: UploadFile = File(...),
):
    file_bytes = await resume.read()
    return analyze_resume_bytes(
        file_bytes=file_bytes,
        job_description=job_description,
        filename=resume.filename,
    )
```

## Response Contract

Every analyzer call returns a plain dictionary with fields like:

```python
{
    "match_score": 0.0,
    "fraud_score": 100,
    "final_score": 0.0,
    "skills": [],
    "missing_skills": [],
    "fraud_reasons": [],
    "authenticity_score": 100,
    "authenticity_reasons": [],
    "quality_score": 28,
    "quality_warnings": [],
    "is_fake": True,
    "resume_status": "fake",
    "ranked": False,
    "explanation": "Resume appears to be fake or template-based..."
}
```

## Result Rules

- If `is_fake` is `true`, the resume is treated as fake/template-based.
- If `ranked` is `false`, ranking was skipped.
- If `resume_status` is `real`, the resume passed authenticity checks and `match_score` plus `final_score` are meaningful.

## Fake Detection Signals

The pipeline now checks for:

- placeholder names such as `First Name Last Name`
- dummy contact details such as `email@email.com` or `555` phone numbers
- instructional template text such as `This is where you write...`
- instruction-heavy second-person wording typical of unfilled resume templates

## Run Tests

```bash
python -m unittest ai.test_ai -v
```
