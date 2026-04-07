import uuid

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.models import ModerationEvent, Repository, ActivityFeedEntry, User, TriagedIssue
from services import ai, github as gh_service

# ── GitHub comment templates ──────────────────────────────────────────────────

def _block_comment(severity: str, explanation: str, issues: list, github_url: str | None) -> str:
    lines = [
        "## 🚫 GitWise AI — Pull Request Blocked",
        "",
        f"**Severity:** `{severity}`",
        "",
        f"{explanation}",
        "",
    ]
    if issues:
        lines.append("### Issues found")
        for issue in issues:
            desc = issue.get("description", "")
            suggestion = issue.get("suggestion", "")
            file_ = issue.get("file")
            line = issue.get("line_start")
            ref = f"`{file_}:{line}`" if file_ and line else (f"`{file_}`" if file_ else "")
            lines.append(f"- **{issue.get('type', 'issue').capitalize()}** {ref}: {desc}")
            if suggestion:
                lines.append(f"  - 💡 Suggestion: {suggestion}")
        lines.append("")
    if github_url:
        lines.append(f"→ [View problematic code]({github_url})")
        lines.append("")
    lines.append("---")
    lines.append("*Powered by [GitWise AI](https://github.com/krypthos-org/gitwise-ai) · Qwen2.5 72B — resolve the issues above and push a new commit.*")
    return "\n".join(lines)


def _flag_comment(severity: str, explanation: str, issues: list) -> str:
    lines = [
        "## ⚠️ GitWise AI — Pull Request Flagged for Review",
        "",
        f"**Severity:** `{severity}`",
        "",
        f"{explanation}",
        "",
    ]
    if issues:
        lines.append("### Concerns found")
        for issue in issues:
            desc = issue.get("description", "")
            suggestion = issue.get("suggestion", "")
            lines.append(f"- **{issue.get('type', 'issue').capitalize()}**: {desc}")
            if suggestion:
                lines.append(f"  - 💡 {suggestion}")
        lines.append("")
    lines.append("---")
    lines.append("*Powered by [GitWise AI](https://github.com/krypthos-org/gitwise-ai) · Qwen2.5 72B — a maintainer should review before merging.*")
    return "\n".join(lines)


def _commit_block_comment(severity: str, explanation: str, issues: list, github_url: str | None) -> str:
    lines = [
        "## 🚫 GitWise AI — Commit Stopped",
        "",
        f"**Severity:** `{severity}`",
        "",
        explanation,
        "",
    ]
    if issues:
        lines.append("### Issues found")
        for issue in issues:
            desc = issue.get("description", "")
            suggestion = issue.get("suggestion", "")
            file_ = issue.get("file")
            line = issue.get("line_start")
            ref = f"`{file_}:{line}`" if file_ and line else (f"`{file_}`" if file_ else "")
            lines.append(f"- **{issue.get('type', 'issue').capitalize()}** {ref}: {desc}")
            if suggestion:
                lines.append(f"  - 💡 Suggestion: {suggestion}")
        lines.append("")
    if github_url:
        lines.append(f"→ [View problematic code]({github_url})")
        lines.append("")
    lines.append("---")
    lines.append(
        "*This commit was stopped by **GitWise AI** · Qwen2.5 72B — "
        "fix the issues above and push again.*"
    )
    return "\n".join(lines)


