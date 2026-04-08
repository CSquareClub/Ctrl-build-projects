from pathlib import Path
import unittest
from unittest.mock import patch

try:
    from . import ai_pipeline as pipeline
except ImportError:
    import ai_pipeline as pipeline


FAKE_TEMPLATE_TEXT = """First Name Last Name
123 Maple Dr. 617-555-1234
Anywhere, MA 02116 email@email.com
Profile
This is where you write what work you'd like to do and what motivates you.
Experience
Describe the tasks and responsibilities of the job.
Be specific and use numbers to show growth or accomplishments.
List your jobs in reverse chronological order starting with most recent.
Use bullet points, but don't end your sentence with punctuation.
Include volunteer or internships that you've had that might be relevant to the job.
Interest
Other interests you might have that give them an idea of who you are.
"""

JOB_DESCRIPTION = (
    "Looking for a Python developer with experience in SQL, machine learning, "
    "React, APIs, and AWS."
)


class _FakeGoogleEmbedding:
    def __init__(self, values):
        self.values = values


class _FakeGoogleEmbeddingResponse:
    def __init__(self, embeddings):
        self.embeddings = embeddings


class _FakeGoogleGenerationResponse:
    def __init__(self, text="", parsed=None):
        self.text = text
        self.parsed = parsed


class _FakeGoogleModels:
    def embed_content(self, model, contents, config=None):
        chunks = [contents] if isinstance(contents, str) else list(contents)
        joined_text = " ".join(chunks).lower()
        if "looking for a python developer" in joined_text:
            vector = [0.9, 0.1, 0.0]
        else:
            vector = [1.0, 0.0, 0.0]

        return _FakeGoogleEmbeddingResponse(
            [_FakeGoogleEmbedding(vector) for _ in chunks]
        )

    def generate_content(self, model, contents, config=None):
        return _FakeGoogleGenerationResponse(
            parsed={
                "summary": (
                    "Candidate shows strong Python, SQL, and machine learning "
                    "experience for this role."
                ),
                "skills": ["python", "sql", "machine learning", "aws"],
                "missing_skills": ["kubernetes"],
            }
        )


class _FakeGoogleClient:
    def __init__(self):
        self.models = _FakeGoogleModels()


class AnalyzeResumeTests(unittest.TestCase):
    def test_fake_template_resume_is_blocked_from_ranking(self):
        with (
            patch.object(
                pipeline,
                "extract_text_from_pdf",
                return_value=FAKE_TEMPLATE_TEXT,
            ),
            patch.object(pipeline, "_load_google_client", return_value=None),
            patch.object(pipeline, "_load_embedding_model", return_value=None),
        ):
            result = pipeline.analyze_resume("fake.pdf", JOB_DESCRIPTION)

        self.assertTrue(result["is_fake"])
        self.assertEqual("fake", result["resume_status"])
        self.assertFalse(result["ranked"])
        self.assertEqual(0.0, result["match_score"])
        self.assertEqual(0.0, result["final_score"])
        self.assertGreaterEqual(
            result["authenticity_score"],
            pipeline.FAKE_RESUME_THRESHOLD,
        )
        self.assertTrue(
            any(
                "placeholder" in reason.lower() or "template" in reason.lower()
                for reason in result["authenticity_reasons"]
            )
        )

    def test_real_resume_is_ranked(self):
        sample_pdf = Path(__file__).with_name("sample_resume.pdf")

        with (
            patch.object(pipeline, "_load_google_client", return_value=None),
            patch.object(pipeline, "_load_embedding_model", return_value=None),
        ):
            result = pipeline.analyze_resume(str(sample_pdf), JOB_DESCRIPTION)

        self.assertFalse(result["is_fake"])
        self.assertEqual("real", result["resume_status"])
        self.assertTrue(result["ranked"])
        self.assertGreater(result["match_score"], 0.0)
        self.assertGreater(result["final_score"], 0.0)
        self.assertIn("python", result["skills"])
        self.assertIn("sql", result["skills"])

    def test_analyze_resume_bytes_supports_backend_uploads(self):
        sample_pdf = Path(__file__).with_name("sample_resume.pdf")
        file_bytes = sample_pdf.read_bytes()

        with (
            patch.object(pipeline, "_load_google_client", return_value=None),
            patch.object(pipeline, "_load_embedding_model", return_value=None),
        ):
            result = pipeline.analyze_resume_bytes(
                file_bytes,
                JOB_DESCRIPTION,
                filename="candidate_resume.pdf",
            )

        self.assertFalse(result["is_fake"])
        self.assertEqual("real", result["resume_status"])
        self.assertTrue(result["ranked"])
        self.assertGreater(result["match_score"], 0.0)

    def test_analyze_resume_bytes_rejects_non_pdf_uploads(self):
        result = pipeline.analyze_resume_bytes(
            b"plain-text",
            JOB_DESCRIPTION,
            filename="notes.txt",
        )

        self.assertFalse(result["ranked"])
        self.assertEqual("unknown", result["resume_status"])
        self.assertIn("Uploaded file must be a PDF.", result["fraud_reasons"])

    def test_google_api_is_used_for_resume_analysis_and_ranking(self):
        sample_pdf = Path(__file__).with_name("sample_resume.pdf")
        google_job_description = f"{JOB_DESCRIPTION} Kubernetes experience is required."

        with (
            patch.object(
                pipeline,
                "_load_google_client",
                return_value=_FakeGoogleClient(),
            ),
            patch.object(pipeline, "_load_embedding_model", return_value=None),
        ):
            result = pipeline.analyze_resume(str(sample_pdf), google_job_description)

        self.assertFalse(result["is_fake"])
        self.assertEqual("google", result["ai_provider"])
        self.assertGreater(result["match_score"], 0.8)
        self.assertIn("aws", result["skills"])
        self.assertIn("kubernetes", result["missing_skills"])
        self.assertIn("strong Python", result["explanation"])


if __name__ == "__main__":
    unittest.main()
