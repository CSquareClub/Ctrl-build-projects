import json
import logging
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from db.models import Recommendation, UserPrefs, User, ActivityFeedEntry

logger = logging.getLogger("gitwise.recommender")

SKILL_LANGUAGE_MAP = {
    "JavaScript": ["JavaScript"],
    "TypeScript": ["TypeScript", "JavaScript"],
    "React": ["TypeScript", "JavaScript"],
    "Python": ["Python"],
    "Rust": ["Rust"],
    "Go": ["Go"],
    "Node.js": ["JavaScript", "TypeScript"],
    "Tailwind CSS": ["CSS", "HTML"],
    "AI/ML": ["Python", "Jupyter Notebook"],
    "FastAPI": ["Python"],
    "SQL": ["SQL", "PLSQL"],
    "GraphQL": ["GraphQL", "TypeScript"],
    "Java": ["Java", "Kotlin"],
    "C++": ["C++", "C"],
    "CSS": ["CSS", "SCSS"],
    "Docker": ["Shell", "Dockerfile"],
    "Kubernetes": ["Shell", "YAML"],
}

EXPERIENCE_WEIGHTS = {
    "beginner": {"Easy": 10, "Medium": -5, "Hard": -15},
    "intermediate": {"Easy": 0, "Medium": 5, "Hard": -5},
    "advanced": {"Easy": -5, "Medium": 5, "Hard": 10},
}

DOMAIN_LABELS = {
    "Frontend": ["frontend", "ui", "css", "react", "vue", "angular", "html"],
    "Backend": ["backend", "api", "server", "database", "rest"],
    "DevOps": ["devops", "ci", "cd", "docker", "kubernetes", "infra"],
    "Documentation": ["documentation", "docs", "readme"],
    "Testing": ["testing", "test", "tests", "qa", "e2e", "unit-test"],
    "Security": ["security", "auth", "authentication", "vulnerability"],
    "Performance": ["performance", "optimization", "speed", "memory"],
}


def _difficulty_from_labels(labels: list[str]) -> str:
    lower = [l.lower() for l in labels]
    if any(kw in l for l in lower for kw in ["good first issue", "beginner", "easy", "starter"]):
        return "Easy"
    if any(kw in l for l in lower for kw in ["hard", "complex", "advanced", "expert"]):
        return "Hard"
    return "Medium"


def _base_score(labels: list[str], language: str | None, skills: list[str], domains: list[str]) -> int:
    score = 50  # base

    # Language match (40%)
    expanded = []
    for skill in skills:
        expanded.extend(SKILL_LANGUAGE_MAP.get(skill, [skill]))
    if language and language in expanded:
        score += 30

    # Label match (20%)
    lower_labels = [l.lower() for l in labels]
    if any("good first issue" in l for l in lower_labels):
        score += 10
    if any("help wanted" in l for l in lower_labels):
        score += 5

    # Domain match (10%)
    for domain in domains:
        domain_keywords = DOMAIN_LABELS.get(domain, [])
        if any(kw in l for l in lower_labels for kw in domain_keywords):
            score += 5
            break

    return min(100, score)


def _build_search_query(skills: list[str], domains: list[str]) -> str:
    """Build a GitHub issue search query from skills and domains."""
    parts = ['label:"good first issue","help wanted"', "state:open", "is:issue"]

    # Add language filters
    languages = set()
    for skill in skills:
        for lang in SKILL_LANGUAGE_MAP.get(skill, [skill]):
            languages.add(lang)
    if languages:
        # GitHub search supports up to a few language filters
        for lang in list(languages)[:3]:
            parts.append(f"language:{lang}")

    return " ".join(parts)


async def _fetch_github_issues(access_token: str, skills: list[str], domains: list[str]) -> list[dict]:
    """Fetch real 'good first issue' / 'help wanted' issues from GitHub Search API."""
    query = _build_search_query(skills, domains)
    url = "https://api.github.com/search/issues"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    issues = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            url,
            params={"q": query, "sort": "updated", "order": "desc", "per_page": 30},
            headers=headers,
        )
        if resp.status_code != 200:
            logger.warning("GitHub search returned %d: %s", resp.status_code, resp.text[:200])
            return []
        data = resp.json()
        for item in data.get("items", []):
            repo_url = item.get("repository_url", "")
            repo_full_name = "/".join(repo_url.split("/")[-2:]) if repo_url else ""

            labels = [l["name"] for l in item.get("labels", [])]

            # Get repo info for language/stars
            repo_info = {}
            try:
                repo_resp = await client.get(repo_url, headers=headers)
                if repo_resp.status_code == 200:
                    repo_info = repo_resp.json()
            except Exception:
                pass

            language = repo_info.get("language") or ""
            stars = repo_info.get("stargazers_count", 0)

            issues.append({
                "github_id": item["number"],
                "title": item["title"],
                "repo": repo_full_name,
                "url": item["html_url"],
                "labels": labels,
                "language": language,
                "languages": [language] if language else [],
                "stars": stars,
                "comments": item.get("comments", 0),
                "created_at": item.get("created_at"),
            })

    return issues