def _commit_flag_comment(severity: str, explanation: str, issues: list, github_url: str | None) -> str:
    lines = [
        "## ⚠️ GitWise AI — Commit Flagged for Review",
        "",
        f"**Severity:** `{severity}`",
        "",
        explanation,
        "",
    ]
    if issues:
        lines.append("### Concerns found")
        for issue in issues:
            desc = issue.get("description", "")
            suggestion = issue.get("suggestion", "")
            file_ = issue.get("file")
            line = issue.get("line_start")
            ref = f"`{file_}:{line}`" if file_ and line else (f"`{file_}`" if file_ else "")
            lines.append(f"- **{issue.get('type', 'issue').capitalize()}** {ref}: {desc}")
            if suggestion:
                lines.append(f"  - 💡 {suggestion}")
        lines.append("")
    if github_url:
        lines.append(f"→ [View flagged code]({github_url})")
        lines.append("")
    lines.append("---")
    lines.append(
        "*This commit was flagged by **GitWise AI** · Qwen2.5 72B — "
        "a maintainer should review before this is deployed.*"
    )
    return "\n".join(lines)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _fetch_pr_diff(diff_url: str, access_token: str) -> str:
    """Download the unified diff for a PR. Falls back to empty string on error."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                diff_url,
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/vnd.github.v3.diff",
                },
                follow_redirects=True,
            )
            if resp.status_code == 200:
                return resp.text[:6000]  # cap at 6 KB to stay within model context
    except Exception:
        pass
    return ""


async def _fetch_commit_diff(owner: str, repo_name: str, sha: str, access_token: str) -> str:
    """Download the unified diff for a single commit via the GitHub API."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo_name}/commits/{sha}",
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/vnd.github.v3.diff",
                },
                follow_redirects=True,
            )
            if resp.status_code == 200:
                return resp.text[:6000]  # cap at 6 KB
    except Exception:
        pass
    return ""


async def _get_user_token(db: AsyncSession, user_id: str) -> str | None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user.access_token if user else None


# ── Pipeline functions ────────────────────────────────────────────────────────

async def process_pull_request(db: AsyncSession, payload: dict, repo: Repository, delivery_id: str) -> ModerationEvent:
    """Moderate a pull request diff."""
    pr = payload.get("pull_request", {})
    title = pr.get("title", "Unknown PR")
    author = pr.get("user", {}).get("login", "unknown")
    author_avatar = pr.get("user", {}).get("avatar_url", "")
    pr_number = pr.get("number")
    diff_url = pr.get("diff_url", "")
    commit_sha = pr.get("head", {}).get("sha", "")
    pr_body = pr.get("body") or ""

    # ── 1. Get the user's GitHub token ────────────────────────────────────────
    access_token = await _get_user_token(db, repo.user_id)

    # ── 2. Fetch the actual diff ──────────────────────────────────────────────
    diff_content = ""
    if access_token and diff_url:
        diff_content = await _fetch_pr_diff(diff_url, access_token)

    # Build the content string for the AI — prefer diff, fall back to metadata
    if diff_content:
        content = (
            f"PR Title: {title}\n"
            f"Author: {author}\n"
            f"Description: {pr_body[:500]}\n\n"
            f"--- Unified Diff ---\n{diff_content}"
        )
    else:
        content = (
            f"PR Title: {title}\n"
            f"Author: {author}\n"
            f"Description: {pr_body[:1000]}"
        )

    # ── 3. Run AI moderation ──────────────────────────────────────────────────
    result = await ai.moderate_content(content, content_type="pull request diff")
    decision = result.get("decision", "PASS")
    severity = result.get("severity", "LOW")
    issues_found = result.get("issues", [])
    explanation = result.get("explanation", "")

    # Build deep link to first problematic file/line
    first_issue = issues_found[0] if issues_found else {}
    file_path = first_issue.get("file")
    line_start = first_issue.get("line_start")
    line_end = first_issue.get("line_end")
    github_url = None
    if file_path and commit_sha:
        github_url = f"https://github.com/{repo.full_name}/blob/{commit_sha}/{file_path}"
        if line_start:
            github_url += f"#L{line_start}"
            if line_end and line_end != line_start:
                github_url += f"-L{line_end}"

    reason = first_issue.get("description", explanation[:120] if explanation else "")

    # ── 4. Persist event ──────────────────────────────────────────────────────
    event = ModerationEvent(
        id=str(uuid.uuid4()),
        repo_id=repo.id,
        delivery_id=delivery_id,
        type="pull_request",
        decision=decision,
        severity=severity,
        title=title,
        author=author,
        author_avatar=author_avatar,
        reason=reason,
        ai_explanation=explanation,
        file=file_path,
        line_start=line_start,
        line_end=line_end,
        commit_sha=commit_sha,
        pr_number=pr_number,
        github_url=github_url,
    )
    db.add(event)
    db.add(ActivityFeedEntry(
        user_id=repo.user_id,
        type=decision.lower(),
        text=f"PR #{pr_number} in {repo.full_name} → {decision} ({severity})",
    ))
    await db.commit()
    await db.refresh(event)

    # ── 5. Act on GitHub (post comment + set commit status) ───────────────────
    if access_token and pr_number and decision in ("BLOCK", "FLAG"):
        if decision == "BLOCK":
            comment_body = _block_comment(severity, explanation, issues_found, github_url)
            commit_state = "failure"
            status_desc = f"GitWise AI blocked this PR — {severity} issue detected"
        else:
            comment_body = _flag_comment(severity, explanation, issues_found)
            commit_state = "error"
            status_desc = f"GitWise AI flagged this PR for review — {severity} concern"

        try:
            await gh_service.post_issue_comment(
                access_token, repo.owner, repo.name, pr_number, comment_body
            )
        except Exception:
            pass  # don't let GitHub API failure break the event record

        if commit_sha:
            try:
                await gh_service.set_commit_status(
                    access_token, repo.owner, repo.name, commit_sha,
                    commit_state, status_desc[:140],
                )
            except Exception:
                pass

    elif access_token and pr_number and decision == "PASS" and commit_sha:
        # Set green checkmark on passing PRs
        try:
            await gh_service.set_commit_status(
                access_token, repo.owner, repo.name, commit_sha,
                "success", "GitWise AI — no issues detected",
            )
        except Exception:
            pass

    return event


