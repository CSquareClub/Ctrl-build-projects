"""Conflicts detection route for comparing code snippets"""
import difflib
from typing import List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

router = APIRouter()


class ConflictInput(BaseModel):
    """Input for conflict detection"""
    code_a: str = Field(..., description="First code snippet")
    code_b: str = Field(..., description="Second code snippet")


class ConflictResponse(BaseModel):
    """Response for conflict detection"""
    conflicts: List[str] = Field(default_factory=list, description="List of conflicting lines")
    summary: str = Field(..., description="Summary of differences")


def detect_conflicts(code_a: str, code_b: str) -> dict:
    """
    Compare two code snippets and detect differences.
    Uses difflib for simple text comparison.
    """
    lines_a = code_a.splitlines(keepends=True)
    lines_b = code_b.splitlines(keepends=True)
    
    # Get unified diff
    diff = list(difflib.unified_diff(
        lines_a, 
        lines_b, 
        fromfile='code_a', 
        tofile='code_b',
        lineterm=''
    ))
    
    conflicts = []
    additions = 0
    deletions = 0
    
    for line in diff:
        if line.startswith('---') or line.startswith('+++'):
            continue
        if line.startswith('-') and not line.startswith('---'):
            conflicts.append(f"Removed: {line[1:].strip()}")
            deletions += 1
        elif line.startswith('+') and not line.startswith('+++'):
            conflicts.append(f"Added: {line[1:].strip()}")
            additions += 1
    
    # Calculate similarity ratio
    similarity = difflib.SequenceMatcher(None, code_a, code_b).ratio()
    
    # Generate summary
    if not conflicts:
        summary = "No differences found. The code snippets are identical."
    elif similarity > 0.9:
        summary = f"Minor differences: {additions} additions, {deletions} deletions. Code is {similarity*100:.1f}% similar."
    elif similarity > 0.5:
        summary = f"Moderate differences: {additions} additions, {deletions} deletions. Code is {similarity*100:.1f}% similar."
    else:
        summary = f"Significant differences: {additions} additions, {deletions} deletions. Code is only {similarity*100:.1f}% similar."
    
    return {
        "conflicts": conflicts[:50],  # Limit to 50 conflicts
        "summary": summary,
        "stats": {
            "additions": additions,
            "deletions": deletions,
            "similarity": round(similarity, 4),
            "lines_a": len(lines_a),
            "lines_b": len(lines_b)
        }
    }


@router.post("/", response_model=ConflictResponse)
async def analyze_conflicts(data: ConflictInput):
    """
    Compare two code snippets and detect conflicts/differences.
    
    Returns a list of conflicting lines and a summary of differences.
    """
    if not data.code_a.strip() and not data.code_b.strip():
        raise HTTPException(
            status_code=400,
            detail="At least one code snippet must be non-empty"
        )
    
    try:
        result = detect_conflicts(data.code_a, data.code_b)
        return ConflictResponse(
            conflicts=result["conflicts"],
            summary=result["summary"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing conflicts: {str(e)}")


@router.post("/detailed")
async def analyze_conflicts_detailed(data: ConflictInput):
    """
    Compare two code snippets with detailed statistics.
    """
    if not data.code_a.strip() and not data.code_b.strip():
        raise HTTPException(
            status_code=400,
            detail="At least one code snippet must be non-empty"
        )
    
    try:
        result = detect_conflicts(data.code_a, data.code_b)
        return {
            "success": True,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing conflicts: {str(e)}")
