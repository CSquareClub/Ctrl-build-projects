import asyncio
import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db, AsyncSessionLocal
from db.models import ModerationEvent, Repository
from middleware.webhook_validation import verify_github_signature
from services import moderation_pipeline

router = APIRouter()
logger = logging.getLogger("gitwise.webhooks")


async def _get_monitored_repo(db: AsyncSession, full_name: str) -> Repository | None:
    result = await db.execute(
        select(Repository).where(Repository.full_name == full_name, Repository.is_monitored == True)
    )
    return result.scalar_one_or_none()


async def _process_event(delivery_id: str, event_type: str, payload: dict) -> None:
    """Background task — process a GitHub webhook event after 200 is returned."""
    try:
        async with AsyncSessionLocal() as db:
            # Idempotency: skip if already processed
            existing = await db.execute(
                select(ModerationEvent).where(ModerationEvent.delivery_id == delivery_id)
            )
            if existing.scalar_one_or_none():
                logger.info("Skipping duplicate delivery %s", delivery_id)
                return

            repo_full_name = (
                payload.get("repository", {}).get("full_name", "")
            )
            repo = await _get_monitored_repo(db, repo_full_name)
            if not repo:
                logger.info("Ignoring webhook for unmonitored repo %s", repo_full_name)
                return  # Webhook received for a repo we're not monitoring

            logger.info("Processing %s event for %s (delivery=%s)", event_type, repo_full_name, delivery_id)

            if event_type == "pull_request" and payload.get("action") in ("opened", "synchronize"):
                await moderation_pipeline.process_pull_request(db, payload, repo, delivery_id)

            elif event_type == "issues" and payload.get("action") == "opened":
                await moderation_pipeline.process_new_issue(db, payload, repo, delivery_id)

            elif event_type == "push":
                await moderation_pipeline.process_push(db, payload, repo, delivery_id)

            elif event_type in ("issue_comment", "pull_request_review_comment"):
                if payload.get("action") == "created":
                    await moderation_pipeline.process_comment(db, payload, repo, delivery_id, event_type)
            else:
                logger.info("Unhandled event type: %s (action=%s)", event_type, payload.get("action"))
    except Exception:
        logger.exception("Error processing webhook delivery %s (event=%s)", delivery_id, event_type)


@router.post("/github")
async def receive_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: str = Header(..., alias="X-GitHub-Event"),
    x_github_delivery: str = Header(..., alias="X-GitHub-Delivery"),
):
    """
    Single entry point for all GitHub webhook events.
    Always returns 200 immediately — processing happens in the background.
    """
    body = await verify_github_signature(request)
    payload = json.loads(body)

    background_tasks.add_task(_process_event, x_github_delivery, x_github_event, payload)

    return {"received": True}