async def process_push(db: AsyncSession, payload: dict, repo: Repository, delivery_id: str) -> ModerationEvent | None:
    """Moderate commit messages and diffs from a push event."""
    commits = payload.get("commits", [])
    if not commits:
        return None

    # ── 1. Gather metadata and token ─────────────────────────────────────────
    access_token = await _get_user_token(db, repo.user_id)
    latest = commits[-1]
    commit_sha = latest.get("id", "")
    author = latest.get("author", {}).get("name", "unknown")

    # ── 2. Build content: messages + file list for all recent commits ─────────
    combined_content = []
    for commit in commits[-5:]:  # cap at last 5 commits
        msg = commit.get("message", "")
        sha = commit.get("id", "")
        added = commit.get("added", [])
        modified = commit.get("modified", [])
        combined_content.append(
            f"Commit {sha[:7]}: {msg}\nChanged files: {', '.join(added + modified)}"
        )

    # ── 3. Fetch the actual diff of the latest commit for line-level analysis ─
    diff_content = ""
    if access_token and commit_sha:
        diff_content = await _fetch_commit_diff(repo.owner, repo.name, commit_sha, access_token)

    if diff_content:
        content = "\n\n".join(combined_content) + f"\n\n--- Unified Diff (latest commit) ---\n{diff_content}"
        content_type = "commit diff"
    else:
        content = "\n\n".join(combined_content)
        content_type = "commit messages"

    # ── 4. Run AI moderation ──────────────────────────────────────────────────
    result = await ai.moderate_content(content, content_type=content_type)
    decision = result.get("decision", "PASS")
    severity = result.get("severity", "LOW")
    issues_found = result.get("issues", [])
    explanation = result.get("explanation", "")
    first_issue = issues_found[0] if issues_found else {}

    # ── 5. Build deep link to the exact problematic line ─────────────────────
    file_path = first_issue.get("file")
    line_start = first_issue.get("line_start")
    line_end = first_issue.get("line_end")
    github_url = None
    if file_path and commit_sha:
        github_url = f"https://github.com/{repo.full_name}/blob/{commit_sha}/{file_path}"
        if line_start:
            github_url += f"#L{line_start}"
            if line_end and line_end != line_start:
                github_url += f"-L{line_end}"

    reason = first_issue.get("description", explanation[:120] if explanation else "")

    # ── 6. Persist event ──────────────────────────────────────────────────────
    event = ModerationEvent(
        id=str(uuid.uuid4()),
        repo_id=repo.id,
        delivery_id=delivery_id,
        type="commit",
        decision=decision,
        severity=severity,
        title=latest.get("message", "")[:120],
        author=author,
        author_avatar="",
        reason=reason,
        ai_explanation=explanation,
        file=file_path,
        line_start=line_start,
        line_end=line_end,
        commit_sha=commit_sha,
        github_url=github_url,
    )
    db.add(event)
    db.add(ActivityFeedEntry(
        user_id=repo.user_id,
        type=decision.lower(),
        text=f"Commit {commit_sha[:7]} in {repo.full_name} → {decision} ({severity})",
    ))
    await db.commit()
    await db.refresh(event)

    # ── 7. Act on GitHub: commit status + commit comment ─────────────────────
    if access_token and commit_sha:
        if decision in ("BLOCK", "FLAG"):
            state = "failure" if decision == "BLOCK" else "error"
            status_desc = (
                f"GitWise AI {'blocked' if decision == 'BLOCK' else 'flagged'} this commit — {severity}"
            )
            try:
                await gh_service.set_commit_status(
                    access_token, repo.owner, repo.name, commit_sha,
                    state, status_desc[:140],
                )
            except Exception:
                pass

            if decision == "BLOCK":
                comment_body = _commit_block_comment(severity, explanation, issues_found, github_url)
            else:
                comment_body = _commit_flag_comment(severity, explanation, issues_found, github_url)
            try:
                await gh_service.post_commit_comment(
                    access_token, repo.owner, repo.name, commit_sha, comment_body
                )
            except Exception:
                pass

        elif decision == "PASS":
            try:
                await gh_service.set_commit_status(
                    access_token, repo.owner, repo.name, commit_sha,
                    "success", "GitWise AI — no issues detected",
                )
            except Exception:
                pass

    return event


