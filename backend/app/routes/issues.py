from typing import List
from fastapi import APIRouter, HTTPException
from uuid import uuid4

from app.models.issue_model import Issue
from app.schemas.issue_schema import IssueSchema
from app.utils.issue_storage import IssueStorage

router = APIRouter()
issue_storage = IssueStorage()

@router.get("/")
async def get_issues():
    """Get all issues"""
    try:
        issues_list = issue_storage.get_all_issues()
        return {
            'success': True,
            'count': len(issues_list),
            'issues': issues_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{issue_id}")
async def get_issue(issue_id: str):
    """Get a specific issue"""
    try:
        issue = issue_storage.get_issue(issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        return {
            'success': True,
            'issue': issue
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_issue(issue_data: dict):
    """Create a new issue"""
    try:
        # Validate input
        validated_data = IssueSchema.validate_create(issue_data)
        
        # Create issue
        issue = Issue(
            id=str(uuid4()),
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            repository=validated_data.get('repository', 'unknown'),
            priority=validated_data.get('priority', 'medium'),
            status=validated_data.get('status', 'open'),
            labels=validated_data.get('labels', [])
        )
        
        # Store issue
        issue_storage.add_issue(issue.to_dict())
        
        return {
            'success': True,
            'message': 'Issue created successfully',
            'issue': issue.to_dict()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.put("/{issue_id}")
async def update_issue(issue_id: str, issue_data: dict):
    """Update an issue"""
    try:
        if not issue_storage.get_issue(issue_id):
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Update issue
        success = issue_storage.update_issue(issue_id, issue_data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update issue")
        
        updated_issue = issue_storage.get_issue(issue_id)
        
        return {
            'success': True,
            'message': 'Issue updated successfully',
            'issue': updated_issue
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{issue_id}")
async def delete_issue(issue_id: str):
    """Delete an issue"""
    try:
        if not issue_storage.get_issue(issue_id):
            raise HTTPException(status_code=404, detail="Issue not found")
        
        success = issue_storage.delete_issue(issue_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete issue")
        
        return {
            'success': True,
            'message': 'Issue deleted successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/priority/{priority}")
async def get_issues_by_priority(priority: str):
    """Get issues filtered by priority"""
    try:
        all_issues = issue_storage.get_all_issues()
        filtered_issues = [
            issue for issue in all_issues
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
