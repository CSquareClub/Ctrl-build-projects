"""
Chat Rename Controller

This module orchestrates chat title renaming by deciding which
approach to use: rule-based or AI-based.

========================
RENAME STRATEGY
========================

1. FIRST MESSAGE: Try rule-based rename
   - If user's first message is meaningful (not greeting), use it as title
   - Fast, no API call needed
   - Handles most cases

2. FALLBACK (2+ messages): Try AI-based rename
   - If rule-based didn't work and we have 2+ messages
   - Uses GROQ_API_KEY_TITLE (separate from chat API key)
   - Generates a summarized title from user messages

========================
WHEN TO RENAME
========================

Rename ONLY if ALL conditions are true:
- chat.title == "New Chat"
- chat is NOT deleted
- chat has not been renamed before

Additional conditions for AI rename:
- chat has at least 2 user messages
- GROQ_API_KEY_TITLE is configured

========================
EXECUTION
========================

- Rule-based: Synchronous, immediate
- AI-based: Async background task (non-blocking)

========================
Author: Senior Backend Engineer
Date: January 2026
========================
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from .backuprenamelogic import try_rule_based_rename, is_greeting_or_small_talk
from .ai_rename import try_ai_rename


logger = logging.getLogger(__name__)


def should_rename_chat(
    current_title: str,
    is_deleted: bool = False
) -> bool:
    """
    Check if a chat is eligible for renaming.
    
    A chat can be renamed ONLY if:
    1. Current title is "New Chat" (never been renamed)
    2. Chat is not deleted
    
    Args:
        current_title: Current chat title
        is_deleted: Whether chat has deleted_at set
    
    Returns:
        True if chat can be renamed, False otherwise
    """
    if current_title != "New Chat":
        return False
    
    if is_deleted:
        return False
    
    return True


async def handle_chat_rename(
    db,
    chat_id,
    user_message: str,
    current_title: str,
    is_deleted: bool = False,
    user_message_count: int = 1
) -> Optional[str]:
    """
    Main entry point for chat renaming.
    
    This function decides which rename strategy to use:
    1. Rule-based (first message, if meaningful)
    2. AI-based (FORCED on exactly 3rd user message)
    
    Args:
        db: Database connection
        chat_id: ObjectId of the chat
        user_message: The current user message
        current_title: Current chat title
        is_deleted: Whether chat is deleted
        user_message_count: Number of user messages in chat
    
    Returns:
        New title if renamed, None otherwise
    """
    logger.info("=" * 50)
    logger.info("RENAME CHECK for chat %s", chat_id)
    logger.info("Current title: '%s'", current_title)
    logger.info("User message count: %d", user_message_count)
    logger.info("Is deleted: %s", is_deleted)
    logger.info("=" * 50)
    
    # Check if rename is even possible
    if not should_rename_chat(current_title, is_deleted):
        logger.info("SKIP: Chat not eligible for rename (title=%s, deleted=%s)", current_title, is_deleted)
        return None
    
    # ========================
    # STRATEGY 1: Rule-Based Rename
    # ========================
    # Try on FIRST message only
    # If message is meaningful (not greeting), use it as title
    # ========================
    if user_message_count == 1:
        logger.info("STRATEGY 1: Trying rule-based rename (first message)")
        if not is_greeting_or_small_talk(user_message):
            new_title = await try_rule_based_rename(
                db=db,
                chat_id=chat_id,
                user_message=user_message,
                current_title=current_title
            )
            if new_title:
                logger.info("SUCCESS: Chat %s renamed via rule-based: '%s'", chat_id, new_title)
                return new_title
            else:
                logger.info("Rule-based rename returned None")
        else:
            logger.info("First message is greeting/small talk, skipping rule-based")
    
    # ========================
    # STRATEGY 2: AI-Based Rename (FORCED on 3rd message)
    # ========================
    # If we have exactly 3 user messages and title is still "New Chat"
    # FORCE AI rename - this runs SYNCHRONOUSLY to update immediately
    # ========================
    if user_message_count == 3:
        logger.info("STRATEGY 2: FORCING AI rename (3rd user message)")
        
        # Run synchronously - DO NOT use background task
        # This ensures title updates immediately and shows in MongoDB
        new_title = await try_ai_rename(db, chat_id, current_title)
        
        if new_title:
            logger.info("SUCCESS: Chat %s renamed via AI: '%s'", chat_id, new_title)
            return new_title
        else:
            logger.warning("FAILED: AI rename returned None for chat %s", chat_id)
    else:
        logger.info("Not triggering AI rename (message_count=%d, need exactly 3)", user_message_count)
    
    return None


async def _try_ai_rename_background(
    db,
    chat_id,
    current_title: str
) -> None:
    """
    Background task wrapper for AI rename.
    
    This is called via asyncio.create_task() to avoid blocking
    the main chat response. Any errors are caught and logged.
    
    Args:
        db: Database connection
        chat_id: ObjectId of the chat
        current_title: Current chat title
    """
    try:
        # Small delay to let the current message save complete
        await asyncio.sleep(0.1)
        
        # Check if still needs rename (might have been renamed already)
        chat_doc = await db["chats"].find_one({"_id": chat_id})
        if not chat_doc or chat_doc.get("title") != "New Chat":
            return
        
        # Try AI rename
        new_title = await try_ai_rename(db, chat_id, current_title)
        
        if new_title:
            logger.info("Background AI rename succeeded for chat %s: '%s'", chat_id, new_title)
            
    except Exception as exc:
        # Never let errors bubble up from background task
        logger.error("Background AI rename failed for chat %s: %s", chat_id, exc)


async def force_ai_rename(
    db,
    chat_id
) -> Optional[str]:
    """
    Force AI-based rename regardless of message count.
    
    This is useful for manual triggers or testing.
    Still respects the "New Chat" title check.
    
    Args:
        db: Database connection
        chat_id: ObjectId of the chat
    
    Returns:
        New title if successful, None otherwise
    """
    chat_doc = await db["chats"].find_one({"_id": chat_id})
    
    if not chat_doc:
        return None
    
    current_title = chat_doc.get("title", "New Chat")
    
    if current_title != "New Chat":
        return None
    
    return await try_ai_rename(db, chat_id, current_title)
