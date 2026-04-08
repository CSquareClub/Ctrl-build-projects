from collections import Counter
from functools import lru_cache
import json
import math
import os
from pathlib import Path
import re
import tempfile


SPACE_PATTERN = re.compile(r"\s+")
WORD_PATTERN = re.compile(r"\b[a-z0-9]+\b")
CHARACTER_NORMALIZATION_MAP = str.maketrans(
    {
        0x2018: "'",
        0x2019: "'",
        0x201C: '"',
        0x201D: '"',
        0x2013: "-",
        0x2014: "-",
    }
)

MIN_RESUME_WORDS = 300
EMBEDDING_CHUNK_WORDS = 120
EMBEDDING_CHUNK_OVERLAP = 24
FAKE_RESUME_THRESHOLD = 45
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
AUTHENTICITY_PATTERN_GROUPS = (
    (
        "Placeholder identity fields detected.",
        (
            r"\bfirst\s+name\s+last\s+name\b",
            r"\byour\s+name\b",
            r"\bfull\s+name\b",
            r"\bcandidate\s+name\b",
        ),
        45,
        45,
    ),
    (
        "Dummy contact details detected.",
        (
            r"\b(?:email@email\.com|example@example\.com|name@email\.com)\b",
            r"\b(?:email|name)@(?:email|example)\.(?:com|org|net)\b",
            r"\b\d{3}[-.\s]?555[-.\s]?\d{4}\b",
        ),
        20,
        40,
    ),
    (
        "Template instruction text detected.",
        (
            r"\bthis\s+is\s+where\s+you\s+write\b",
            r"\bwhat\s+motivates\s+you\b",
            r"\bwhat\s+do\s+you\s+most\s+want\b",
            r"\bdescribe\s+the\s+tasks\s+and\s+responsibilities\b",
            r"\bbe\s+specific\s+and\s+use\s+numbers\b",
            r"\blist\s+your\s+jobs\s+in\s+reverse\s+chronological\s+order\b",
            r"\buse\s+bullet\s+points\b",
            r"\bdon'?t\s+end\s+your\s+sentence\s+with\s+punctuation\b",
            r"\binclude\s+volunteer\s+or\s+internships\b",
        ),
        15,
        45,
    ),
    (
        "Generic placeholder filler text detected.",
        (
            r"\bother\s+interests\b",
            r"\byou\s+might\s+have\b",
            r"\ban\s+idea\s+of\s+who\s+you\s+are\b",
        ),
        10,
        20,
    ),
)
SECOND_PERSON_TEMPLATE_TERMS = ("you", "your", "write", "describe", "include", "list")
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

DEFAULT_GOOGLE_ANALYSIS_MODEL = "gemini-2.5-flash"
DEFAULT_GOOGLE_EMBEDDING_MODEL = "gemini-embedding-001"
DEFAULT_GOOGLE_EMBEDDING_DIMENSION = 768
GOOGLE_ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": (
                "One or two short sentences explaining the candidate's fit for the role."
            ),
        },
        "skills": {
            "type": "array",
            "description": (
                "Important skills or tools explicitly evidenced in the resume. "
                "Use short lowercase labels."
            ),
            "items": {"type": "string"},
        },
        "missing_skills": {
            "type": "array",
            "description": (
                "Important job requirements not clearly evidenced in the resume. "
                "Use short lowercase labels."
            ),
            "items": {"type": "string"},
        },
    },
    "required": ["summary", "skills", "missing_skills"],
    "additionalProperties": False,
}


def _load_environment_files():
    try:
        from dotenv import load_dotenv
    except Exception:
        return

    module_dir = Path(__file__).resolve().parent
    search_roots = (
        Path.cwd(),
        module_dir,
        module_dir.parent,
    )
    seen_paths = set()

    for root in search_roots:
        for filename in (".env", ".env.local"):
            env_path = (root / filename).resolve()
            env_path_key = str(env_path)
            if env_path_key in seen_paths or not env_path.is_file():
                continue

            seen_paths.add(env_path_key)
            load_dotenv(env_path, override=False)


_load_environment_files()


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
        "authenticity_score": 0,
        "authenticity_reasons": [],
        "quality_score": 0,
        "quality_warnings": [],
        "is_fake": False,
        "resume_status": "unknown",
        "ranked": False,
        "ai_provider": "local",
        "explanation": explanation,
    }


def _normalize_string_list(values):
    normalized_values = []
    seen = set()

    for value in values or []:
        normalized_value = clean_text(value)
        if not normalized_value or normalized_value in seen:
            continue

        seen.add(normalized_value)
        normalized_values.append(normalized_value)

    return normalized_values


def _merge_normalized_strings(*groups):
    merged = []
    seen = set()

    for group in groups:
        for value in _normalize_string_list(group):
            if value in seen:
                continue

            seen.add(value)
            merged.append(value)

    return merged


