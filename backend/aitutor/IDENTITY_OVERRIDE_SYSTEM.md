# ChatTutor Identity Override System

## Overview
This document describes the **hard-coded identity override system** for ChatTutor, ensuring deterministic and consistent responses to identity-related questions.

## Problem Solved
Before this implementation, the chatbot would:
- Give different answers to identity questions across conversations
- Mention OpenAI, Meta, or other companies incorrectly
- Say "as I mentioned earlier" when no prior mention existed
- Allow AI to hallucinate different origins and creators

## Solution Architecture

### Two-Layer Defense

#### Layer 1: Hard-Coded Detection (PRIMARY)
**File:** `backend/services/logic_engine.py`
**Function:** `_detect_identity_intent()`

This layer executes **BEFORE** any AI call and provides deterministic responses.

**Execution Flow:**
```
User Message → process_logic() → _detect_identity_intent()
                                        ↓
                    Identity match? → YES → Return hard-coded response
                                        ↓
                                       NO → Continue to AI
```

#### Layer 2: System Prompt (BACKUP)
**File:** `backend/services/ai_services.py`
**Constant:** `SYSTEM_PROMPT`

This reinforces identity in the AI system prompt as a backup layer for edge cases.

## Identity Responses

### 1. Name
**Triggers:**
- "what is your name"
- "what's your name"
- "tell me your name"
- "what are you called"
- "your name"
- "name"

**Response:**
```
My name is ChatTutor.
```

### 2. Nature/Type
**Triggers:**
- "what are you"
- "what kind of ai"
- "are you a bot"
- "are you an ai"
- "are you human"

**Response:**
```
I'm a Large Language Model designed to assist with information and communication.
```

### 3. Origin/Creator
**Triggers:**
- "who made you"
- "who created you"
- "who built you"
- "what is your origin"
- "who is your creator"
- "where do you come from"
- "made by"
- "created by"

**Response:**
```
As for my origin, I'm a Large Language Model developed by a team of researchers and refined by Kush Dalal, a Computer Science student at Chandigarh University. Kush fine-tuned my capabilities to enable me to assist and communicate with humans in a helpful and informative way.
```

### 4. Pronouns
**Triggers:**
- "your pronouns"
- "what pronouns"
- "he or she"
- "are you male"
- "are you female"
- "what gender"

**Response:**
```
You can refer to me as he/him.
```

## Implementation Details

### Pattern Matching Strategy
1. Normalize message to lowercase
2. Remove punctuation (?, ., ,)
3. Check patterns in priority order (pronouns before "what are you")
4. Use substring matching with `any()` for multiple patterns
5. Return immediately on first match

### Priority Order
The order matters to prevent false positives:
1. **Name** - Most specific patterns
2. **Pronouns** - Must be before "what are you" check
3. **Nature** - Contains broad "what are you" pattern
4. **Origin** - Most comprehensive response

### Why This Works
- **Deterministic:** Same input always produces same output
- **Fast:** Simple string matching, no AI overhead
- **Priority:** Executes before AI call, cannot be overridden
- **No Memory:** Doesn't depend on conversation history
- **No Variation:** Exact same wording every time

## Testing

### Run Identity Tests
```bash
cd backend
python test_identity.py
```

### Expected Output
```
Results: 12 passed, 0 failed
```

### Test Coverage
- Name variations (3 tests)
- Nature variations (3 tests)
- Origin variations (4 tests)
- Pronoun variations (2 tests)
- Non-identity questions (3 tests)

## Code Locations

### Primary Implementation
- **File:** `backend/services/logic_engine.py`
- **Function:** `_detect_identity_intent()` (Lines 24-105)
- **Entry Point:** `process_logic()` (Line 108)

### Backup System Prompt
- **File:** `backend/services/ai_services.py`
- **Constant:** `SYSTEM_PROMPT` (Lines 17-28)
- **Usage:** Line 43 in payload

### Integration Point
- **File:** `backend/routes/message_routes.py`
- **Function:** `send_message()` (Line 168)
- **Logic:** Calls `process_logic()` before `generate_ai_reply()`

## Maintenance Guidelines

### Adding New Identity Patterns
1. Add pattern to appropriate section in `_detect_identity_intent()`
2. Add test case to `backend/test_identity.py`
3. Run tests to verify
4. Document the new pattern in this file

### Modifying Responses
**⚠️ WARNING:** These responses are part of ChatTutor's core identity.
- Changes should be reviewed carefully
- Update tests after changing responses
- Ensure consistency with system prompt backup

### What NOT to Do
❌ Make identity responses dynamic or AI-generated
❌ Use conversation memory for identity answers
❌ Add variations in wording
❌ Skip the hard-coded check
❌ Move identity detection after AI call

## Performance Impact
- **Minimal:** String operations are O(n) where n = message length
- **Fast:** Typically <1ms for pattern matching
- **Efficient:** Prevents unnecessary AI calls for identity questions
- **Scalable:** No database queries or external API calls

## Security Considerations
- Identity responses contain no sensitive information
- Hard-coded responses prevent prompt injection attacks on identity
- Cannot be manipulated through conversation history
- Immune to AI hallucination or training data contamination

## Future Enhancements
Potential improvements (if needed):
- Add regex patterns for more complex matching
- Implement fuzzy matching for typos
- Add multilingual identity support
- Log identity query frequency for analytics

## Troubleshooting

### Issue: Identity response not triggering
**Solution:** Add debug logging in `_detect_identity_intent()` to see normalized input

### Issue: Wrong identity response
**Solution:** Check pattern order - more specific patterns should come first

### Issue: AI still generates identity text
**Solution:** Verify `process_logic()` is called before `generate_ai_reply()` in message_routes.py

## Success Criteria
✅ Identity questions return exact same text every time
✅ No mentions of OpenAI, Meta, or other companies
✅ No "as I mentioned earlier" for identity questions
✅ Responses are deterministic, not AI-generated
✅ Pattern matching executes before AI call
✅ All tests pass

---
**Last Updated:** January 31, 2026
**Author:** Senior Backend Engineer
**Status:** Production Ready ✅
