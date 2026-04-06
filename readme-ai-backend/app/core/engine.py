import ollama
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def build_prompt(context: str) -> str:
    """Constructs the engineering-focused prompt for the LLM."""
    return (
        "ACT AS A SENIOR PRINCIPAL ENGINEER. Your task is to perform a deep-dive analysis "
        "of the provided PROJECT CONTEXT and generate an industry-standard README.md.\n\n"
        "### STEP 1: ARCHITECTURAL INFERENCE\n"
        "- Identify the primary architectural pattern (e.g., MVC, Microservices, Monolithic).\n"
        "- Locate the 'Nerve Center': Identify the entry point and how data flows through the app.\n"
        "- Distinguish between 'Infrastructure' (config, Docker) and 'Business Logic'.\n\n"
        "### STEP 2: FEATURE DERIVATION\n"
        "- Do not just list files. Explain *what* the code does.\n\n"
        "### DOCUMENTATION REQUIREMENTS:\n"
        "1. # Project Name\n"
        "2. > One-sentence high-level summary.\n"
        "3. ## Key Technical Features\n"
        "4. ## Architecture & Flow\n"
        "5. ## Tech Stack\n\n"
        "### STRICT CONSTRAINTS:\n"
        "- Output RAW MARKDOWN ONLY.\n"
        "- No generic filler text.\n\n"
        f"PROJECT CONTEXT:\n{context}\n\n"
        "BEGIN GENERATION:"
    )

def call_qwen(context: str) -> str:
    """Calls the local Ollama service with error handling."""
    try:
        response = ollama.chat(
            model=settings.ollama_model,
            messages=[
                {
                    "role": "user",
                    "content": build_prompt(context),
                },
            ],
            options={
                "temperature": settings.ollama_temperature,
                "num_predict": settings.ollama_num_predict,
            },
        )
        return response["message"]["content"]

    except ConnectionRefusedError:
        error_msg = "Ollama service is not running. Please start Ollama."
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    except Exception as e:
        error_msg = f"Model call failed: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)