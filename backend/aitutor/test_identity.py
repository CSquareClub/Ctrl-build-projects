"""Test script to verify identity detection works correctly."""
from services.logic_engine import process_logic


def test_identity_responses():
    """Test all identity-related questions."""

    intro_marker = "My name is Saivo"
    
    test_cases = [
        # Intro / who-are-you tests
        ("who are you?", intro_marker),
        ("who are u", intro_marker),
        ("hey who are u", intro_marker),

        # Name tests
        ("what is your name?", "My name is Saivo."),
        ("what's your name", "My name is Saivo."),
        ("tell me your name", "My name is Saivo."),
        
        # Nature tests
        ("what are you?", "I'm a Large Language Model designed to assist with information and communication."),
        ("are you a bot?", "I'm a Large Language Model designed to assist with information and communication."),
        ("are you an ai", "I'm a Large Language Model designed to assist with information and communication."),
        
        # Origin tests - checking for the key phrase
        ("who made you?", "Kush Dalal"),
        ("who created you", "Kush Dalal"),
        ("what is your origin?", "Kush Dalal"),
        ("who's your creator", "Kush Dalal"),
        
        # Pronouns tests
        ("what are your pronouns?", "You can refer to me as he/him."),
        ("he or she?", "You can refer to me as he/him."),
    ]
    
    print("Testing identity detection...\n")
    passed = 0
    failed = 0
    
    for question, expected_substring in test_cases:
        result = process_logic(question)
        
        if result and expected_substring in result:
            print(f"✓ PASS: '{question}'")
            print(f"  Response: {result[:80]}...")
            passed += 1
        else:
            print(f"✗ FAIL: '{question}'")
            print(f"  Expected substring: '{expected_substring}'")
            print(f"  Got: {result}")
            failed += 1
        print()
    
    print(f"\n{'='*60}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*60}")
    
    # Test non-identity questions return None
    print("\nTesting non-identity questions (should return None or other logic)...")
    non_identity = [
        "hello",
        "how are you",
        "what's the weather",
    ]
    
    for question in non_identity:
        result = process_logic(question)
        print(f"'{question}' -> {result if result else 'None (passes to AI)'}")


if __name__ == "__main__":
    test_identity_responses()
