from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ConfidenceScores(BaseModel):
    classification: float = Field(..., ge=0.0, le=1.0)
    priority: float = Field(..., ge=0.0, le=1.0)

class SimilarIssue(BaseModel):
    id: Optional[str] = None
    title: str
    similarity: float = Field(..., ge=0.0, le=1.0)

class IssueInput(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="The title of the GitHub issue")
    description: str = Field(..., description="The details and markdown body of the issue")

class AnalysisResponse(BaseModel):
    label: str = Field(..., description="Classification category (e.g., bug, feature, question)")
    priority: str = Field(..., description="Calculated priority (e.g., high, medium, low)")
    similar_issues: List[SimilarIssue] = Field(default_factory=list)
    confidence: ConfidenceScores
