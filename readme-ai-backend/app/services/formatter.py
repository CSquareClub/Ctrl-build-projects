import re
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class FormattedReadme:
    content: str
    title: Optional[str] = None
    sections: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


EXPECTED_SECTIONS = [
    "installation",
    "usage",
    "features",
    "tech stack",
    "project structure",
]

BADGE_TEMPLATES = {
    "requirements.txt": "![Python](https://img.shields.io/badge/python-3.8+-blue)",
    "package.json":     "![Node](https://img.shields.io/badge/node-18+-green)",
    "Dockerfile":       "![Docker](https://img.shields.io/badge/docker-ready-blue)",
    "go.mod":           "![Go](https://img.shields.io/badge/go-1.21+-cyan)",
    "Cargo.toml":       "![Rust](https://img.shields.io/badge/rust-stable-orange)",
    "pom.xml":          "![Java](https://img.shields.io/badge/java-17+-red)",
}


def strip_fences(raw: str) -> str:
    match = re.search(r"```(?:markdown|md)?\n?([\s\S]*?)```", raw)
    if match:
        logger.debug("Stripped outer code fence from model output.")
        return match.group(1).strip()
    return raw.strip()


def normalize_headings(content: str) -> str:
    h1_matches = list(re.finditer(r"^# .+$", content, flags=re.MULTILINE))
    if len(h1_matches) <= 1:
        return content
    logger.warning("Multiple H1 headings detected — demoting extras to H2.")
    lines = content.splitlines()
    first_h1_line = content[: h1_matches[0].start()].count("\n")
    for i, line in enumerate(lines):
        if i != first_h1_line and line.startswith("# ") and not line.startswith("## "):
            lines[i] = "#" + line
    return "\n".join(lines)


def collapse_blank_lines(content: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", content)


def ensure_final_newline(content: str) -> str:
    return content.rstrip("\n") + "\n"


def extract_title(content: str) -> Optional[str]:
    match = re.search(r"^#\s+(.+)$", content, flags=re.MULTILINE)
    return match.group(1).strip() if match else None


def extract_sections(content: str) -> list[str]:
    return re.findall(r"^##\s+(.+)$", content, flags=re.MULTILINE)


def audit_sections(sections: list[str]) -> list[str]:
    found_lower = {s.lower() for s in sections}
    return [
        f"Missing recommended section: '{s.title()}'"
        for s in EXPECTED_SECTIONS
        if s not in found_lower
    ]


def inject_badges(content: str, detected_files: list[str]) -> str:
    badges = [
        badge
        for filename, badge in BADGE_TEMPLATES.items()
        if filename in detected_files
    ]
    if not badges:
        return content
    badge_line = " ".join(badges)
    lines = content.splitlines()
    for i, line in enumerate(lines):
        if line.startswith("# "):
            lines.insert(i + 1, "")
            lines.insert(i + 2, badge_line)
            break
    return "\n".join(lines)


def format_readme(raw: str, detected_files: Optional[list[str]] = None) -> FormattedReadme:
    if not raw or not raw.strip():
        logger.error("format_readme received empty input.")
        return FormattedReadme(content="", warnings=["Model returned empty output."])

    content = strip_fences(raw)
    content = normalize_headings(content)
    content = collapse_blank_lines(content)
    content = inject_badges(content, detected_files or [])
    content = ensure_final_newline(content)

    sections = extract_sections(content)
    warnings = audit_sections(sections)

    for w in warnings:
        logger.warning(w)

    return FormattedReadme(
        content=content,
        title=extract_title(content),
        sections=sections,
        warnings=warnings,
    )