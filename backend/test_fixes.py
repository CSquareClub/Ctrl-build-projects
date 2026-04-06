import asyncio
import tempfile
import threading
from pathlib import Path

import numpy as np
from fastapi import HTTPException

from app.routes import analyze as analyze_route
from app.routes import issues as issues_route
from app.schemas.issue_schema import IssueSchema
from app.services.vector_service import VectorService
from app.utils.issue_storage import IssueStorage


class FakeEmbeddingService:
    def __init__(self, dim: int = 3):
        self.dim = dim

    def get_embedding_dimension(self) -> int:
        return self.dim

    def generate_combined_embedding(self, title: str, description: str) -> np.ndarray:
        seed = float((len(title) + len(description)) % 7)
        return np.array([1.0 + seed, 2.0 + seed, 3.0 + seed], dtype=np.float32)


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def test_persistent_storage() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        issues_file = Path(tmp) / "issues.json"
        storage = IssueStorage(issues_file)
        issue = {
            "id": "issue-1",
            "title": "Persistent bug",
            "description": "Data should survive restart",
            "repository": "demo/repo",
            "priority": "high",
            "status": "open",
            "labels": ["bug"],
        }
        storage.add_issue(issue)

        reloaded = IssueStorage(issues_file)
        loaded_issue = reloaded.get_issue("issue-1")
        _assert(loaded_issue is not None, "Issue should exist after reload")
        _assert(loaded_issue["title"] == "Persistent bug", "Issue content should persist")


def test_validation_and_priority_filter() -> None:
    try:
        IssueSchema.validate_update({"priority": "urgent"})
    except ValueError as exc:
        _assert("Invalid priority" in str(exc), "Expected invalid priority validation error")
    else:
        raise AssertionError("validate_update should reject invalid priority")

    with tempfile.TemporaryDirectory() as tmp:
        issues_route.issue_storage = IssueStorage(Path(tmp) / "issues.json")
        try:
            asyncio.run(issues_route.get_issues_by_priority("urgent"))
        except HTTPException as exc:
            _assert(exc.status_code == 400, "Invalid priority filter should return 400")
        else:
            raise AssertionError("Priority endpoint should reject invalid values")


def test_batch_error_handling() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        analyze_route.embedding_service = FakeEmbeddingService()
        analyze_route.issue_storage = IssueStorage(Path(tmp) / "issues.json")

        payload = [
            {
                "title": "Login failure",
                "description": "Users cannot login",
                "repository": "demo/repo",
                "status": "open",
                "labels": ["bug"],
            },
            {
                "title": "",
                "description": "This is invalid because title is empty",
                "repository": "demo/repo",
            },
        ]

        response = asyncio.run(analyze_route.analyze_batch(payload))
        _assert(response["success"] == "partial", "Batch should return partial on mixed validity")
        _assert(response["analyzed_count"] == 1, "One issue should be analyzed")
        _assert(response["failed_count"] == 1, "One issue should fail validation")
        _assert(len(response["failed_items"]) == 1, "Failed item details should be present")


def test_embedding_dimension_validation() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        fake_embedding_service = FakeEmbeddingService(dim=3)
        vector_service = VectorService(
            str(Path(tmp) / "faiss_index.index"),
            embedding_service=fake_embedding_service,
        )

        _assert(
            vector_service.add_vectors([[1.0, 0.0, 0.0]], ["issue-1"]),
            "Valid vector should be added",
        )

        try:
            vector_service.add_vectors([[1.0, 0.0]], ["issue-2"])
        except ValueError as exc:
            _assert("Embedding dimension mismatch" in str(exc), "Expected dimension mismatch error")
        else:
            raise AssertionError("Dimension mismatch should raise ValueError")


def test_thread_safety() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        fake_embedding_service = FakeEmbeddingService(dim=3)
        vector_service = VectorService(
            str(Path(tmp) / "threadsafe.index"),
            embedding_service=fake_embedding_service,
        )

        errors = []

        def worker(index: int) -> None:
            try:
                value = float((index % 5) + 1)
                vector = [value, value + 1.0, value + 2.0]
                vector_service.add_vectors([vector], [f"issue-{index}"])
                vector_service.search(vector, k=2)
            except Exception as exc:
                errors.append(str(exc))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(20)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        _assert(not errors, f"No thread operation should fail: {errors}")
        _assert(len(vector_service.issue_ids) == 20, "All vectors should be added safely")


def run_all_tests() -> None:
    tests = [
        test_persistent_storage,
        test_validation_and_priority_filter,
        test_batch_error_handling,
        test_embedding_dimension_validation,
        test_thread_safety,
    ]

    for test in tests:
        test()
        print(f"PASS: {test.__name__}")


if __name__ == "__main__":
    run_all_tests()
    print("All fix validation tests passed.")