async def process_comment(
    db: AsyncSession,
    payload: dict,
    repo: Repository,
    delivery_id: str,
    event_type: str = "issue_comment",
) -> ModerationEvent | None:
    """Moderate an issue comment or PR review comment."""
    comment = payload.get("comment", {})
    body = comment.get("body", "")
    if not body:
        return None

    author = comment.get("user", {}).get("login", "unknown")
    author_avatar = comment.get("user", {}).get("avatar_url", "")

    result = await ai.moderate_content(body, content_type="comment")
    decision = result.get("decision", "PASS")
    severity = result.get("severity", "LOW")
    explanation = result.get("explanation", "")
    issues_found = result.get("issues", [])
    first_issue = issues_found[0] if issues_found else {}

    # For blocking comments, try to get the issue/PR number to post a reply
    issue_number = payload.get("issue", {}).get("number") or payload.get("pull_request", {}).get("number")

    event = ModerationEvent(
        id=str(uuid.uuid4()),
        repo_id=repo.id,
        delivery_id=delivery_id,
        type=event_type,
        decision=decision,
        severity=severity,
        title=body[:80] + ("..." if len(body) > 80 else ""),
        author=author,
        author_avatar=author_avatar,
        reason=first_issue.get("description", explanation[:120] if explanation else ""),
        ai_explanation=explanation,
    )
    db.add(event)
    db.add(ActivityFeedEntry(
        user_id=repo.user_id,
        type=decision.lower(),
        text=f"Comment by @{author} in {repo.full_name} → {decision}",
    ))
    await db.commit()
    await db.refresh(event)

    # Post a reply warning for BLOCK/FLAG comments
    if decision in ("BLOCK", "FLAG") and issue_number:
        access_token = await _get_user_token(db, repo.user_id)
        if access_token:
            action = "removed" if decision == "BLOCK" else "flagged"
            reply = (
                f"⚠️ **GitWise AI** — This comment has been {action} by automated moderation.\n\n"
                f"**Reason:** {explanation or first_issue.get('description', 'Policy violation detected.')}\n\n"
                f"*If you believe this is a mistake, contact a maintainer.*"
            )
            try:
                await gh_service.post_issue_comment(
                    access_token, repo.owner, repo.name, issue_number, reply
                )
            except Exception:
                pass

    return event


