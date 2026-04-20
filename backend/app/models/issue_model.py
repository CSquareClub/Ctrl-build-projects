from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class Issue:
	id: str
	title: str
	description: str
	repository: str
	priority: str = "medium"
	status: str = "open"
	labels: List[str] = field(default_factory=list)
	embedding: Optional[List[float]] = None
	created_at: datetime = field(default_factory=datetime.now)
	updated_at: datetime = field(default_factory=datetime.now)

	def to_dict(self) -> Dict[str, Any]:
		return {
			"id": self.id,
			"title": self.title,
			"description": self.description,
			"repository": self.repository,
			"priority": self.priority,
			"status": self.status,
			"labels": self.labels,
			"embedding": self.embedding,
			"created_at": self.created_at.isoformat(),
			"updated_at": self.updated_at.isoformat(),
		}

	@classmethod
	def from_dict(cls, data: Dict[str, Any]) -> "Issue":
		"""Create Issue from dictionary."""
		try:
			created_at = datetime.fromisoformat(data.get("created_at", datetime.now().isoformat()))
		except (ValueError, TypeError):
			print("Warning: Invalid created_at format, using current time")
			created_at = datetime.now()

		try:
			updated_at = datetime.fromisoformat(data.get("updated_at", datetime.now().isoformat()))
		except (ValueError, TypeError):
			print("Warning: Invalid updated_at format, using current time")
			updated_at = datetime.now()

		return cls(
			id=data.get("id", ""),
			title=data.get("title", ""),
			description=data.get("description", ""),
			repository=data.get("repository", "unknown"),
			priority=data.get("priority", "medium"),
			status=data.get("status", "open"),
			labels=data.get("labels", []),
			embedding=data.get("embedding"),
			created_at=created_at,
			updated_at=updated_at,
		)
