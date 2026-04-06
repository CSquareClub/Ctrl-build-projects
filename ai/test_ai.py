from pathlib import Path

from ai_pipeline import analyze_resume


sample_pdf = Path(__file__).with_name("sample_resume.pdf")
result = analyze_resume(str(sample_pdf), "Looking for python developer")

print(result)