def _get_google_api_key():
    return str(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()


def _get_google_analysis_model():
    return (
        str(os.getenv("GOOGLE_ANALYSIS_MODEL") or DEFAULT_GOOGLE_ANALYSIS_MODEL).strip()
        or DEFAULT_GOOGLE_ANALYSIS_MODEL
    )


def _get_google_embedding_model():
    return (
        str(
            os.getenv("GOOGLE_EMBEDDING_MODEL") or DEFAULT_GOOGLE_EMBEDDING_MODEL
        ).strip()
        or DEFAULT_GOOGLE_EMBEDDING_MODEL
    )


def _get_google_embedding_dimension():
    raw_value = str(
        os.getenv("GOOGLE_EMBEDDING_DIMENSION") or DEFAULT_GOOGLE_EMBEDDING_DIMENSION
    ).strip()

    try:
        parsed_value = int(raw_value)
    except (TypeError, ValueError):
        return DEFAULT_GOOGLE_EMBEDDING_DIMENSION

    return max(128, min(3072, parsed_value))


@lru_cache(maxsize=4)
def _build_google_client(api_key):
    if not api_key:
        return None

    try:
        from google import genai
    except Exception:
        return None

    try:
        return genai.Client(api_key=api_key)
    except TypeError:
        try:
            return genai.Client()
        except Exception:
            return None
    except Exception:
        return None


def _load_google_client():
    return _build_google_client(_get_google_api_key())


def _get_google_embed_config():
    config = {
        "task_type": "SEMANTIC_SIMILARITY",
        "output_dimensionality": _get_google_embedding_dimension(),
    }

    try:
        from google.genai import types as genai_types
    except Exception:
        return config

    try:
        return genai_types.EmbedContentConfig(**config)
    except Exception:
        return config


def _get_google_analysis_config():
    config = {
        "temperature": 0.1,
        "max_output_tokens": 300,
        "response_mime_type": "application/json",
        "response_json_schema": GOOGLE_ANALYSIS_SCHEMA,
        # Disable thinking so the model reliably returns compact JSON instead of
        # consuming output tokens on hidden reasoning.
        "thinking_config": {"thinking_budget": 0},
    }

    try:
        from google.genai import types as genai_types
    except Exception:
        return config

    try:
        return genai_types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=300,
            response_mime_type="application/json",
            response_json_schema=GOOGLE_ANALYSIS_SCHEMA,
            thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
        )
    except Exception:
        return config


def _extract_embedding_values(embedding):
    values = getattr(embedding, "values", None)
    if values is None and isinstance(embedding, dict):
        values = embedding.get("values")
    if values is None and isinstance(embedding, (list, tuple)):
        values = embedding
    if hasattr(values, "tolist"):
        values = values.tolist()
    if not values:
        return []

    try:
        return [float(value) for value in values]
    except (TypeError, ValueError):
        return []


def _parse_json_object(raw_text):
    payload = str(raw_text or "").strip()
    if not payload:
        return {}

    if payload.startswith("```"):
        payload = re.sub(r"^```(?:json)?\s*", "", payload)
        payload = re.sub(r"\s*```$", "", payload)

    object_start = payload.find("{")
    object_end = payload.rfind("}")
    if object_start != -1 and object_end >= object_start:
        payload = payload[object_start : object_end + 1]

    try:
        parsed_payload = json.loads(payload)
    except json.JSONDecodeError:
        return {}

    return parsed_payload if isinstance(parsed_payload, dict) else {}


def _extract_google_response_payload(response):
    parsed_payload = getattr(response, "parsed", None)
    if isinstance(parsed_payload, dict):
        return parsed_payload

    if hasattr(parsed_payload, "model_dump"):
        try:
            parsed_payload = parsed_payload.model_dump()
        except Exception:
            parsed_payload = None

        if isinstance(parsed_payload, dict):
            return parsed_payload

    response_text = getattr(response, "text", "")
    if not response_text:
        candidates = getattr(response, "candidates", None) or []
        if candidates:
            content = getattr(candidates[0], "content", None)
            parts = getattr(content, "parts", None) or []
            response_text = "".join(str(getattr(part, "text", "") or "") for part in parts)

    return _parse_json_object(response_text)


def _compile_boundary_pattern(term):
    pieces = [re.escape(piece) for piece in term.lower().split()]
    return re.compile(rf"(?<![a-z0-9]){'[\\s/&-]+'.join(pieces)}(?![a-z0-9])")


