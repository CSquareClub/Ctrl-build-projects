"""Test script for AI title generator sanitization."""
import re
from typing import Optional


def _sanitize_title(raw_title: str) -> Optional[str]:
    """Copy of sanitization function for testing without imports."""
    if not raw_title:
        return None
    
    title = raw_title.lower()
    
    prefixes_to_remove = ["title:", "summary:", "topic:", "about:"]
    for prefix in prefixes_to_remove:
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


def test_title_sanitization():
    """Test that titles are properly sanitized."""
    
    test_cases = [
        # (input, expected_output)
        ("learning python basics", "Learning python basics"),
        ("MACHINE LEARNING CONCEPTS", "Machine learning concepts"),
        ("Title: cooking recipes", "Cooking recipes"),
        ('"chatting about weather"', "Chatting about weather"),
        ("'hello world'", "Hello world"),
        ("python 🐍 programming", "Python programming"),
        ("this is a very long title with too many words here", "This is a very long title"),  # 6 words max
        ("hello, world! how are you?", "Hello world how are you"),
        ("  extra   whitespace   here  ", "Extra whitespace here"),
        ("summary: data science basics", "Data science basics"),
        ("about: web development", "Web development"),
        ("", None),
        ("ab", None),  # Too short
        ("ok", None),  # Too short
    ]
    
    print("=" * 60)
    print("TITLE SANITIZATION TEST")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for raw_input, expected in test_cases:
        result = _sanitize_title(raw_input)
        
        if result == expected:
            print(f"✓ PASS: '{raw_input}' → '{result}'")
            passed += 1
        else:
            print(f"✗ FAIL: '{raw_input}'")
            print(f"  Expected: '{expected}'")
            print(f"  Got:      '{result}'")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed}/{len(test_cases)} passed")
    print("=" * 60)
    
    if failed == 0:
        print("\n✅ All sanitization tests passed!")
    else:
        print(f"\n❌ {failed} tests failed!")


if __name__ == "__main__":
    test_title_sanitization()
