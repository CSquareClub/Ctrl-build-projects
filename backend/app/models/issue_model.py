from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List

@dataclass
class Issue:
    """Issue model representing a GitHub/Gitlab issue"""
    id: str
    title: str
    description: str
    repository: Optional[str] = None
    priority: str = "medium"  # low, medium, high, critical
    status: str = "open"  # open, closed, in_progress
    labels: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    embedding: Optional[List[float]] = None
    similarity_score: Optional[float] = None
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'repository': self.repository,
            'priority': self.priority,
            'status': self.status,
            'labels': self.labels,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create Issue from dictionary"""
        return cls(
            id=data.get('id'),
            title=data.get('title'),
            description=data.get('description'),
            repository=data.get('repository'),
            priority=data.get('priority', 'medium'),
            status=data.get('status', 'open'),
            labels=data.get('labels', []),
            created_at=datetime.fromisoformat(data.get('created_at', datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data.get('updated_at', datetime.now().isoformat()))
        )
