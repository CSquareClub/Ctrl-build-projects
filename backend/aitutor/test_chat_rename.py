"""Test script to verify chat auto-rename greeting detection."""


# ========================
# GREETING/SMALL-TALK DETECTION (copied from message_routes.py for testing)
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


def _is_greeting_or_small_talk(message: str) -> bool:
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


def test_greeting_detection():
    """Test that greetings and small talk are correctly detected."""
    
    # Messages that SHOULD be detected as greetings (NOT used as titles)
    greetings = [
        "hi",
        "hello",
        "hey",
        "Hi!",
        "Hello?",
        "hey whats up",
        "how are you",
        "how are you?",
        "How are you doing?",
        "what's up",
        "sup",
        "yo",
        "thanks",
        "thank you",
        "bye",
        "good morning",
        "hi there",
        "hey hey",
        "who are you",
        "what is your name",
        "what's your name?",
        "are you a bot",
        "ok",
        "k",
        "yes",
        "no",
    ]
    
    # Messages that should NOT be detected as greetings (SHOULD be used as titles)
    meaningful_queries = [
        "what is python",
        "difference between ai and ml",
        "explain binary search",
        "how to create a website",
        "what is machine learning",
        "tell me about quantum computing",
        "write a python function",
        "how to fix this error",
        "explain recursion to me",
        "what are the benefits of exercise",
    ]
    
    print("=" * 60)
    print("CHAT AUTO-RENAME: Greeting Detection Test")
    print("=" * 60)
    
    print("\n--- Testing GREETINGS (should NOT become titles) ---\n")
    greeting_passed = 0
    greeting_failed = 0
    
    for msg in greetings:
        result = _is_greeting_or_small_talk(msg)
        if result:
            print(f"✓ PASS: '{msg}' → Detected as greeting")
            greeting_passed += 1
        else:
            print(f"✗ FAIL: '{msg}' → NOT detected as greeting (should be!)")
            greeting_failed += 1
    
    print(f"\nGreetings: {greeting_passed}/{len(greetings)} passed")
    
    print("\n--- Testing MEANINGFUL QUERIES (should become titles) ---\n")
    query_passed = 0
    query_failed = 0
    
    for msg in meaningful_queries:
        result = _is_greeting_or_small_talk(msg)
        if not result:
            print(f"✓ PASS: '{msg}' → Will be used as title")
            query_passed += 1
        else:
            print(f"✗ FAIL: '{msg}' → Wrongly detected as greeting")
            query_failed += 1
    
    print(f"\nMeaningful queries: {query_passed}/{len(meaningful_queries)} passed")
    
    print("\n" + "=" * 60)
    total_passed = greeting_passed + query_passed
    total_tests = len(greetings) + len(meaningful_queries)
    print(f"TOTAL: {total_passed}/{total_tests} tests passed")
    print("=" * 60)
    
    if greeting_failed == 0 and query_failed == 0:
        print("\n✅ All tests passed! Chat auto-rename logic is working correctly.")
    else:
        print(f"\n❌ {greeting_failed + query_failed} tests failed!")


if __name__ == "__main__":
    test_greeting_detection()
