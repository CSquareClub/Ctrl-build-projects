import re
from typing import Dict, List, Tuple


class PriorityService:
    CRITICAL_KEYWORDS = [
        "security",
        "urgent",
        "critical",
        "vulnerability",
        "crash",
        "outage",
        "data loss",
        "emergency",
    ]
    HIGH_KEYWORDS = ["error", "bug", "fail", "broken", "leak", "memory"]
    LOW_KEYWORDS = ["typo", "docs", "documentation", "question", "help", "format"]

    @classmethod
    def _keyword_match(cls, text: str, keywords: List[str]) -> List[str]:
        """Match keywords with word boundaries to avoid false positives."""
        matched = []
        for keyword in keywords:
            if re.search(r"\b" + re.escape(keyword) + r"\b", text, re.IGNORECASE):
                matched.append(keyword)
        return matched

    @classmethod
    def determine_priority(cls, title: str, description: str = "") -> str:
        """Determine priority based on keywords and patterns."""
        text = f"{title} {description}".lower()

        if cls._keyword_match(text, cls.CRITICAL_KEYWORDS):
            return "critical"
        if cls._keyword_match(text, cls.HIGH_KEYWORDS):
            return "high"
        if cls._keyword_match(text, cls.LOW_KEYWORDS):
            return "low"
        return "medium"

    @classmethod
    def extract_priority_indicators(cls, title: str, description: str = "") -> Dict[str, List[str]]:
        """Return matched keywords by priority bucket for explainability."""
        text = f"{title} {description}".lower()
        return {
            "critical": cls._keyword_match(text, cls.CRITICAL_KEYWORDS),
            "high": cls._keyword_match(text, cls.HIGH_KEYWORDS),
            "low": cls._keyword_match(text, cls.LOW_KEYWORDS),
        }

    @classmethod
    def assign_priority(cls, label: str, title: str, description: str) -> Tuple[str, float]:
        priority = cls.determine_priority(title, description)
        confidence = 0.7

        indicators = cls.extract_priority_indicators(title, description)
        if indicators["critical"] or indicators["high"] or indicators["low"]:
            confidence = 0.9

        if label == "bug" and priority == "medium":
            priority = "high"
            confidence = max(confidence, 0.8)
        if label == "question" and priority == "medium":
            priority = "low"
            confidence = max(confidence, 0.8)

        return priority, confidence


def assign_priority(label: str, title: str, description: str) -> Tuple[str, float]:
    return PriorityService.assign_priority(label, title, description)
