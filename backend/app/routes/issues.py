"""Issues routes for FastAPI"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import uuid

from app.services.priority_service import PriorityService

router = APIRouter()

# In-memory storage for demo
issues_store: Dict[str, Dict[str, Any]] = {}

@router.get("/")
async def get_issues() -> Dict[str, Any]:
    """Get all issues"""
    try:
        issues_list = list(issues_store.values())
        return {
            'success': True,
            'count': len(issues_list),
            'issues': issues_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{issue_id}")
async def get_issue(issue_id: str) -> Dict[str, Any]:
    """Get a specific issue"""
    if issue_id not in issues_store:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    return {
        'success': True,
        'issue': issues_store[issue_id]
    }

@router.post("/")
async def create_issue(title: str, description: str = "", **kwargs) -> Dict[str, Any]:
    """Create a new issue"""
    try:
        issue_id = str(uuid.uuid4())
        
        # Determine priority
        priority = PriorityService.determine_priority(title, description)
        
        issue = {
            'id': issue_id,
            'title': title,
            'description': description,
            'priority': priority,
            'status': 'open'
        }
        
        issues_store[issue_id] = issue
        
        return {
            'success': True,
            'issue': issue
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{issue_id}")
async def update_issue(issue_id: str, title: str = None, description: str = None, status: str = None) -> Dict[str, Any]:
    """Update an issue"""
    if issue_id not in issues_store:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    try:
        if title:
            issues_store[issue_id]['title'] = title
        if description:
            issues_store[issue_id]['description'] = description
        if status:
            issues_store[issue_id]['status'] = status
        
        return {
            'success': True,
            'issue': issues_store[issue_id]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{issue_id}")
async def delete_issue(issue_id: str) -> Dict[str, Any]:
    """Delete an issue"""
    if issue_id not in issues_store:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    try:
        del issues_store[issue_id]
        return {
            'success': True,
            'message': 'Issue deleted'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/priority/{priority}")
async def get_issues_by_priority(priority: str) -> Dict[str, Any]:
    """Get issues filtered by priority"""
    try:
        filtered_issues = [
            issue for issue in issues_store.values()
            if issue.get('priority') == priority
        ]
        
        return {
            'success': True,
            'priority': priority,
            'count': len(filtered_issues),
            'issues': filtered_issues
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
