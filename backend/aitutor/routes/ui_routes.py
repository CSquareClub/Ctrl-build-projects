"""
UI Suggestions Endpoint

========================
SLOT-BASED UPDATE SYSTEM
========================

This module implements FIXED-TIME AI suggestion updates.
Suggestions update STRICTLY twice per day:
- at 00:00 (midnight)
- at 12:00 (noon)

========================
TIME SLOT LOGIC
========================

A "slot" is a string that uniquely identifies a 12-hour window:

    If current_hour < 12:
        slot = "YYYY-MM-DD-00"   (morning slot)
    Else:
        slot = "YYYY-MM-DD-12"   (afternoon slot)

Examples:
- 2026-01-31 at 09:45 → "2026-01-31-00"
- 2026-01-31 at 14:30 → "2026-01-31-12"
- 2026-02-01 at 00:15 → "2026-02-01-00"

========================
UPDATE CONDITION
========================

On each request:
1. Calculate current_slot
2. Fetch document from MongoDB
3. Compare current_slot vs last_update_slot
4. If different → generate new suggestions, save, update slot
5. If same → return cached suggestions (no AI call)

This guarantees:
- EXACTLY 2 updates per day
- Updates happen on FIRST request after slot change
- No unnecessary API calls

========================
MONGODB STRUCTURE
========================

Collection: ui_suggestions
Single document:
{
    _id: "global",
    suggestions: ["suggestion1", "suggestion2", ...],  // exactly 6
    last_update_slot: "2026-01-31-12"
}

========================
Author: Senior Backend Engineer
Date: January 2026
========================
"""
from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database


logger = logging.getLogger(__name__)

ui_router = APIRouter(prefix="/ui", tags=["UI"])


# ========================
# DEFAULT SUGGESTIONS
# ========================
# Used when:
# - No document exists yet (first run)
# - AI generation fails
# ========================
DEFAULT_SUGGESTIONS: List[str] = [
    "explain how neural networks learn patterns",
    "write a python script for data analysis",
    "summarize the latest tech industry news",
    "help me debug my javascript code",
    "create a study plan for machine learning",
    "generate creative ideas for my project",
]


# ========================
# AI CONFIGURATION
# ========================
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
SUGGESTIONS_MODEL = "llama-3.1-8b-instant"

SUGGESTIONS_SYSTEM_PROMPT = """Generate exactly 6 AI assistant task suggestions.

STRICT OUTPUT RULES:
- Output ONLY the 6 suggestions, one per line
- Each suggestion must be 5-8 words
- All lowercase
- No punctuation (no periods, commas, question marks)
- No quotes or special characters
- No emojis
- No numbering or bullet points
- Each should be a useful AI-related task
- Mix of: coding, learning, writing, analysis, creativity
- Occasionally include current tech trends or affairs

EXAMPLE OUTPUT:
explain how machine learning models work
write a python script for web scraping
summarize recent developments in ai safety
help me optimize my database queries
create a weekly workout plan for beginners
generate marketing copy for my startup"""


