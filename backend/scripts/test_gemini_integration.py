#!/usr/bin/env python3
import sys
import traceback

try:
    from app.services import classifier_service
except Exception as e:
    print("ERROR: Could not import classifier_service:", e)
    traceback.print_exc()
    sys.exit(2)


def test_gemini_stub():
    orig = getattr(classifier_service, "_call_gemini_triage", None)

    def stub(title, description):
        return {"label": "bug", "priority": "high", "labels": ["api"], "reason": "Simulated by test"}

    classifier_service._call_gemini_triage = stub
    try:
        res = classifier_service.triage_issue("Crash on start", "App crashes on start for user.")
        if res.get("source") != "gemini":
            print("FAIL: Expected source 'gemini', got", res.get("source"))
            return False
        if res.get("label") != "bug":
            print("FAIL: Expected label 'bug', got", res.get("label"))
            return False
        print("PASS: Gemini stub triage returned expected result:", res)
        return True
    except Exception as e:
        print("FAIL: Exception during gemini stub test:", e)
        traceback.print_exc()
        return False
    finally:
        classifier_service._call_gemini_triage = orig


def test_heuristic_fallback():
    orig = getattr(classifier_service, "_call_gemini_triage", None)

    def failing(title, description):
        raise RuntimeError("Simulated network failure")

    classifier_service._call_gemini_triage = failing
    try:
        res = classifier_service.triage_issue("Docs typo", "There's a misspelling in README")
        if res.get("source") != "heuristic":
            print("FAIL: Expected source 'heuristic', got", res.get("source"))
            return False
        print("PASS: Heuristic fallback used:", res.get("label"), res.get("priority"))
        return True
    except Exception as e:
        print("FAIL: Exception during heuristic fallback test:", e)
        traceback.print_exc()
        return False
    finally:
        classifier_service._call_gemini_triage = orig


if __name__ == "__main__":
    ok1 = test_gemini_stub()
    ok2 = test_heuristic_fallback()
    if ok1 and ok2:
        print("ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)
