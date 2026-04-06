#!/usr/bin/env python3
"""Tests for OpenIssue CLI."""
import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from cli import post_issue


def test_load_empty_queue(tmp_path):
    """Test loading non-existent queue returns empty list."""
    post_issue.QUEUE_FILE = tmp_path / "queue.json"
    assert post_issue.load_queue() == []


def test_save_and_load_queue(tmp_path):
    """Test saving and loading queue."""
    post_issue.QUEUE_FILE = tmp_path / "queue.json"
    
    issues = [
        {"title": "Test 1", "description": "Desc 1"},
        {"title": "Test 2", "description": "Desc 2"},
    ]
    post_issue.save_queue(issues)
    
    loaded = post_issue.load_queue()
    assert len(loaded) == 2
    assert loaded[0]["title"] == "Test 1"


def test_add_to_queue(tmp_path):
    """Test adding issue to queue."""
    post_issue.QUEUE_FILE = tmp_path / "queue.json"
    post_issue.save_queue([])  # Start empty
    
    issue = {"title": "Bug report", "description": "Something broke"}
    post_issue.add_to_queue(issue)
    
    queue = post_issue.load_queue()
    assert len(queue) == 1
    assert queue[0]["title"] == "Bug report"
    assert "queued_at" in queue[0]


def test_get_server_url_default():
    """Test default server URL."""
    with patch.dict("os.environ", {}, clear=True):
        url = post_issue.get_server_url()
        assert url == "http://localhost:8000"


def test_get_server_url_from_env():
    """Test server URL from environment."""
    with patch.dict("os.environ", {"OI_SERVER_URL": "http://myserver:9000/"}):
        url = post_issue.get_server_url()
        assert url == "http://myserver:9000"


def test_get_auth_headers_no_token():
    """Test headers without token."""
    with patch.dict("os.environ", {}, clear=True):
        headers = post_issue.get_auth_headers()
        assert "Authorization" not in headers
        assert headers["Content-Type"] == "application/json"


def test_get_auth_headers_with_token():
    """Test headers with token."""
    with patch.dict("os.environ", {"OI_API_TOKEN": "secret123"}):
        headers = post_issue.get_auth_headers()
        assert headers["Authorization"] == "Bearer secret123"


def test_post_issue_success():
    """Test successful issue post."""
    mock_response = MagicMock()
    mock_response.json.return_value = {"id": "issue-123", "title": "Test"}
    mock_response.raise_for_status = MagicMock()
    
    with patch("cli.post_issue.requests") as mock_requests:
        mock_requests.post.return_value = mock_response
        
        result = post_issue.post_issue_to_server(
            {"title": "Test", "description": "Desc"}
        )
        
        assert result is not None
        assert result["id"] == "issue-123"


def test_post_issue_timeout():
    """Test issue post timeout."""
    with patch("cli.post_issue.requests") as mock_requests:
        import requests as req_lib
        mock_requests.exceptions = req_lib.exceptions
        mock_requests.post.side_effect = req_lib.exceptions.Timeout()
        
        result = post_issue.post_issue_to_server(
            {"title": "Test", "description": "Desc"}
        )
        
        assert result is None


def test_post_issue_connection_error():
    """Test issue post connection error."""
    with patch("cli.post_issue.requests") as mock_requests:
        import requests as req_lib
        mock_requests.exceptions = req_lib.exceptions
        mock_requests.post.side_effect = req_lib.exceptions.ConnectionError()
        
        result = post_issue.post_issue_to_server(
            {"title": "Test", "description": "Desc"}
        )
        
        assert result is None


def test_print_triage_result(capsys):
    """Test triage result printing."""
    result = {
        "label": "bug",
        "priority": "high",
        "labels": ["api", "urgent"],
        "reason": "Crash detected",
        "source": "gemini"
    }
    
    post_issue.print_triage_result(result)
    
    captured = capsys.readouterr()
    assert "BUG" in captured.out
    assert "HIGH" in captured.out
    assert "api" in captured.out
    assert "Crash detected" in captured.out


def run_tests():
    """Run all tests."""
    import tempfile
    
    tests = [
        ("test_load_empty_queue", test_load_empty_queue),
        ("test_save_and_load_queue", test_save_and_load_queue),
        ("test_add_to_queue", test_add_to_queue),
        ("test_get_server_url_default", test_get_server_url_default),
        ("test_get_server_url_from_env", test_get_server_url_from_env),
        ("test_get_auth_headers_no_token", test_get_auth_headers_no_token),
        ("test_get_auth_headers_with_token", test_get_auth_headers_with_token),
        ("test_post_issue_success", test_post_issue_success),
        ("test_post_issue_timeout", test_post_issue_timeout),
        ("test_post_issue_connection_error", test_post_issue_connection_error),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_fn in tests:
        try:
            with tempfile.TemporaryDirectory() as tmp:
                # Check if test needs tmp_path
                import inspect
                sig = inspect.signature(test_fn)
                if "tmp_path" in sig.parameters:
                    test_fn(Path(tmp))
                else:
                    test_fn()
            print(f"✅ PASS: {name}")
            passed += 1
        except Exception as e:
            print(f"❌ FAIL: {name} - {e}")
            failed += 1
    
    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed")
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