def _score_issue(issue: dict, skills: list[str], domains: list[str], experience: str) -> int:
    labels = issue.get("labels", [])
    language = issue.get("language", "")
    base = _base_score(labels, language, skills, domains)
    difficulty = _difficulty_from_labels(labels)
    weights = EXPERIENCE_WEIGHTS.get(experience, {})
    exp_adj = weights.get(difficulty, 0)
    return min(100, max(0, base + exp_adj))


def _generate_explanation(issue: dict, skills: list[str], score: int) -> str:
    labels = issue.get("labels", [])
    language = issue.get("language", "")
    parts = []
    if score >= 85:
        parts.append("Excellent match for your profile.")
    elif score >= 70:
        parts.append("Good match for your skills.")
    else:
        parts.append("Potential match.")

    if language:
        expanded = []
        for s in skills:
            expanded.extend(SKILL_LANGUAGE_MAP.get(s, [s]))
        if language in expanded:
            parts.append(f"Uses {language}, which aligns with your experience.")

    lower_labels = [l.lower() for l in labels]
    if any("good first issue" in l for l in lower_labels):
        parts.append("Labelled as a good first issue — great for getting started.")
    if any("help wanted" in l for l in lower_labels):
        parts.append("Maintainers are actively looking for help on this.")

    return " ".join(parts)


async def get_recommendations(
    db: AsyncSession,
    user: User,
    skills: list[str],
    domains: list[str],
    experience: str,
) -> list[dict]:
    """Fetch fresh issues from GitHub, score them, persist, and return."""
    if not user.access_token:
        return []

    # Fetch fresh issues from GitHub
    raw_issues = await _fetch_github_issues(user.access_token, skills, domains)

    if not raw_issues:
        # Fall back to any existing recommendations
        result = await db.execute(
            select(Recommendation).where(Recommendation.user_id == user.id)
        )
        recs = result.scalars().all()
        scored = []
        for rec in recs:
            adjusted = _score_issue(
                {"labels": json.loads(rec.labels or "[]"), "language": (json.loads(rec.languages or "[]") or [""])[0]},
                skills, domains, experience,
            )
            scored.append(_rec_to_dict(rec, adjusted))
        scored.sort(key=lambda x: x["matchScore"], reverse=True)
        return scored

    # Clear old non-bookmarked recommendations for this user
    await db.execute(
        delete(Recommendation).where(
            Recommendation.user_id == user.id,
            Recommendation.bookmarked == False,
        )
    )

    # Build new recommendations
    results = []
    for issue in raw_issues:
        labels = issue["labels"]
        difficulty = _difficulty_from_labels(labels)
        score = _score_issue(issue, skills, domains, experience)
        explanation = _generate_explanation(issue, skills, score)

        rec = Recommendation(
            id=str(uuid.uuid4()),
            user_id=user.id,
            github_id=issue["github_id"],
            title=issue["title"],
            repo=issue["repo"],
            url=issue["url"],
            labels=json.dumps(labels),
            difficulty=difficulty,
            match_score=score,
            languages=json.dumps(issue.get("languages", [])),
            explanation=explanation,
            stars=issue["stars"],
            comments=issue["comments"],
            bookmarked=False,
        )
        db.add(rec)
        results.append({
            "id": rec.id,
            "githubId": issue["github_id"],
            "title": issue["title"],
            "repo": issue["repo"],
            "url": issue["url"],
            "labels": labels,
            "difficulty": difficulty,
            "matchScore": score,
            "languages": issue.get("languages", []),
            "explanation": explanation,
            "stars": issue["stars"],
            "bookmarked": False,
            "createdAt": issue.get("created_at"),
            "comments": issue["comments"],
        })

    db.add(ActivityFeedEntry(
        user_id=user.id,
        type="recommender",
        text=f"Found {len(results)} recommended issues for @{user.username}",
    ))
    await db.commit()

    results.sort(key=lambda x: x["matchScore"], reverse=True)
    return results


def _rec_to_dict(rec: Recommendation, score: int) -> dict:
    return {
        "id": rec.id,
        "githubId": rec.github_id,
        "title": rec.title,
        "repo": rec.repo,
        "url": rec.url,
        "labels": json.loads(rec.labels or "[]"),
        "difficulty": rec.difficulty,
        "matchScore": score,
        "languages": json.loads(rec.languages or "[]"),
        "explanation": rec.explanation,
        "stars": rec.stars,
        "bookmarked": rec.bookmarked,
        "createdAt": rec.created_at.isoformat() if rec.created_at else None,
        "comments": rec.comments,
    }


async def save_prefs(db: AsyncSession, user: User, skills: list[str], domains: list[str], experience: str) -> None:
    existing = await db.execute(select(UserPrefs).where(UserPrefs.user_id == user.id))
    prefs = existing.scalar_one_or_none()
    if prefs:
        prefs.skills = json.dumps(skills)
        prefs.domains = json.dumps(domains)
        prefs.experience = experience
    else:
        prefs = UserPrefs(
            user_id=user.id,
            skills=json.dumps(skills),
            domains=json.dumps(domains),
            experience=experience,
        )
        db.add(prefs)
    await db.commit()
