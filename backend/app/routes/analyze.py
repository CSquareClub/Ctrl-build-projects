from fastapi import APIRouter
from app.schemas.issue_schema import IssueInput, AnalysisResponse

router = APIRouter()

@router.post("/", response_model=AnalysisResponse)
async def analyze_issue(issue: IssueInput):
    # This will integrate the classifier, vector, and priority services
    return {
        "label": "bug",
        "priority": "high",
        "similar_issues": [],
        "confidence": {
            "classification": 0.9,
            "priority": 0.8
        }
    }
