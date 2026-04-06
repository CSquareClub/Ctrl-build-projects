"""Issue storage utility for managing issue data"""
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

class IssueStorage:
    """Simple storage for issues using JSON files"""
    
    def __init__(self, storage_path: str = None):
        """Initialize issue storage"""
        if storage_path is None:
            storage_path = os.path.join(
                os.path.dirname(__file__), 
                '../../data/issues.json'
            )
        self.storage_path = storage_path
        self.issues = []
        self.load_issues()
    
    def load_issues(self) -> List[Dict[str, Any]]:
        """Load issues from storage"""
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    self.issues = json.load(f)
            return self.issues
        except Exception as e:
            print(f"Error loading issues: {e}")
            return []
    
    def save_issues(self) -> bool:
        """Save issues to storage"""
        try:
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(self.issues, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving issues: {e}")
            return False
    
    def add_issue(self, issue: Dict[str, Any]) -> bool:
        """Add a new issue"""
        try:
            issue['created_at'] = datetime.utcnow().isoformat()
            self.issues.append(issue)
            return self.save_issues()
        except Exception as e:
            print(f"Error adding issue: {e}")
            return False
    
    def get_all_issues(self) -> List[Dict[str, Any]]:
        """Get all issues"""
        return self.issues
    
    def get_issue_by_id(self, issue_id: str) -> Optional[Dict[str, Any]]:
        """Get issue by ID"""
        for issue in self.issues:
            if issue.get('id') == issue_id:
                return issue
        return None
    
    def update_issue(self, issue_id: str, issue_data: Dict[str, Any]) -> bool:
        """Update an issue"""
        for i, issue in enumerate(self.issues):
            if issue.get('id') == issue_id:
                self.issues[i].update(issue_data)
                return self.save_issues()
        return False
    
    def delete_issue(self, issue_id: str) -> bool:
        """Delete an issue"""
        self.issues = [issue for issue in self.issues if issue.get('id') != issue_id]
        return self.save_issues()