BUZZWORD_REGEXES = {term: _compile_boundary_pattern(term) for term in BUZZWORDS}
EXPERIENCE_REGEXES = tuple(
    _compile_boundary_pattern(keyword) for keyword in EXPERIENCE_KEYWORDS
)
AUTHENTICITY_REGEX_GROUPS = tuple(
    (
        reason,
        tuple(re.compile(pattern) for pattern in patterns),
        weight_each,
        cap,
    )
    for reason, patterns, weight_each, cap in AUTHENTICITY_PATTERN_GROUPS
)


def clean_text(text):
    normalized_text = str(text or "").translate(CHARACTER_NORMALIZATION_MAP).lower()
    return SPACE_PATTERN.sub(" ", normalized_text).strip()


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


def analyze_resume_bytes(file_bytes, job_description, filename="resume.pdf"):
    if not clean_text(job_description):
        return _default_result(
            ["Job description is empty."],
            "Unable to analyze the resume because the job description is empty.",
        )

    if not isinstance(file_bytes, (bytes, bytearray, memoryview)):
        return _default_result(
            ["Uploaded file is not valid binary content."],
            "Unable to analyze the resume because the uploaded file is not valid binary content.",
        )

    payload = bytes(file_bytes)
    if not payload:
        return _default_result(
            ["Uploaded file is empty."],
            "Unable to analyze the resume because the uploaded file is empty.",
        )

    upload_name = str(filename or "resume.pdf")
    if os.path.splitext(upload_name)[1].lower() != ".pdf":
        return _default_result(
            ["Uploaded file must be a PDF."],
            "Unable to analyze the resume because the uploaded file must be a PDF.",
        )

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(payload)
            temp_path = temp_file.name

        return analyze_resume(temp_path, job_description)
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


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


def _average_embeddings(embeddings):
    if not embeddings:
        return []

    averaged = [0.0] * len(embeddings[0])
    for embedding in embeddings:
        for index, value in enumerate(embedding):
            averaged[index] += float(value)

    total_embeddings = float(len(embeddings))
    averaged = [value / total_embeddings for value in averaged]
    return _normalize_vector(averaged)


def _generate_google_embedding(text):
    chunks = _chunk_text(text)
    if not chunks:
        return []

    client = _load_google_client()
    if client is None:
        return []

    try:
        result = client.models.embed_content(
            model=_get_google_embedding_model(),
            contents=chunks,
            config=_get_google_embed_config(),
        )
    except Exception:
        return []

    embeddings = getattr(result, "embeddings", None)
    if embeddings is None and isinstance(result, dict):
        embeddings = result.get("embeddings")
    if embeddings is None:
        return []
    if not isinstance(embeddings, (list, tuple)):
        embeddings = [embeddings]

    normalized_embeddings = []
    for embedding in embeddings:
        values = _extract_embedding_values(embedding)
        if values:
            normalized_embeddings.append(values)

    return _average_embeddings(normalized_embeddings)


def _build_google_analysis_prompt(resume_text, job_description):
    return (
        "You are screening a single resume against a single job description.\n"
        "Use only evidence from the provided text.\n"
        "Do not invent experience, certifications, or skills.\n"
        "Keep the summary short and practical.\n"
        "Normalize skills to short lowercase labels.\n\n"
        "JOB DESCRIPTION:\n"
        f"{str(job_description or '').strip()}\n\n"
        "RESUME:\n"
        f"{str(resume_text or '').strip()}"
    )


def _generate_google_resume_analysis(resume_text, job_description):
    client = _load_google_client()
    if client is None:
        return {}

    if not clean_text(resume_text) or not clean_text(job_description):
        return {}

    prompt = _build_google_analysis_prompt(resume_text, job_description)

    try:
        response = client.models.generate_content(
            model=_get_google_analysis_model(),
            contents=prompt,
            config=_get_google_analysis_config(),
        )
    except Exception:
        return {}

    payload = _extract_google_response_payload(response)
    if not payload:
        return {}

    summary = str(payload.get("summary") or "").strip()
    return {
        "summary": summary,
        "skills": _normalize_string_list(payload.get("skills")),
        "missing_skills": _normalize_string_list(payload.get("missing_skills")),
    }


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


def _generate_local_embedding(text):
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

    normalized_embeddings = [
        [float(value) for value in embedding] for embedding in embeddings
    ]
    return _average_embeddings(normalized_embeddings)


def _generate_embedding_with_source(text):
    google_embedding = _generate_google_embedding(text)
    if google_embedding:
        return google_embedding, "google"

    local_embedding = _generate_local_embedding(text)
    if local_embedding:
        return local_embedding, "local"

    return [], "keyword-overlap"


def generate_embedding(text):
    embedding, _ = _generate_embedding_with_source(text)
    return embedding


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


