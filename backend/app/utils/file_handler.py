import json
import os
from typing import List, Optional

class FileHandler:
    """Handle file operations for the backend"""
    
    @staticmethod
    def load_json(filepath: str) -> dict:
        """Load JSON file"""
        if not os.path.exists(filepath):
            return {}
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading JSON from {filepath}: {e}")
            return {}
    
    @staticmethod
    def save_json(filepath: str, data: dict) -> bool:
        """Save data to JSON file"""
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except IOError as e:
            print(f"Error saving JSON to {filepath}: {e}")
            return False
    
    @staticmethod
    def load_issues(filepath: str) -> List[dict]:
        """Load issues from JSON file"""
        data = FileHandler.load_json(filepath)
        return data.get('issues', []) if isinstance(data, dict) else []
    
    @staticmethod
    def save_issues(filepath: str, issues: List[dict]) -> bool:
        """Save issues to JSON file"""
        data = {'issues': issues}
        return FileHandler.save_json(filepath, data)
    
    @staticmethod
    def file_exists(filepath: str) -> bool:
        """Check if file exists"""
        return os.path.exists(filepath)
    
    @staticmethod
    def get_file_size(filepath: str) -> int:
        """Get file size in bytes"""
        if os.path.exists(filepath):
            return os.path.getsize(filepath)
        return 0
