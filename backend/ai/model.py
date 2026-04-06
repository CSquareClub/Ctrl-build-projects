"""Dummy AI scoring module for ResumeRanker."""

from __future__ import annotations

import re


def _extract_keywords(text: str) -> set[str]:
    """Turn free text into a simple set of meaningful lowercase keywords."""
    words = re.findall(r"[A-Za-z0-9+#.]+", text.lower())
    return {word for word in words if len(word) > 2}


def get_resume_score(resume_text: str, job_description: str) -> dict:
    """
    Compare resume text with the job description and return a simple score.

    This is a dummy implementation for hackathon use. Later, this can be
    replaced with an LLM or ML model.
    """
    resume_keywords = _extract_keywords(resume_text)
    job_keywords = _extract_keywords(job_description)

    if not job_keywords:
        return {
            "score": 0,
            "matched_skills": [],
            "missing_skills": [],
        }

    matched_skills = sorted(job_keywords.intersection(resume_keywords))
    missing_skills = sorted(job_keywords.difference(resume_keywords))
    score = round((len(matched_skills) / len(job_keywords)) * 100, 2)

    return {
        "score": score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }
