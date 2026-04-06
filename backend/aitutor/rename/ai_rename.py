"""
AI-Powered Chat Title Generation using Groq API

This module generates chat titles using a SEPARATE Groq API key
specifically for title generation. It does NOT use the main chat
response model/client.

========================
API KEY SEPARATION
========================

- GROQ_API_KEY       → Used for chat responses (DO NOT USE HERE)
- GROQ_API_KEY_TITLE → Used ONLY for title generation (THIS MODULE)

This separation ensures:
1. Title generation costs are tracked separately
2. Rate limits don't affect chat responses
3. Can use different models for each purpose

========================
MODEL SELECTION
========================

We use a smaller, faster model for title generation:
- llama-3.2-1b-preview: Fast, lightweight, good for summarization

========================
TITLE CONSTRAINTS
========================

Generated titles MUST be:
- Max 6 words
- Lowercase (we capitalize first letter after)
- No punctuation
- No emojis
- No AI-sounding phrases like "here is" or "let me explain"
- Direct reflection of what user asked

GOOD: "python list comprehension", "binary search example"
BAD: "here is an explanation of python", "sure this chat is about"

========================
Author: Senior Backend Engineer
Date: January 2026
========================
"""
from __future__ import annotations

import logging
import os
import re
from typing import List, Optional

import httpx


logger = logging.getLogger(__name__)

# ========================
# AI CONFIGURATION
# ========================
# CRITICAL: Use GROQ_API_KEY_TITLE, NOT GROQ_API_KEY
# The main API key is reserved for chat responses only
# ========================
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
TITLE_MODEL = "llama-3.1-8b-instant"  # Fast model for title generation

# System prompt designed to generate clean, human-sounding titles
TITLE_SYSTEM_PROMPT = """Generate a chat title based on the user's messages.

STRICT OUTPUT RULES:
- Output ONLY the title, nothing else
- Maximum 6 words
- All lowercase
- No punctuation (no periods, commas, question marks)
- No quotes or special characters
- No emojis
- NO explanatory phrases like "here is", "this is about", "let me", "sure"
- Title should sound like a human wrote it, not an AI
- Focus on the TOPIC the user is asking about

EXAMPLES:
Messages: "what is python", "how do i learn it"
Output: learning python programming

Messages: "explain binary search", "show me an example"
Output: binary search algorithm

Messages: "how to cook pasta", "what sauce is best"
Output: cooking pasta recipes

Messages: "tell me about ai", "what is machine learning"
Output: ai and machine learning"""


async def generate_title_with_ai(user_messages: List[str]) -> Optional[str]:
    """
    Generate a chat title using AI (Groq API).
    
    IMPORTANT: Uses GROQ_API_KEY_TITLE, NOT the main GROQ_API_KEY.
    
    Args:
        user_messages: List of user messages (last 2-3)
    
    Returns:
        Sanitized title string, or None if generation fails
    
    Failure Handling:
        - API key missing → Returns None (logs warning)
        - API call fails → Returns None (logs error)
        - Invalid output → Returns None (logs warning)
        - NEVER raises exceptions to caller
    """
    if not user_messages:
        logger.warning("AI title generation called with no messages")
        return None
    
    # CRITICAL: Use the SEPARATE title API key
    api_key = os.getenv("GROQ_API_KEY_TITLE")
    
    if not api_key:
        # Silently skip if no title API key is configured
        # This is expected in some environments
        logger.debug("GROQ_API_KEY_TITLE not set, skipping AI title generation")
        return None
    
    # Build prompt from user messages only (no bot messages)
    messages_text = "\n".join(
        f"- {msg.strip()}"
        for msg in user_messages[-3:]  # Last 3 messages max
        if msg.strip()
    )
    
    user_prompt = f"User messages:\n{messages_text}\n\nGenerate title:"
    
    payload = {
        "model": TITLE_MODEL,
        "messages": [
            {"role": "system", "content": TITLE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3,  # Low temperature for consistent output
        "max_tokens": 15,    # Very short, we only need ~6 words
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    try:
        # Short timeout - title generation should be fast
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            response = await client.post(
                GROQ_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            
    except httpx.ConnectError as exc:
        logger.error("Title AI connection error: %s", exc)
        return None
    except httpx.TimeoutException as exc:
        logger.warning("Title AI request timed out: %s", exc)
        return None
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response else "unknown"
        logger.error("Title AI HTTP error (status=%s)", status)
        return None
    except httpx.HTTPError as exc:
        logger.error("Title AI request failed: %s", exc)
        return None
    
    try:
        data = response.json()
        raw_title = data["choices"][0]["message"]["content"].strip()
        
        if not raw_title:
            logger.warning("Title AI returned empty response")
            return None
        
        # Sanitize the output
        sanitized = sanitize_ai_title(raw_title)
        
        if not sanitized:
            logger.warning("Title AI output failed sanitization: '%s'", raw_title)
            return None
        
        logger.info("AI generated title: '%s' (raw: '%s')", sanitized, raw_title)
        return sanitized
        
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.error("Title AI response parsing failed: %s", exc)
        return None


def sanitize_ai_title(raw_title: str) -> Optional[str]:
    """
    Sanitize AI-generated title to meet format requirements.
    
    Requirements:
    - Max 6 words
    - No punctuation
    - No quotes
    - No emojis
    - No AI-sounding prefixes
    - Capitalize first letter
    
    Args:
        raw_title: Raw AI output
    
    Returns:
        Sanitized title or None if result is invalid
    """
    if not raw_title:
        return None
    
    # Convert to lowercase for processing
    title = raw_title.lower()
    
    # Remove AI-sounding prefixes
    bad_prefixes = [
        "title:", "summary:", "topic:", "about:",
        "here is", "this is", "let me", "sure",
        "the title is", "i suggest", "how about",
    ]
    for prefix in bad_prefixes:
        if title.startswith(prefix):
            title = title[len(prefix):].strip()
    
    # Remove quotes (single, double, smart quotes)
    title = re.sub(r'["\'\`""''„]', '', title)
    
    # Remove emojis and non-ASCII characters
    title = re.sub(r'[^\x00-\x7F]+', '', title)
    
    # Remove punctuation (keep only letters, numbers, spaces)
    title = re.sub(r'[^\w\s]', '', title)
    
    # Normalize whitespace
    title = ' '.join(title.split())
    
    # Limit to 6 words
    words = title.split()
    if len(words) > 6:
        words = words[:6]
    title = ' '.join(words)
    
    # Validate result
    if not title or len(title) < 3:
        return None
    
    # Capitalize first letter for display
    title = title[0].upper() + title[1:] if len(title) > 1 else title.upper()
    
    return title


async def try_ai_rename(
    db,
    chat_id,
    current_title: str = "New Chat"
) -> Optional[str]:
    """
    Attempt to rename a chat using AI-generated title.
    
    This fetches the last 2-3 user messages and generates a title.
    
    Prerequisites (checked by caller):
    - Title is "New Chat"
    - Chat has 2+ user messages
    - Chat is not deleted
    
    Args:
        db: Database connection
        chat_id: ObjectId of the chat
        current_title: Current chat title
    
    Returns:
        New title if successful, None otherwise
    """
    logger.info("AI rename attempt for chat %s", chat_id)
    
    # Safety check
    if current_title != "New Chat":
        logger.info("Skipping: title is not 'New Chat'")
        return None
    
    # Fetch last 3 user messages
    cursor = (
        db["messages"]
        .find({"chat_id": chat_id, "role": "user"})
        .sort("created_at", -1)
        .limit(3)
    )
    
    user_messages: List[str] = []
    async for doc in cursor:
        content = doc.get("content", "")
        if content.strip():
            user_messages.append(content.strip())
    
    # Reverse to chronological order
    user_messages.reverse()
    
    logger.info("Found %d user messages for AI title generation", len(user_messages))
    
    if len(user_messages) < 2:
        logger.warning("Not enough messages (need 2, got %d)", len(user_messages))
        return None
    
    # Generate title with AI
    logger.info("Calling AI API for title generation...")
    new_title = await generate_title_with_ai(user_messages)
    
    if not new_title:
        logger.warning("AI title generation returned None")
        return None
    
    logger.info("AI generated title: '%s'", new_title)
    
    # Save to database (only if still "New Chat" to prevent race conditions)
    result = await db["chats"].update_one(
        {"_id": chat_id, "title": "New Chat"},
        {"$set": {"title": new_title}}
    )
    
    if result.modified_count > 0:
        logger.info("SUCCESS: Chat %s renamed to '%s' via AI", chat_id, new_title)
        return new_title
    else:
        logger.warning("DB update failed: no documents modified (race condition?)")
        return None
