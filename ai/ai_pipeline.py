from collections import Counter
from functools import lru_cache
import math
import os
import re


SKILLS = ("python", "java", "sql", "react", "ml")
SPACE_PATTERN = re.compile(r"\s+")
WORD_PATTERN = re.compile(r"\b[a-z0-9]+\b")

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


def _default_result(reasons=None):
    return {
        "match_score": 0.0,
        "fraud_score": 0,
        "final_score": 0.0,
        "skills": [],
        "fraud_reasons": list(reasons or []),
    }


def extract_text(file_path):
    try:
        import pdfplumber
    except Exception as exc:
        raise RuntimeError("pdfplumber is not installed.") from exc

    try:
        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                if page is None:
                    continue

                try:
                    page_text = page.extract_text() or ""
                except Exception:
                    page_text = ""

                page_text = page_text.strip()
                if page_text:
                    pages.append(page_text)
    except Exception as exc:
        raise ValueError("Invalid or unreadable PDF file.") from exc

    return "\n".join(pages).strip()


def clean_text(text):
    return SPACE_PATTERN.sub(" ", str(text or "").lower()).strip()


@lru_cache(maxsize=1)
def _load_embedding_model():
    try:
        from huggingface_hub.utils import disable_progress_bars
        from sentence_transformers import SentenceTransformer
        from transformers.utils import logging as transformers_logging

        disable_progress_bars()
        transformers_logging.set_verbosity_error()
        transformers_logging.disable_progress_bar()

        try:
            return SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        return None


def get_embedding(text):
    cleaned_text = clean_text(text)
    if not cleaned_text:
        return []

    model = _load_embedding_model()
    if model is None:
        return []

    try:
        embedding = model.encode(cleaned_text, normalize_embeddings=True)
    except Exception:
        return []

    if hasattr(embedding, "tolist"):
        embedding = embedding.tolist()

    return [float(value) for value in embedding]


def compute_match_score(resume_text, job_text):
    if not resume_text or not job_text:
        return 0.0

    resume_embedding = get_embedding(resume_text)
    job_embedding = get_embedding(job_text)

    if not resume_embedding or not job_embedding:
        return 0.0

    try:
        dot_product = sum(a * b for a, b in zip(resume_embedding, job_embedding))
        resume_norm = math.sqrt(sum(value * value for value in resume_embedding))
        job_norm = math.sqrt(sum(value * value for value in job_embedding))

        if resume_norm == 0 or job_norm == 0:
            return 0.0

        score = dot_product / (resume_norm * job_norm)
        return max(0.0, min(1.0, float(score)))
    except Exception:
        return 0.0


def extract_skills(text):
    cleaned_text = clean_text(text)
    return [
        skill
        for skill in SKILLS
        if re.search(rf"\b{re.escape(skill)}\b", cleaned_text)
    ]


def compute_fraud_score(text):
    tokens = WORD_PATTERN.findall(clean_text(text))
    score = 0
    reasons = []

    expert_count = tokens.count("expert")
    if expert_count >= 3:
        score += min(30, (expert_count - 2) * 8)
        reasons.append(f"Frequent use of 'expert' ({expert_count} times).")

    word_count = len(tokens)
    if word_count < 40:
        score += 35
        reasons.append("Resume text is very short.")
    elif word_count < 80:
        score += 15
        reasons.append("Resume text is shorter than expected.")

    repeated_words = sorted(
        word
        for word, count in Counter(word for word in tokens if len(word) > 3).items()
        if count >= 5
    )
    if repeated_words:
        score += min(35, len(repeated_words) * 5)
        reasons.append(
            "Repeated words detected: " + ", ".join(repeated_words[:5]) + "."
        )

    return min(100, score), reasons


def analyze_resume(file_path, job_description):
    try:
        resume_text = extract_text(file_path)
    except ValueError:
        return _default_result(["Invalid or unreadable PDF file."])
    except RuntimeError as exc:
        return _default_result([str(exc)])
    except Exception:
        return _default_result(["Failed to extract text from the resume."])

    cleaned_resume = clean_text(resume_text)
    if not cleaned_resume:
        return _default_result(["Resume contains no readable text."])

    cleaned_job = clean_text(job_description)
    if not cleaned_job:
        return _default_result(["Job description is empty."])

    match_score = compute_match_score(cleaned_resume, cleaned_job)
    skills = extract_skills(cleaned_resume)
    fraud_score, fraud_reasons = compute_fraud_score(cleaned_resume)
    final_score = (match_score * 0.7) - ((fraud_score / 100.0) * 0.3)

    return {
        "match_score": round(max(0.0, min(1.0, match_score)), 4),
        "fraud_score": int(max(0, min(100, fraud_score))),
        "final_score": round(max(0.0, min(1.0, final_score)), 4),
        "skills": skills,
        "fraud_reasons": fraud_reasons,
    }


__all__ = ["analyze_resume"]
