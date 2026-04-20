"""ChromaDB Service for vector storage and similarity search"""
import os
from typing import Any, Dict, List, Optional

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    chromadb = None


class ChromaDBService:
    """Service for ChromaDB vector operations"""
    
    def __init__(self, collection_name: str = "issues"):
        self.client = None
        self.collection = None
        self.collection_name = collection_name
        self._initialize()
    
    def _initialize(self):
        """Initialize ChromaDB client and collection"""
        if chromadb is None:
            print("ChromaDB not installed")
            return
        
        try:
            # Use persistent storage in data directory
            persist_dir = os.path.join(
                os.path.dirname(__file__), 
                "..", "..", "data", "chromadb"
            )
            os.makedirs(persist_dir, exist_ok=True)
            
            self.client = chromadb.PersistentClient(
                path=persist_dir,
                settings=Settings(anonymized_telemetry=False)
            )
            
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            
        except Exception as e:
            print(f"Failed to initialize ChromaDB: {e}")
            self.client = None
            self.collection = None
    
    def is_available(self) -> bool:
        """Check if ChromaDB is available"""
        return self.collection is not None
    
    def add_issue(
        self, 
        issue_id: str, 
        embedding: List[float], 
        metadata: Dict[str, Any]
    ) -> bool:
        """Add an issue embedding to the collection"""
        if not self.collection:
            return False
        
        try:
            # Ensure metadata values are compatible with ChromaDB
            safe_metadata = {
                "title": str(metadata.get("title", "")),
                "description": str(metadata.get("description", ""))[:1000],  # Limit length
                "priority": str(metadata.get("priority", "medium")),
                "classification": str(metadata.get("classification", "")),
            }
            
            self.collection.upsert(
                ids=[issue_id],
                embeddings=[embedding],
                metadatas=[safe_metadata]
            )
            return True
        except Exception as e:
            print(f"Error adding issue to ChromaDB: {e}")
            return False
    
    def add_issues_batch(
        self,
        issue_ids: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]]
    ) -> bool:
        """Add multiple issues to the collection"""
        if not self.collection or not issue_ids:
            return False
        
        try:
            safe_metadatas = []
            for meta in metadatas:
                safe_metadatas.append({
                    "title": str(meta.get("title", "")),
                    "description": str(meta.get("description", ""))[:1000],
                    "priority": str(meta.get("priority", "medium")),
                    "classification": str(meta.get("classification", "")),
                })
            
            self.collection.upsert(
                ids=issue_ids,
                embeddings=embeddings,
                metadatas=safe_metadatas
            )
            return True
        except Exception as e:
            print(f"Error adding batch to ChromaDB: {e}")
            return False
    
    def find_similar(
        self, 
        query_embedding: List[float], 
        top_k: int = 3,
        exclude_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Find similar issues based on embedding"""
        if not self.collection:
            return []
        
        try:
            # Query the collection
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(top_k + len(exclude_ids or []), 10),
                include=["metadatas", "distances"]
            )
            
            similar_issues = []
            if results and results.get("ids"):
                ids = results["ids"][0]
                metadatas = results.get("metadatas", [[]])[0]
                distances = results.get("distances", [[]])[0]
                
                for i, issue_id in enumerate(ids):
                    # Skip excluded IDs
                    if exclude_ids and issue_id in exclude_ids:
                        continue
                    
                    # Convert distance to similarity score (cosine distance)
                    # ChromaDB returns cosine distance, convert to similarity
                    similarity = 1 - distances[i] if i < len(distances) else 0
                    
                    metadata = metadatas[i] if i < len(metadatas) else {}
                    similar_issues.append({
                        "id": issue_id,
                        "title": metadata.get("title", ""),
                        "score": round(similarity, 4),
                        "priority": metadata.get("priority", "medium")
                    })
                    
                    if len(similar_issues) >= top_k:
                        break
            
            return similar_issues
            
        except Exception as e:
            print(f"Error finding similar issues: {e}")
            return []
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics"""
        if not self.collection:
            return {"available": False, "count": 0}
        
        try:
            return {
                "available": True,
                "count": self.collection.count(),
                "name": self.collection_name
            }
        except Exception as e:
            return {"available": False, "error": str(e)}
    
    def delete_issue(self, issue_id: str) -> bool:
        """Delete an issue from the collection"""
        if not self.collection:
            return False
        
        try:
            self.collection.delete(ids=[issue_id])
            return True
        except Exception as e:
            print(f"Error deleting from ChromaDB: {e}")
            return False


# Global instance
_chromadb_service: Optional[ChromaDBService] = None


def get_chromadb_service() -> ChromaDBService:
    """Get the global ChromaDB service instance"""
    global _chromadb_service
    if _chromadb_service is None:
        _chromadb_service = ChromaDBService()
    return _chromadb_service
