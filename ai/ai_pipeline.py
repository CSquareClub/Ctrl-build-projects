from collections import Counter
from functools import lru_cache
import math
import os
import re


SPACE_PATTERN = re.compile(r"\s+")
WORD_PATTERN = re.compile(r"\b[a-z0-9]+\b")

MIN_RESUME_WORDS = 300
EMBEDDING_CHUNK_WORDS = 120
EMBEDDING_CHUNK_OVERLAP = 24
BUZZWORDS = ("expert", "advanced")
EXPERIENCE_KEYWORDS = (
    "experience",
    "work experience",
    "employment",
    "work history",
    "project",
    "projects",
    "internship",
    "internships",
    "responsibilities",
    "developed",
    "built",
    "implemented",
    "led",
)
COMMON_REPEAT_WORDS = {
    "about",
    "after",
    "also",
    "been",
    "building",
    "candidate",
    "company",
    "data",
    "from",
    "have",
    "into",
    "more",
    "over",
    "that",
    "their",
    "them",
    "they",
    "this",
    "with",
    "within",
    "would",
    "years",
}
SKILL_PATTERNS = (
    ("python", (r"(?<![a-z0-9])python(?![a-z0-9])",)),
    ("java", (r"(?<![a-z0-9])java(?![a-z0-9])",)),
    ("javascript", (r"(?<![a-z0-9])javascript(?![a-z0-9])",)),
    ("typescript", (r"(?<![a-z0-9])typescript(?![a-z0-9])",)),
    ("sql", (r"(?<![a-z0-9])sql(?![a-z0-9])",)),
    ("react", (r"(?<![a-z0-9])react(?:\.js|js)?(?![a-z0-9])",)),
    ("node.js", (r"(?<![a-z0-9])node(?:\.js|js|[ -]js)(?![a-z0-9])",)),
    ("django", (r"(?<![a-z0-9])django(?![a-z0-9])",)),
    ("flask", (r"(?<![a-z0-9])flask(?![a-z0-9])",)),
    ("fastapi", (r"(?<![a-z0-9])fastapi(?![a-z0-9])",)),
    (
        "machine learning",
        (
            r"(?<![a-z0-9])machine[\s-]+learning(?![a-z0-9])",
            r"(?<![a-z0-9])ml(?![a-z0-9])",
        ),
    ),
    ("deep learning", (r"(?<![a-z0-9])deep[\s-]+learning(?![a-z0-9])",)),
    (
        "artificial intelligence",
        (
            r"(?<![a-z0-9])artificial[\s-]+intelligence(?![a-z0-9])",
            r"(?<![a-z0-9])ai(?![a-z0-9])",
        ),
    ),
    (
        "nlp",
        (
            r"(?<![a-z0-9])natural[\s-]+language[\s-]+processing(?![a-z0-9])",
            r"(?<![a-z0-9])nlp(?![a-z0-9])",
        ),
    ),
    ("pandas", (r"(?<![a-z0-9])pandas(?![a-z0-9])",)),
    ("numpy", (r"(?<![a-z0-9])numpy(?![a-z0-9])",)),
    ("tensorflow", (r"(?<![a-z0-9])tensorflow(?![a-z0-9])",)),
    ("pytorch", (r"(?<![a-z0-9])pytorch(?![a-z0-9])",)),
    (
        "scikit-learn",
        (
            r"(?<![a-z0-9])scikit[\s-]*learn(?![a-z0-9])",
            r"(?<![a-z0-9])sklearn(?![a-z0-9])",
        ),
    ),
    (
        "aws",
        (
            r"(?<![a-z0-9])aws(?![a-z0-9])",
            r"(?<![a-z0-9])amazon[\s-]+web[\s-]+services(?![a-z0-9])",
        ),
    ),
    ("azure", (r"(?<![a-z0-9])azure(?![a-z0-9])",)),
    (
        "gcp",
        (
            r"(?<![a-z0-9])gcp(?![a-z0-9])",
            r"(?<![a-z0-9])google[\s-]+cloud(?![a-z0-9])",
        ),
    ),
    ("docker", (r"(?<![a-z0-9])docker(?![a-z0-9])",)),
    (
        "kubernetes",
        (
            r"(?<![a-z0-9])kubernetes(?![a-z0-9])",
            r"(?<![a-z0-9])k8s(?![a-z0-9])",
        ),
    ),
    ("git", (r"(?<![a-z0-9])git(?![a-z0-9])",)),
    ("tableau", (r"(?<![a-z0-9])tableau(?![a-z0-9])",)),
    ("power bi", (r"(?<![a-z0-9])power[\s-]+bi(?![a-z0-9])",)),
    ("postgresql", (r"(?<![a-z0-9])postgres(?:ql)?(?![a-z0-9])",)),
    ("mysql", (r"(?<![a-z0-9])mysql(?![a-z0-9])",)),
    ("mongodb", (r"(?<![a-z0-9])mongodb(?![a-z0-9])",)),
)
SKILL_REGEXES = tuple(
    (skill, tuple(re.compile(pattern) for pattern in patterns))
    for skill, patterns in SKILL_PATTERNS
)

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