def get_current_slot() -> str:
    """
    Calculate the current time slot.
    
    Slot format: "YYYY-MM-DD-HH" where HH is either 00 or 12
    
    Logic:
    - If current hour < 12: slot = "YYYY-MM-DD-00" (morning)
    - If current hour >= 12: slot = "YYYY-MM-DD-12" (afternoon)
    
    Returns:
        Slot string like "2026-01-31-00" or "2026-01-31-12"
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    
    # Determine slot based on hour
    if now.hour < 12:
        slot_hour = "00"
    else:
        slot_hour = "12"
    
    slot = f"{date_str}-{slot_hour}"
    logger.debug("Current time slot: %s (hour=%d)", slot, now.hour)
    return slot


async def generate_suggestions_with_ai() -> Optional[List[str]]:
    """
    Generate 6 suggestions using Groq API.
    
    Uses GROQ_API_KEY_TITLE (same key as title generation).
    
    Returns:
        List of 6 suggestion strings, or None if generation fails
    
    Failure Handling:
        - API key missing → Returns None
        - API call fails → Returns None
        - Invalid output → Returns None
        - NEVER raises exceptions
    """
    api_key = os.getenv("GROQ_API_KEY_TITLE")
    
    if not api_key:
        logger.warning("GROQ_API_KEY_TITLE not set, cannot generate suggestions")
        return None
    
    payload = {
        "model": SUGGESTIONS_MODEL,
        "messages": [
            {"role": "system", "content": SUGGESTIONS_SYSTEM_PROMPT},
            {"role": "user", "content": "Generate 6 suggestions for today:"},
        ],
        "temperature": 0.8,  # Higher for variety
        "max_tokens": 200,
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
            response = await client.post(
                GROQ_API_URL,
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            
    except httpx.ConnectError as exc:
        logger.error("Suggestions AI connection error: %s", exc)
        return None
    except httpx.TimeoutException as exc:
        logger.warning("Suggestions AI request timed out: %s", exc)
        return None
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response else "unknown"
        logger.error("Suggestions AI HTTP error (status=%s)", status)
        return None
    except httpx.HTTPError as exc:
        logger.error("Suggestions AI request failed: %s", exc)
        return None
    
    try:
        data = response.json()
        raw_output = data["choices"][0]["message"]["content"].strip()
        
        if not raw_output:
            logger.warning("Suggestions AI returned empty response")
            return None
        
        # Parse and sanitize suggestions
        suggestions = parse_suggestions(raw_output)
        
        if len(suggestions) != 6:
            logger.warning(
                "Expected 6 suggestions, got %d: %s",
                len(suggestions),
                suggestions
            )
            # Pad or trim to exactly 6
            suggestions = pad_suggestions(suggestions)
        
        logger.info("AI generated %d suggestions", len(suggestions))
        return suggestions
        
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.error("Suggestions AI response parsing failed: %s", exc)
        return None


def parse_suggestions(raw_output: str) -> List[str]:
    """
    Parse AI output into list of suggestions.
    
    Handles various formats:
    - One suggestion per line
    - Numbered lists (1. suggestion)
    - Bullet points (- suggestion, * suggestion)
    
    Returns:
        List of sanitized suggestion strings
    """
    lines = raw_output.strip().split("\n")
    suggestions: List[str] = []
    
    for line in lines:
        # Skip empty lines
        line = line.strip()
        if not line:
            continue
        
        # Remove numbering (1. 2. etc)
        line = re.sub(r"^\d+[\.\)]\s*", "", line)
        
        # Remove bullet points
        line = re.sub(r"^[-*•]\s*", "", line)
        
        # Sanitize
        sanitized = sanitize_suggestion(line)
        
        if sanitized:
            suggestions.append(sanitized)
    
    return suggestions


def sanitize_suggestion(raw: str) -> Optional[str]:
    """
    Sanitize a single suggestion.
    
    Rules:
    - Lowercase
    - No punctuation
    - No emojis
    - 5-8 words (flexible, we don't enforce strictly)
    - Min 10 characters
    
    Returns:
        Sanitized string or None if invalid
    """
    if not raw:
        return None
    
    # Lowercase
    text = raw.lower()
    
    # Remove quotes
    text = re.sub(r'["\'\`""''„]', '', text)
    
    # Remove emojis and non-ASCII
    text = re.sub(r'[^\x00-\x7F]+', '', text)
    
    # Remove punctuation (keep only letters, numbers, spaces)
    text = re.sub(r'[^\w\s]', '', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    # Validate length
    if len(text) < 10:
        return None
    
    return text


def pad_suggestions(suggestions: List[str]) -> List[str]:
    """
    Ensure we have exactly 6 suggestions.
    
    - If more than 6: trim
    - If less than 6: pad with defaults
    """
    if len(suggestions) >= 6:
        return suggestions[:6]
    
    # Pad with defaults
    result = suggestions.copy()
    for default in DEFAULT_SUGGESTIONS:
        if len(result) >= 6:
            break
        if default not in result:
            result.append(default)
    
    return result[:6]


@ui_router.get("/suggestions")
async def get_suggestions(
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get AI-generated suggestions for the home screen.
    
    ========================
    SLOT-BASED UPDATE LOGIC
    ========================
    
    1. Calculate current time slot
    2. Fetch existing document from MongoDB
    3. Compare current_slot vs last_update_slot
    4. If different:
       - Generate new suggestions via AI
       - Save to database
       - Update last_update_slot
    5. Return suggestions (cached or new)
    
    ========================
    GUARANTEED BEHAVIOR
    ========================
    
    - Updates happen EXACTLY twice per day (00:00 and 12:00 UTC)
    - First request after slot change triggers update
    - Subsequent requests in same slot return cached data
    - AI failures return cached/default suggestions
    - NEVER crashes, always returns valid response
    
    Returns:
        {"suggestions": ["...", "...", ...]}  (exactly 6 items)
    """
    current_slot = get_current_slot()
    
    logger.info("Suggestions request - current slot: %s", current_slot)
    
    # Fetch existing document
    doc = await db["ui_suggestions"].find_one({"_id": "global"})
    
    if doc:
        last_slot = doc.get("last_update_slot", "")
        cached_suggestions = doc.get("suggestions", [])
        
        logger.info("Found cached suggestions, last_slot: %s", last_slot)
        
        # ========================
        # SLOT COMPARISON
        # ========================
        # If current_slot == last_slot: return cached (no update)
        # If current_slot != last_slot: generate new suggestions
        # ========================
        if current_slot == last_slot:
            logger.info("Same slot, returning cached suggestions")
            return {"suggestions": cached_suggestions}
        
        logger.info("Slot changed (%s → %s), generating new suggestions", last_slot, current_slot)
    else:
        logger.info("No cached suggestions found, generating initial set")
        cached_suggestions = DEFAULT_SUGGESTIONS
    
    # ========================
    # GENERATE NEW SUGGESTIONS
    # ========================
    new_suggestions = await generate_suggestions_with_ai()
    
    if new_suggestions:
        suggestions_to_save = new_suggestions
        logger.info("AI generation successful, saving %d suggestions", len(new_suggestions))
    else:
        # AI failed - keep existing or use defaults
        suggestions_to_save = cached_suggestions if cached_suggestions else DEFAULT_SUGGESTIONS
        logger.warning("AI generation failed, using fallback suggestions")
    
    # ========================
    # SAVE TO DATABASE
    # ========================
    # Upsert: create if not exists, update if exists
    # ========================
    await db["ui_suggestions"].update_one(
        {"_id": "global"},
        {
            "$set": {
                "suggestions": suggestions_to_save,
                "last_update_slot": current_slot,
                "updated_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    
    logger.info("Saved suggestions to database, slot: %s", current_slot)
    
    return {"suggestions": suggestions_to_save}
