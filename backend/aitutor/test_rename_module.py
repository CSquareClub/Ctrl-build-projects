"""Test script for the new chat rename module."""
import re
from typing import Optional


# ========================
# COPY OF LOGIC FOR STANDALONE TESTING
# ========================

GREETING_PATTERNS = {
    "hi", "hello", "hey", "hii", "hiii", "heya", "hola", "sup",
    "yo", "howdy", "greetings", "good morning", "good afternoon",
    "good evening", "good night", "gm", "gn",
    "how are you", "how r u", "how are u", "hows it going",
    "how are you doing", "how you doing", "how are you today",
    "whats up", "what's up", "wassup", "wazzup", "sup",
    "how do you do", "nice to meet you", "pleased to meet you",
    "hi there", "hello there", "hey there",
    "thanks", "thank you", "thx", "ty", "bye", "goodbye", "see you",
    "take care", "later", "cya", "ttyl",
}

IDENTITY_PATTERNS = [
    "what is your name", "what's your name", "whats your name",
    "who are you", "what are you", "who made you", "who created you",
    "your name", "your pronouns", "are you a bot", "are you an ai",
]


def is_greeting_or_small_talk(message: str) -> bool:
    normalized = message.strip().lower()
    normalized_clean = normalized.replace("?", "").replace("!", "").replace(".", "").replace(",", "")
    
    if normalized_clean in GREETING_PATTERNS:
        return True
    
    greeting_starters = ["hi ", "hey ", "hello ", "yo "]
    for starter in greeting_starters:
        if normalized_clean.startswith(starter):
            remainder = normalized_clean[len(starter):].strip()
            if not remainder or remainder in GREETING_PATTERNS or len(remainder) < 5:
                return True
    
    for pattern in IDENTITY_PATTERNS:
        if pattern in normalized_clean:
            return True
    
    if len(normalized_clean) < 4:
        return True
    
    return False


def sanitize_ai_title(raw_title: str) -> Optional[str]:
    if not raw_title:
        return None
    
    title = raw_title.lower()
    
    bad_prefixes = [
        "title:", "summary:", "topic:", "about:",
        "here is", "this is", "let me", "sure",
        "the title is", "i suggest", "how about",
    ]
    for prefix in bad_prefixes:
        if title.startswith(prefix):
            title = title[len(prefix):].strip()
    
    title = re.sub(r'["\'\`""''„]', '', title)
    title = re.sub(r'[^\x00-\x7F]+', '', title)
    title = re.sub(r'[^\w\s]', '', title)
    title = ' '.join(title.split())
    
    words = title.split()
    if len(words) > 6:
        words = words[:6]
    title = ' '.join(words)
    
    if not title or len(title) < 3:
        return None
    
    title = title[0].upper() + title[1:] if len(title) > 1 else title.upper()
    
    return title


def test_greeting_detection():
    """Test greeting detection logic."""
    print("=" * 60)
    print("GREETING DETECTION TEST")
    print("=" * 60)
    
    greetings = [
        "hi", "hello", "hey", "how are you", "what's up",
        "hi there", "who are you", "what is your name",
    ]
    
    queries = [
        "what is python", "explain binary search",
        "how to create a website", "difference between ai and ml",
    ]
    
    print("\n--- Greetings (should return True) ---")
    for msg in greetings:
        result = is_greeting_or_small_talk(msg)
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: '{msg}' → {result}")
    
    print("\n--- Queries (should return False) ---")
    for msg in queries:
        result = is_greeting_or_small_talk(msg)
        status = "✓ PASS" if not result else "✗ FAIL"
        print(f"{status}: '{msg}' → {result}")


def test_title_sanitization():
    """Test AI title sanitization logic."""
    print("\n" + "=" * 60)
    print("TITLE SANITIZATION TEST")
    print("=" * 60)
    
    test_cases = [
        ("python programming basics", "Python programming basics"),
        ("MACHINE LEARNING", "Machine learning"),
        ("Title: web development", "Web development"),
        ("here is python tutorial", "Python tutorial"),
        ('"learning javascript"', "Learning javascript"),
        ("python 🐍 coding", "Python coding"),
        ("this is a very long title with many words", "This is a very long title"),
    ]
    
    print()
    for raw, expected in test_cases:
        result = sanitize_ai_title(raw)
        status = "✓ PASS" if result == expected else "✗ FAIL"
        print(f"{status}: '{raw}' → '{result}'")
        if result != expected:
            print(f"  Expected: '{expected}'")


def test_rename_flow():
    """Test the overall rename flow logic."""
    print("\n" + "=" * 60)
    print("RENAME FLOW TEST")
    print("=" * 60)
    
    scenarios = [
        {
            "name": "First message is meaningful query",
            "messages": ["what is python"],
            "expected": "Rule-based rename"
        },
        {
            "name": "First message is greeting",
            "messages": ["hi"],
            "expected": "No rename (wait for more)"
        },
        {
            "name": "Greeting then query",
            "messages": ["hello", "what is machine learning"],
            "expected": "AI rename (2+ messages)"
        },
        {
            "name": "Multiple greetings then query",
            "messages": ["hi", "how are you", "explain binary search"],
            "expected": "AI rename (2+ messages)"
        },
    ]
    
    print()
    for scenario in scenarios:
        print(f"\nScenario: {scenario['name']}")
        print(f"  Messages: {scenario['messages']}")
        
        # Simulate rename logic
        first_msg = scenario['messages'][0]
        msg_count = len(scenario['messages'])
        
        if msg_count == 1 and not is_greeting_or_small_talk(first_msg):
            result = "Rule-based rename"
        elif msg_count >= 2:
            result = "AI rename (2+ messages)"
        else:
            result = "No rename (wait for more)"
        
        status = "✓ PASS" if result == scenario['expected'] else "✗ FAIL"
        print(f"  Result: {result}")
        print(f"  {status}")


if __name__ == "__main__":
    test_greeting_detection()
    test_title_sanitization()
    test_rename_flow()
    
    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETE")
    print("=" * 60)
