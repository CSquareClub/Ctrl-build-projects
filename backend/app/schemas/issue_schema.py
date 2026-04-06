from typing import Optional, List

class IssueSchema:
    """Schema for validating and serializing Issue data"""
    
    @staticmethod
    def validate_create(data: dict) -> dict:
        """Validate issue creation request"""
        if not data or not isinstance(data, dict):
            raise ValueError("Invalid request data")
        
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        
        if not title:
            raise ValueError("Title is required")
        if not description:
            raise ValueError("Description is required")
        
        return {
            'title': title,
            'description': description,
            'repository': data.get('repository', '').strip() or None,
            'priority': data.get('priority', 'medium').lower(),
            'status': data.get('status', 'open').lower(),
            'labels': data.get('labels', [])
        }
    
    @staticmethod
    def serialize_issue(issue) -> dict:
        """Serialize issue for API response"""
        return {
            'id': issue.id,
            'title': issue.title,
            'description': issue.description,
            'repository': issue.repository,
            'priority': issue.priority,
            'status': issue.status,
            'labels': issue.labels,
            'similarity_score': issue.similarity_score,
            'created_at': issue.created_at.isoformat() if hasattr(issue.created_at, 'isoformat') else str(issue.created_at),
            'updated_at': issue.updated_at.isoformat() if hasattr(issue.updated_at, 'isoformat') else str(issue.updated_at)
        }
    
    @staticmethod
    def serialize_issues(issues: List) -> List[dict]:
        """Serialize multiple issues"""
        return [IssueSchema.serialize_issue(issue) for issue in issues]