def _compute_match_score_details(resume_text, job_description):
    if not clean_text(resume_text) or not clean_text(job_description):
        return 0.0, "keyword-overlap"

    resume_embedding, resume_source = _generate_embedding_with_source(resume_text)
    job_embedding, job_source = _generate_embedding_with_source(job_description)
    if resume_embedding and job_embedding:
        cosine_score = _cosine_similarity(resume_embedding, job_embedding)
        match_score = max(0.0, min(1.0, (cosine_score + 1.0) / 2.0))
        if "google" in {resume_source, job_source}:
            return match_score, "google"
        return match_score, "local"

    return _fallback_match_score(resume_text, job_description), "keyword-overlap"


def compute_match_score(resume_text, job_description):
    match_score, _ = _compute_match_score_details(resume_text, job_description)
    return match_score


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


def compute_authenticity_score(text):
    cleaned_text = clean_text(text)
    if not cleaned_text:
        return 0, []

    score = 0
    reasons = []

    for reason, regexes, weight_each, cap in AUTHENTICITY_REGEX_GROUPS:
        match_count = sum(1 for regex in regexes if regex.search(cleaned_text))
        if not match_count:
            continue

        score += min(cap, match_count * weight_each)
        reasons.append(reason)

    token_counts = Counter(_tokenize(cleaned_text))
    template_term_hits = sum(
        token_counts.get(term, 0) for term in SECOND_PERSON_TEMPLATE_TERMS
    )
    if template_term_hits >= 12:
        score += 15
        reasons.append(
            "Instruction-heavy second-person wording suggests an unfilled resume template."
        )

    return min(100, score), reasons


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


def build_explanation(
    is_fake,
    match_score,
    fraud_score,
    authenticity_score,
    analysis_summary="",
):
    if is_fake:
        return (
            "Resume appears to be fake or template-based "
            f"({int(max(0, min(100, round(authenticity_score))))}% authenticity risk), "
            "so ranking was skipped."
        )

    match_percent = int(round(max(0.0, min(1.0, match_score)) * 100))
    fraud_percent = int(max(0, min(100, round(fraud_score))))
    base_explanation = (
        f"Resume appears real. Candidate matches {match_percent}% "
        f"with {fraud_percent}% review risk."
    )

    summary = str(analysis_summary or "").strip()
    if not summary:
        return base_explanation

    return f"{base_explanation} {summary}"


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

    skills = extract_skills(cleaned_resume_text)
    authenticity_score, authenticity_reasons = compute_authenticity_score(
        cleaned_resume_text
    )
    quality_score, quality_warnings = compute_fraud_score(cleaned_resume_text)
    fraud_score = min(100, authenticity_score + quality_score)
    fraud_reasons = authenticity_reasons + quality_warnings
    is_fake = authenticity_score >= FAKE_RESUME_THRESHOLD

    if is_fake:
        return {
            "match_score": 0.0,
            "fraud_score": int(fraud_score),
            "final_score": 0.0,
            "skills": skills,
            "missing_skills": [],
            "fraud_reasons": fraud_reasons,
            "authenticity_score": int(authenticity_score),
            "authenticity_reasons": authenticity_reasons,
            "quality_score": int(quality_score),
            "quality_warnings": quality_warnings,
            "is_fake": True,
            "resume_status": "fake",
            "ranked": False,
            "ai_provider": "local",
            "explanation": build_explanation(
                True,
                0.0,
                fraud_score,
                authenticity_score,
            ),
        }

    google_analysis = _generate_google_resume_analysis(resume_text, job_description)
    match_score, match_provider = _compute_match_score_details(
        cleaned_resume_text,
        cleaned_job_description,
    )
    if google_analysis:
        skills = _merge_normalized_strings(skills, google_analysis.get("skills"))

    missing_skills = detect_missing_skills(cleaned_job_description, skills)
    if google_analysis:
        missing_skills = _merge_normalized_strings(
            google_analysis.get("missing_skills"),
            missing_skills,
        )

    skill_set = set(skills)
    missing_skills = [skill for skill in missing_skills if skill not in skill_set]
    final_score = compute_final_score(match_score, fraud_score)
    explanation = build_explanation(
        False,
        match_score,
        fraud_score,
        authenticity_score,
        google_analysis.get("summary"),
    )
    ai_provider = "google" if google_analysis or match_provider == "google" else "local"

    return {
        "match_score": round(match_score, 4),
        "fraud_score": int(fraud_score),
        "final_score": round(final_score, 4),
        "skills": skills,
        "missing_skills": missing_skills,
        "fraud_reasons": fraud_reasons,
        "authenticity_score": int(authenticity_score),
        "authenticity_reasons": authenticity_reasons,
        "quality_score": int(quality_score),
        "quality_warnings": quality_warnings,
        "is_fake": False,
        "resume_status": "real",
        "ranked": True,
        "ai_provider": ai_provider,
        "explanation": explanation,
    }


__all__ = ["analyze_resume", "analyze_resume_bytes"]