class InvalidPDFError(ValueError):
    pass


class EmptyTextError(ValueError):
    pass


def _default_result(reasons=None, explanation="Unable to analyze resume."):
    return {
        "match_score": 0.0,
        "fraud_score": 0,
        "final_score": 0.0,
        "skills": [],
        "missing_skills": [],
        "fraud_reasons": list(reasons or []),
        "explanation": explanation,
    }


def _compile_boundary_pattern(term):
    pieces = [re.escape(piece) for piece in term.lower().split()]
    return re.compile(rf"(?<![a-z0-9]){'[\\s/&-]+'.join(pieces)}(?![a-z0-9])")


BUZZWORD_REGEXES = {term: _compile_boundary_pattern(term) for term in BUZZWORDS}
EXPERIENCE_REGEXES = tuple(
    _compile_boundary_pattern(keyword) for keyword in EXPERIENCE_KEYWORDS
)


def clean_text(text):
    return SPACE_PATTERN.sub(" ", str(text or "").lower()).strip()


def _tokenize(text):
    return WORD_PATTERN.findall(clean_text(text))


def _count_words(text):
    return len(_tokenize(text))


def extract_text_from_pdf(file_path):
    if not file_path or not os.path.isfile(file_path):
        raise InvalidPDFError("Invalid or unreadable PDF file.")

    if os.path.splitext(file_path)[1].lower() != ".pdf":
        raise InvalidPDFError("Invalid or unreadable PDF file.")

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
        raise InvalidPDFError("Invalid or unreadable PDF file.") from exc

    extracted_text = "\n".join(pages).strip()
    if not extracted_text:
        raise EmptyTextError("Resume contains no readable text.")

    return extracted_text


def _chunk_text(text, chunk_size=EMBEDDING_CHUNK_WORDS, overlap=EMBEDDING_CHUNK_OVERLAP):
    words = clean_text(text).split()
    if not words:
        return []

    if len(words) <= chunk_size:
        return [" ".join(words)]

    chunks = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(words), step):
        chunk_words = words[start : start + chunk_size]
        if not chunk_words:
            continue

        chunks.append(" ".join(chunk_words))
        if start + chunk_size >= len(words):
            break

    return chunks


def _normalize_vector(vector):
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return []

    return [float(value) / norm for value in vector]


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


