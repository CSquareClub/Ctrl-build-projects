from typing import List
import re

class PriorityService:
    """Service for determining issue priority"""
    
    # Keywords indicating different priority levels
    CRITICAL_KEYWORDS = ['crash', 'down', 'broken', 'urgent', 'critical', 'emergency', 'security', 'data loss']
    HIGH_KEYWORDS = ['bug', 'error', 'fail', 'performance', 'slow', 'regression', 'blocker']
    MEDIUM_KEYWORDS = ['issue', 'problem', 'feature', 'improve', 'enhancement']
    LOW_KEYWORDS = ['typo', 'documentation', 'minor', 'trivial', 'nice-to-have']
    
    @classmethod
    def determine_priority(cls, title: str, description: str = "") -> str:
        """Determine priority based on keywords and patterns"""
        text = f"{title} {description}".lower()
        
        # Check for critical indicators
        for keyword in cls.CRITICAL_KEYWORDS:
            if keyword in text:
                return 'critical'
        
        # Check for high priority indicators
        for keyword in cls.HIGH_KEYWORDS:
            if keyword in text:
                return 'high'
        
        # Check for low priority indicators
        for keyword in cls.LOW_KEYWORDS:
            if keyword in text:
                return 'low'
        
        # Default to medium
        return 'medium'
    
    @classmethod
    def get_priority_score(cls, title: str, description: str = "") -> float:
        """Get numeric priority score (0-1, where 1 is highest priority)"""
        priority = cls.determine_priority(title, description)
        
        priority_map = {
            'low': 0.25,
            'medium': 0.50,
            'high': 0.75,
            'critical': 1.0
        }
        
        return priority_map.get(priority, 0.5)
    
    @classmethod
    def extract_priority_indicators(cls, text: str) -> List[str]:
        """Extract priority-related keywords from text"""
        text_lower = text.lower()
        indicators = []
        
        all_keywords = {
            'critical': cls.CRITICAL_KEYWORDS,
            'high': cls.HIGH_KEYWORDS,
            'medium': cls.MEDIUM_KEYWORDS,
            'low': cls.LOW_KEYWORDS
        }
        
        for priority, keywords in all_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    indicators.append(f"{keyword}({priority})")
        
        return indicators
    
    @classmethod
    def prioritize_issues(cls, issues: List[dict]) -> List[dict]:
        """Prioritize a list of issues"""
        for issue in issues:
            priority = cls.determine_priority(
                issue.get('title', ''),
                issue.get('description', '')
            )
            issue['priority'] = priority
        
        # Sort by priority (critical first)
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        issues.sort(key=lambda x: priority_order.get(x.get('priority', 'medium'), 2))
        
        return issues


def assign_priority(label: str, title: str, description: str = "") -> tuple:
    """Assign priority and confidence score based on label and text content
    
    Returns:
        tuple: (priority, confidence) where priority is str and confidence is float
    """
    priority = PriorityService.determine_priority(title, description)
    
    # Adjust confidence based on whether keywords were found
    text = f"{title} {description}".lower()
    
    # High confidence if strong keywords found
    if any(kw in text for kw in PriorityService.CRITICAL_KEYWORDS):
        confidence = 0.95
    elif any(kw in text for kw in PriorityService.HIGH_KEYWORDS):
        confidence = 0.85
    elif any(kw in text for kw in PriorityService.LOW_KEYWORDS):
        confidence = 0.8
    else:
        confidence = 0.6
    
    return priority, confidence
