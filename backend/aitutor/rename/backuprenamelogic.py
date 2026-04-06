"""
Backup/Legacy Rule-Based Chat Rename Logic

This module contains the ORIGINAL rule-based approach to chat renaming.
It is preserved here as a backup and for cases where AI renaming is
not available or appropriate.

========================
HOW IT WORKS
========================

1. When a user sends their FIRST message
2. Check if it's a greeting or small talk (skip these)
3. If it's a meaningful query, use it as the chat title
4. Capitalize first letter, trim to 40 chars

========================
GREETING DETECTION
========================

Messages like "hi", "hello", "how are you" should NOT become titles.
Only substantive questions should be used.

========================
WHEN TO USE THIS
========================

- As the primary rename method on FIRST user message
- As a fallback when AI rename is not available
- When GROQ_API_KEY_TITLE is missing

========================
Author: Senior Backend Engineer
Date: January 2026
========================
"""
from typing import Optional


# ========================
# GREETING/SMALL-TALK PATTERNS
# ========================
# These messages should NOT trigger chat rename because they
# are not meaningful queries.
# ========================

GREETING_PATTERNS = {
    # Basic greetings
    "hi", "hello", "hey", "hii", "hiii", "heya", "hola", "sup",
    "yo", "howdy", "greetings", "good morning", "good afternoon",
    "good evening", "good night", "gm", "gn",
    # Small talk
    "how are you", "how r u", "how are u", "hows it going",
    "how are you doing", "how you doing", "how are you today",
    "whats up", "what's up", "wassup", "wazzup", "sup",
    "how do you do", "nice to meet you", "pleased to meet you",
    "hi there", "hello there", "hey there",
    # Thanks/bye
    "thanks", "thank you", "thx", "ty", "bye", "goodbye", "see you",
    "take care", "later", "cya", "ttyl",
}

# Identity questions - handled specially, not good titles
IDENTITY_PATTERNS = [
    "what is your name", "what's your name", "whats your name",
    "who are you", "what are you", "who made you", "who created you",
    "your name", "your pronouns", "are you a bot", "are you an ai",
]


def is_greeting_or_small_talk(message: str) -> bool:
    """
    Detect if a message is a greeting or small talk.
    
    These messages should NOT be used as chat titles because they
    are not meaningful queries.
    
    GOOD titles (returns False):
    - "What is Python"
    - "Explain binary search"
    - "How to create a website"
    
    BAD titles (returns True):
    - "Hi"
    - "Hello there"
    - "How are you"
    - "Who are you"
    
    Args:
        message: The user's message text
    
    Returns:
        True if message is greeting/small talk (do NOT use as title)
        False if message is a meaningful query (use as title)
    """
    normalized = message.strip().lower()
    
    # Remove punctuation for matching
    normalized_clean = normalized.replace("?", "").replace("!", "").replace(".", "").replace(",", "")
    
    # Check exact matches against greeting patterns
    if normalized_clean in GREETING_PATTERNS:
        return True
    
    # Check if starts with common greeting words followed by nothing meaningful
    greeting_starters = ["hi ", "hey ", "hello ", "yo "]
    for starter in greeting_starters:
        if normalized_clean.startswith(starter):
            # Check if what follows is also small talk
            remainder = normalized_clean[len(starter):].strip()
            if not remainder or remainder in GREETING_PATTERNS or len(remainder) < 5:
                return True
    
    # Check identity questions (these are handled specially, not good titles)
    for pattern in IDENTITY_PATTERNS:
        if pattern in normalized_clean:
            return True
    
    # Message is too short to be meaningful (likely just "ok", "k", "yes", etc.)
    if len(normalized_clean) < 4:
        return True
    
    return False


def generate_title_from_message(message: str, max_length: int = 40) -> Optional[str]:
    """
    Generate a chat title from a user message using rule-based logic.
    
    This is the ORIGINAL approach:
    1. Check if message is a greeting (skip if so)
    2. Trim to max_length characters
    3. Capitalize first letter
    
    Args:
        message: The user's message text
        max_length: Maximum title length (default 40)
    
    Returns:
        Generated title string, or None if message is not suitable
    """
    if not message or not message.strip():
        return None
    
    # Skip greetings and small talk
    if is_greeting_or_small_talk(message):
        return None
    
    # Clean and trim
    raw_title = message.strip()
    trimmed = raw_title[:max_length]
    
    # Capitalize first letter
    if len(trimmed) > 1:
        title = trimmed[0].upper() + trimmed[1:]
    else:
        title = trimmed.upper()
    
    return title


async def try_rule_based_rename(
    db,
    chat_id,
    user_message: str,
    current_title: str = "New Chat"
) -> Optional[str]:
    """
    Attempt to rename a chat using rule-based logic.
    
    This should be called on the FIRST user message.
    If the message is suitable (not a greeting), it becomes the title.
    
    Args:
        db: Database connection
        chat_id: ObjectId of the chat
        user_message: The user's message
        current_title: Current chat title (must be "New Chat" to proceed)
    
    Returns:
        New title if rename was successful, None otherwise
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info("Rule-based rename attempt for chat %s", chat_id)
    logger.info("Current title: '%s', User message: '%s'", current_title, user_message[:50])
    
    # Only rename if title is still "New Chat"
    if current_title != "New Chat":
        logger.info("Skipping: title is not 'New Chat'")
        return None
    
    # Generate title from message
    new_title = generate_title_from_message(user_message)
    
    if not new_title:
        logger.info("Skipping: message is a greeting or small talk")
        return None
    
    logger.info("Generated title: '%s'", new_title)
    
    # Update the chat title in database
    result = await db["chats"].update_one(
        {"_id": chat_id, "title": "New Chat"},
        {"$set": {"title": new_title}}
    )
    
    if result.modified_count > 0:
        logger.info("Chat %s renamed to '%s' via rule-based", chat_id, new_title)
        return new_title
    else:
        logger.warning("Rule-based rename failed: no documents modified")
        return None