def generate_embedding(text):
    chunks = _chunk_text(text)
    if not chunks:
        return []

    model = _load_embedding_model()
    if model is None:
        return []

    try:
        embeddings = model.encode(
            chunks,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
    except TypeError:
        embeddings = model.encode(chunks, normalize_embeddings=True)
    except Exception:
        return []

    if hasattr(embeddings, "tolist"):
        embeddings = embeddings.tolist()

    if not embeddings:
        return []

    if isinstance(embeddings[0], (int, float)):
        return _normalize_vector([float(value) for value in embeddings])

    averaged = [0.0] * len(embeddings[0])
    for embedding in embeddings:
        for index, value in enumerate(embedding):
            averaged[index] += float(value)

    total_embeddings = float(len(embeddings))
    averaged = [value / total_embeddings for value in averaged]
    return _normalize_vector(averaged)


def _cosine_similarity(vector_a, vector_b):
    if not vector_a or not vector_b:
        return 0.0

    dot_product = sum(a * b for a, b in zip(vector_a, vector_b))
    norm_a = math.sqrt(sum(value * value for value in vector_a))
    norm_b = math.sqrt(sum(value * value for value in vector_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0

    return max(-1.0, min(1.0, dot_product / (norm_a * norm_b)))


def _fallback_match_score(resume_text, job_description):
    resume_tokens = {
        token
        for token in _tokenize(resume_text)
        if len(token) > 2 and token not in COMMON_REPEAT_WORDS
    }
    job_tokens = {
        token
        for token in _tokenize(job_description)
        if len(token) > 2 and token not in COMMON_REPEAT_WORDS
    }
    if not resume_tokens or not job_tokens:
        return 0.0

    overlap = len(resume_tokens & job_tokens) / float(len(job_tokens))
    return max(0.0, min(1.0, overlap))


def compute_match_score(resume_text, job_description):
    if not clean_text(resume_text) or not clean_text(job_description):
        return 0.0

    resume_embedding = generate_embedding(resume_text)
    job_embedding = generate_embedding(job_description)
    if resume_embedding and job_embedding:
        cosine_score = _cosine_similarity(resume_embedding, job_embedding)
        return max(0.0, min(1.0, (cosine_score + 1.0) / 2.0))

    return _fallback_match_score(resume_text, job_description)


def extract_skills(text):
    cleaned_text = clean_text(text)
    detected_skills = []

    for skill, patterns in SKILL_REGEXES:
        if any(pattern.search(cleaned_text) for pattern in patterns):
            detected_skills.append(skill)

    return detected_skills


def detect_missing_skills(job_description, resume_skills):
    job_skills = extract_skills(job_description)
    resume_skill_set = set(resume_skills)
    return [skill for skill in job_skills if skill not in resume_skill_set]


def _score_short_resume(word_count):
    if word_count < 150:
        return (
            35,
            f"Resume is too short at {word_count} words; resumes under {MIN_RESUME_WORDS} words are higher risk.",
        )
    if word_count < 225:
        return (
            25,
            f"Resume is short at {word_count} words; resumes under {MIN_RESUME_WORDS} words are higher risk.",
        )
    if word_count < MIN_RESUME_WORDS:
        return (
            15,
            f"Resume is slightly short at {word_count} words; resumes under {MIN_RESUME_WORDS} words are higher risk.",
        )
    return 0, None


def _score_buzzwords(cleaned_text):
    buzzword_counts = {}
    for buzzword, pattern in BUZZWORD_REGEXES.items():
        count = len(pattern.findall(cleaned_text))
        if count:
            buzzword_counts[buzzword] = count

    total_buzzwords = sum(buzzword_counts.values())
    if total_buzzwords < 3:
        return 0, None

    details = ", ".join(
        f"{word} ({count})" for word, count in buzzword_counts.items()
    )
    score = min(25, (total_buzzwords - 2) * 6)
    return score, f"Too many self-rating buzzwords detected: {details}."


def _score_repeated_words(tokens):
    meaningful_tokens = [
        token
        for token in tokens
        if len(token) >= 4 and token not in COMMON_REPEAT_WORDS
    ]
    if len(meaningful_tokens) < 40:
        return 0, None

    threshold = max(5, int(math.ceil(len(meaningful_tokens) * 0.04)))
    repeated_words = [
        (word, count)
        for word, count in Counter(meaningful_tokens).items()
        if count >= threshold
    ]
    if not repeated_words:
        return 0, None

    repeated_words.sort(key=lambda item: (-item[1], item[0]))
    details = ", ".join(
        f"{word} ({count})" for word, count in repeated_words[:5]
    )
    score = min(20, sum(count - threshold + 1 for _, count in repeated_words))
    return score, f"Repeated words detected: {details}."


def _score_experience_keywords(cleaned_text):
    if any(pattern.search(cleaned_text) for pattern in EXPERIENCE_REGEXES):
        return 0, None

    return 25, "No project or experience keywords were found in the resume."


def compute_fraud_score(text):
    cleaned_text = clean_text(text)
    tokens = _tokenize(cleaned_text)
    word_count = len(tokens)
    score = 0
    reasons = []

    for scorer in (
        lambda: _score_short_resume(word_count),
        lambda: _score_buzzwords(cleaned_text),
        lambda: _score_repeated_words(tokens),
        lambda: _score_experience_keywords(cleaned_text),
    ):
        partial_score, reason = scorer()
        score += partial_score
        if reason:
            reasons.append(reason)

    return min(100, score), reasons


def compute_final_score(match_score, fraud_score):
    safe_match = max(0.0, min(1.0, float(match_score)))
    safe_fraud = max(0, min(100, int(round(fraud_score))))
    weighted_score = (safe_match * 0.7) - ((safe_fraud / 100.0) * 0.3)
    return max(0.0, min(1.0, weighted_score))


def build_explanation(match_score, fraud_score):
    match_percent = int(round(max(0.0, min(1.0, match_score)) * 100))
    fraud_percent = int(max(0, min(100, round(fraud_score))))
    return f"Candidate matches {match_percent}% but has {fraud_percent}% fraud risk."


def analyze_resume(file_path, job_description):
    cleaned_job_description = clean_text(job_description)
    if not cleaned_job_description:
        return _default_result(
            ["Job description is empty."],
            "Unable to analyze the resume because the job description is empty.",
        )

    try:
        resume_text = extract_text_from_pdf(file_path)
    except InvalidPDFError:
        return _default_result(
            ["Invalid or unreadable PDF file."],
            "Unable to analyze the resume because the PDF is invalid or unreadable.",
        )
    except EmptyTextError:
        return _default_result(
            ["Resume contains no readable text."],
            "Unable to analyze the resume because no readable text was found.",
        )
    except RuntimeError as exc:
        return _default_result([str(exc)], str(exc))
    except Exception:
        return _default_result(
            ["Failed to analyze the resume."],
            "Unable to analyze the resume due to an unexpected error.",
        )

    cleaned_resume_text = clean_text(resume_text)
    if not cleaned_resume_text:
        return _default_result(
            ["Resume contains no readable text."],
            "Unable to analyze the resume because no readable text was found.",
        )

    match_score = compute_match_score(cleaned_resume_text, cleaned_job_description)
    skills = extract_skills(cleaned_resume_text)
    missing_skills = detect_missing_skills(cleaned_job_description, skills)
    fraud_score, fraud_reasons = compute_fraud_score(cleaned_resume_text)
    final_score = compute_final_score(match_score, fraud_score)
    explanation = build_explanation(match_score, fraud_score)

    return {
        "match_score": round(match_score, 4),
        "fraud_score": int(fraud_score),
        "final_score": round(final_score, 4),
        "skills": skills,
        "missing_skills": missing_skills,
        "fraud_reasons": fraud_reasons,
        "explanation": explanation,
    }


__all__ = ["analyze_resume"]
