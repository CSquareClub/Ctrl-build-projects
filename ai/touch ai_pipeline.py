from collections import Counter
from functools import lru_cache
import re

import numpy as np


SKILLS = ("python", "java", "sql", "react", "ml")
SPACE_PATTERN = re.compile(r"\s+")
TOKEN_PATTERN = re.compile(r"\b[a-z0-9]+\b")


def extract_text(file_path):
    try:
        import pdfplumber

        pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                try:
                    page_text = page.extract_text() if page else ""
                except Exception:
                    page_text = ""

                if page_text:
                    pages.append(page_text)

        return "\n".join(pages).strip()
    except Exception:
        return ""


def clean_text(text):
    text = str(text or "").lower()
    return SPACE_PATTERN.sub(" ", text).strip()


@lru_cache(maxsize=1)
def _load_embedding_model():
    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        return None


def get_embedding(text):
    cleaned_text = clean_text(text)
    if not cleaned_text:
        return np.array([], dtype=float)

    model = _load_embedding_model()
    if model is None:
        return np.array([], dtype=float)

    try:
        embedding = model.encode(
            cleaned_text,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return np.asarray(embedding, dtype=float)
    except Exception:
        return np.array([], dtype=float)


def compute_match_score(resume_text, job_text):
    resume_embedding = get_embedding(resume_text)
    job_embedding = get_embedding(job_text)

    if resume_embedding.size == 0 or job_embedding.size == 0:
        return 0.0

    try:
        denominator = np.linalg.norm(resume_embedding) * np.linalg.norm(job_embedding)
        if denominator == 0:
            return 0.0

        score = float(np.dot(resume_embedding, job_embedding) / denominator)
        return max(0.0, min(1.0, score))
    except Exception:
        return 0.0


def extract_skills(text):
    cleaned_text = clean_text(text)
    found_skills = []

    for skill in SKILLS:
        if re.search(rf"\b{re.escape(skill)}\b", cleaned_text):
            found_skills.append(skill)

    return found_skills


def compute_fraud_score(text):
    cleaned_text = clean_text(text)
    tokens = TOKEN_PATTERN.findall(cleaned_text)
    score = 0.0
    reasons = []

    expert_count = tokens.count("expert")
    if expert_count >= 3:
        score += min(40, (expert_count - 2) * 10)
        reasons.append("Too many uses of 'expert'.")

    word_count = len(tokens)
    if word_count < 40:
        score += 35
        reasons.append("Resume is very short.")
    elif word_count < 80:
        score += 20
        reasons.append("Resume is shorter than expected.")

    repeated_words = [
        word
        for word, count in Counter(token for token in tokens if len(token) > 3).items()
        if count >= 6
    ]
    if repeated_words:
        score += min(25, len(repeated_words) * 5)
        reasons.append(
            "Repeated words detected: " + ", ".join(sorted(repeated_words[:5])) + "."
        )

    return min(100.0, score), reasons


def analyze_resume(file_path, job_description):
    try:
        resume_text = extract_text(file_path)
        job_text = clean_text(job_description)

        match_score = compute_match_score(resume_text, job_text)
        fraud_score, fraud_reasons = compute_fraud_score(resume_text)
        final_score = (match_score * 0.7) - ((fraud_score / 100.0) * 0.3)

        return {
            "match_score": max(0.0, min(1.0, match_score)),
            "fraud_score": max(0.0, min(100.0, fraud_score)),
            "final_score": max(0.0, min(1.0, final_score)),
            "skills": extract_skills(resume_text),
            "fraud_reasons": fraud_reasons,
        }
    except Exception:
        return {
            "match_score": 0.0,
            "fraud_score": 0.0,
            "final_score": 0.0,
            "skills": [],
            "fraud_reasons": [],
        }