def _triage_comment(result: dict) -> str:
    classification = result.get("classification", "UNCLEAR")
    priority = result.get("priorityScore", 0)
    labels = result.get("labels", [])
    explanation = result.get("explanation", "")
    is_duplicate = result.get("isDuplicate", False)
    similar = result.get("similarIssues", [])

    emoji_map = {
        "BUG": "🐛",
        "FEATURE_REQUEST": "✨",
        "DOCUMENTATION": "📖",
        "QUESTION": "❓",
        "SPAM": "🚫",
        "UNCLEAR": "🔍",
    }
    icon = emoji_map.get(classification, "🔍")
    label_str = ", ".join(f"`{l}`" for l in labels) if labels else "_none_"
    duplicate_line = ""
    if is_duplicate and similar:
        duplicate_line = f"\n**Possible duplicate of:** {', '.join(str(s) for s in similar[:3])}\n"

    return (
        f"## {icon} GitWise AI — Issue Triage Report\n\n"
        f"**Classification:** `{classification}`  \n"
        f"**Priority Score:** {priority}/100  \n"
        f"**Suggested Labels:** {label_str}  \n"
        f"**Duplicate:** {'Yes ⚠️' if is_duplicate else 'No'}"
        f"{duplicate_line}\n\n"
        f"{explanation}\n\n"
        "---\n"
        "*Powered by [GitWise AI](https://github.com/krypthos-org/gitwise-ai) · Qwen2.5 72B*"
    )


async def process_new_issue(
    db: AsyncSession, payload: dict, repo: Repository, delivery_id: str
) -> ModerationEvent | None:
    """Auto-triage a newly opened GitHub issue received via webhook.
    Creates both a TriagedIssue AND a ModerationEvent so it shows on the Moderation page.
    """
    from services import triage as triage_service

    issue = payload.get("issue", {})
    title = issue.get("title", "")
    body = issue.get("body") or ""
    issue_number = issue.get("number")
    author = issue.get("user", {}).get("login", "unknown")
    author_avatar = issue.get("user", {}).get("avatar_url", "")
    issue_url = issue.get("html_url", "")

    # ── 1. AI triage ─────────────────────────────────────────────────────────
    result = await triage_service.analyze_issue(db, title, body, repo_id=repo.id)

    classification = result.get("classification", "UNCLEAR")
    priority = result.get("priorityScore", 0)
    explanation = result.get("explanation", "")
    labels = result.get("labels", [])
    is_duplicate = result.get("isDuplicate", False)

    # Map triage classification to a moderation decision for the Moderation page
    if classification == "SPAM":
        decision = "BLOCK"
        severity = "HIGH"
    elif is_duplicate or classification == "UNCLEAR":
        decision = "FLAG"
        severity = "MEDIUM"
    else:
        decision = "PASS"
        severity = "LOW"

    # ── 2. Update the persisted TriagedIssue with github metadata ─────────────
    if result.get("id"):
        res = await db.execute(select(TriagedIssue).where(TriagedIssue.id == result["id"]))
        triaged = res.scalar_one_or_none()
        if triaged:
            triaged.github_id = issue_number
            triaged.author = author
            triaged.url = issue_url

    # ── 3. Create a ModerationEvent so it shows on the Moderation page ────────
    event = ModerationEvent(
        id=str(uuid.uuid4()),
        repo_id=repo.id,
        delivery_id=delivery_id,
        type="issue",
        decision=decision,
        severity=severity,
        title=title[:120],
        author=author,
        author_avatar=author_avatar,
        reason=explanation[:120] if explanation else f"Classified as {classification}",
        ai_explanation=(
            f"**Classification:** {classification}\n"
            f"**Priority:** {priority}/100\n"
            f"**Labels:** {', '.join(labels) if labels else 'none'}\n"
            f"**Duplicate:** {'Yes' if is_duplicate else 'No'}\n\n"
            f"{explanation}"
        ),
        github_url=issue_url,
        pr_number=issue_number,
    )
    db.add(event)
    db.add(ActivityFeedEntry(
        user_id=repo.user_id,
        type="triage",
        text=f"Issue #{issue_number} in {repo.full_name} → {classification} ({decision})",
    ))
    await db.commit()
    await db.refresh(event)

    # ── 4. Post triage summary comment + apply labels on GitHub ───────────────
    access_token = await _get_user_token(db, repo.user_id)
    if access_token and issue_number:
        comment_body = _triage_comment(result)
        try:
            await gh_service.post_issue_comment(
                access_token, repo.owner, repo.name, issue_number, comment_body
            )
        except Exception:
            pass

        if labels:
            try:
                await gh_service.apply_issue_labels(
                    access_token, repo.owner, repo.name, issue_number, labels
                )
            except Exception:
                pass

    return event

