import os
import ast
import logging
from typing import Tuple, List
from app.core.config import settings

logger = logging.getLogger(__name__)

TECH_STACK_FILES = {
    "requirements.txt", "pyproject.toml", "setup.py", "setup.cfg",
    "package.json", "package-lock.json",
    "main.py", "app.py", "index.js", "index.ts", "server.js",
    "Dockerfile", "docker-compose.yml", "Makefile",
    "go.mod", "Cargo.toml", "pom.xml", "build.gradle",
}

SOURCE_EXTENSIONS = {".py", ".js", ".ts", ".go", ".rs", ".java"}


def extract_signatures(filepath: str) -> str:
    """
    For Python files: extracts function/class signatures and docstrings via AST.
    For other source files: returns the first 800 chars as a fallback.
    """
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            source = f.read()

        if not filepath.endswith(".py"):
            return source[: settings.max_content_chars]

        tree = ast.parse(source)
        lines = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                # Pull just the signature line
                sig = ast.get_source_segment(source, node)
                if sig:
                    lines.append(sig.splitlines()[0])
                docstring = ast.get_docstring(node)
                if docstring:
                    lines.append(f'    """{docstring[:200]}"""')

        return "\n".join(lines) if lines else source[: settings.max_content_chars]

    except (OSError, UnicodeDecodeError, SyntaxError) as e:
        logger.warning("Could not parse %s: %s", filepath, e)
        return ""


def get_repo_context(repo_path: str) -> Tuple[str, List[str]]:
    """
    Walks the repo and builds a context string containing:
    - Full file tree (up to max_repo_files)
    - Content/signatures of tech stack and source files
    """
    file_tree = []
    context_parts = []
    detected_files = []

    try:
        for root, dirs, filenames in os.walk(repo_path):
            dirs[:] = [d for d in dirs if not d.startswith(".")]

            for f in filenames:
                abs_path = os.path.join(root, f)
                rel_path = os.path.relpath(abs_path, repo_path)
                file_tree.append(rel_path)
                detected_files.append(f)

                ext = os.path.splitext(f)[1]
                is_tech_file = f in TECH_STACK_FILES
                is_source_file = ext in SOURCE_EXTENSIONS

                if (is_tech_file or is_source_file) and len(context_parts) < settings.max_content_entries:
                    content = extract_signatures(abs_path) if is_source_file else open(
                        abs_path, encoding="utf-8"
                    ).read(settings.max_content_chars)

                    if content:
                        context_parts.append(
                            f"--- {rel_path} ---\n{content}\n"
                        )

            if len(file_tree) >= settings.max_repo_files:
                del dirs[:]
                break

        structure = "PROJECT STRUCTURE:\n" + "\n".join(file_tree)
        contents = "\n\n".join(context_parts)
        return structure + "\n\n" + contents, detected_files

    except Exception as e:
        logger.error("Failed to scan repo at %s: %s", repo_path, e)
        return f"Error scanning: {str(e)}", []