import json
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.models import TriagedIssue, Repository, ActivityFeedEntry
from services import ai, vector_store


async def analyze_issue(
    db: AsyncSession,
    title: str,
    body: str,
    repo_id: str | None = None,
) -> dict:
    """
    Run the full triage pipeline on an issue.
    1. Call AI to classify / score / label.
    2. Check vector store for duplicates.
    3. Persist to DB.
    4. Return shape matching frontend TriagedIssue + AnalysisResult.
    """
    # 1. AI classification
    result = await ai.classify_issue(title, body or "")

    # 2. Duplicate detection via vector similarity
    embedding = await ai.embed_text(f"{title}\n{body or ''}")
    similar = await vector_store.find_similar(embedding, threshold=0.85, top_k=3)
    if similar:
        result["isDuplicate"] = True
        result["similarIssues"] = similar
    else:
        result.setdefault("isDuplicate", False)
        result.setdefault("similarIssues", [])

    # 3. Store embedding
    issue_id = str(uuid.uuid4())
    await vector_store.upsert(issue_id, embedding, {"title": title, "repo_id": repo_id or ""})

    # 4. Persist
    if repo_id:
        issue = TriagedIssue(
            id=issue_id,
            repo_id=repo_id,
            title=title,
            body=body,
            classification=result.get("classification", "UNCLEAR"),
            priority_score=result.get("priorityScore", 0),
            labels=json.dumps(result.get("labels", [])),
            is_duplicate=result.get("isDuplicate", False),
        )
        db.add(issue)

        feed = ActivityFeedEntry(
            type="triage",
            text=f"Issue triaged: \"{title}\" → {result.get('classification')}",
        )
        db.add(feed)
        await db.commit()

    result["id"] = issue_id
    result["title"] = title
    result["body"] = body or ""
    result["repoId"] = repo_id
    return result
