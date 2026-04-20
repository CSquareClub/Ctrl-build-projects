try:
    import faiss
except ImportError:
    faiss = None

import numpy as np
from typing import List, Tuple, Optional
import os
import json

class VectorService:
    """Service for managing FAISS vector index"""
    
    def __init__(self, index_path: str, embedding_dim: int = 384):
        """Initialize vector service"""
        self.index_path = index_path
        self.embedding_dim = embedding_dim
        self.index = None
        self.issue_ids = []
        if faiss is not None:
            self.load_or_create_index()
    
    def load_or_create_index(self) -> bool:
        """Load existing index or create new one"""
        if faiss is None:
            return False
        try:
            if os.path.exists(self.index_path):
                self.index = faiss.read_index(self.index_path)
                # Load issue IDs mapping
                mapping_file = self.index_path.replace('.index', '_mapping.json')
                if os.path.exists(mapping_file):
                    with open(mapping_file, 'r') as f:
                        self.issue_ids = json.load(f)
                return True
            else:
                # Create new index
                self.index = faiss.IndexFlatL2(self.embedding_dim)
                return True
        except Exception as e:
            print(f"Error loading/creating index: {e}")
            if faiss is not None:
                self.index = faiss.IndexFlatL2(self.embedding_dim)
            return False
    
    def add_vectors(self, embeddings: List[List[float]], issue_ids: List[str]) -> bool:
        """Add vectors to index"""
        try:
            if not embeddings or not issue_ids or len(embeddings) != len(issue_ids):
                return False
            
            X = np.array(embeddings, dtype=np.float32)
            self.index.add(X)
            self.issue_ids.extend(issue_ids)
            return True
        except Exception as e:
            print(f"Error adding vectors: {e}")
            return False
    
    def search(self, query_embedding: List[float], k: int = 5) -> List[Tuple[str, float]]:
        """Search for similar vectors"""
        try:
            if not self.index or self.index.ntotal == 0:
                return []
            
            X = np.array([query_embedding], dtype=np.float32)
            distances, indices = self.index.search(X, min(k, self.index.ntotal))
            
            results = []
            for idx, distance in zip(indices[0], distances[0]):
                if idx < len(self.issue_ids):
                    # Convert L2 distance to similarity score (0-1)
                    similarity = 1 / (1 + distance)
                    results.append((self.issue_ids[int(idx)], float(similarity)))
            
            return results
        except Exception as e:
            print(f"Error searching vectors: {e}")
            return []
    
    def save_index(self) -> bool:
        """Save index to disk"""
        try:
            os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
            faiss.write_index(self.index, self.index_path)
            
            # Save issue IDs mapping
            mapping_file = self.index_path.replace('.index', '_mapping.json')
            with open(mapping_file, 'w') as f:
                json.dump(self.issue_ids, f)
            
            return True
        except Exception as e:
            print(f"Error saving index: {e}")
            return False
    
    def get_index_info(self) -> dict:
        """Get index information"""
        return {
            'total_vectors': self.index.ntotal if self.index else 0,
            'embedding_dimension': self.embedding_dim,
            'index_path': self.index_path,
            'is_loaded': self.index is not None
        }


def find_similar_issues(query_embedding: np.ndarray, issues: List[dict], top_k: int = 5) -> List[dict]:
    """Find similar issues to a query embedding
    
    Args:
        query_embedding: The embedding vector for the query
        issues: List of issue dictionaries with 'title' and 'description'
        top_k: Number of similar issues to return
        
    Returns:
        List of similar issues with similarity scores
    """
    from app.services.embedding_service import get_embedding_service
    
    if not issues:
        return []
    
    embedding_service = get_embedding_service()
    
    # Generate embeddings for all issues
    similar_results = []
    
    for issue in issues:
        try:
            title = issue.get('title', '')
            description = issue.get('description', '')
            
            if not title and not description:
                continue
            
            # Generate embedding for this issue
            issue_embedding = embedding_service.generate_embedding(f"{title} {description}")
            
            if not issue_embedding:
                continue
            
            # Calculate similarity
            similarity = embedding_service.cosine_similarity(
                query_embedding.tolist() if hasattr(query_embedding, 'tolist') else query_embedding,
                issue_embedding
            )
            
            result = issue.copy()
            result['similarity_score'] = similarity
            similar_results.append(result)
        except Exception as e:
            print(f"Error processing issue: {e}")
            continue
    
    # Sort by similarity score and return top_k
    similar_results.sort(key=lambda x: x['similarity_score'], reverse=True)
    # Strip embedding from results to keep response lean
    for r in similar_results:
        r.pop('embedding', None)
    return similar_results[:top_k]
