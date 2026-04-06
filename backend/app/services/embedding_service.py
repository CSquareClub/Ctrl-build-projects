from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Tuple

class EmbeddingService:
    """Service for generating text embeddings"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize embedding service with a pre-trained model"""
        try:
            self.model = SentenceTransformer(model_name)
            self.model_name = model_name
        except Exception as e:
            print(f"Error loading embedding model: {e}")
            self.model = None
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        if not self.model or not text:
            return []
        
        try:
            embedding = self.model.encode(text, convert_to_tensor=False)
            return embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []
    
    def generate_combined_embedding(self, title: str, description: str = "") -> List[float]:
        """Generate combined embedding for title and description"""
        combined_text = f"{title} {description}".strip()
        return self.generate_embedding(combined_text)
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not self.model or not texts:
            return []
        
        try:
            embeddings = self.model.encode(texts, convert_to_tensor=False)
            return [emb.tolist() if hasattr(emb, 'tolist') else list(emb) for emb in embeddings]
        except Exception as e:
            print(f"Error generating batch embeddings: {e}")
            return []
    
    def cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        if not embedding1 or not embedding2:
            return 0.0
        
        try:
            arr1 = np.array(embedding1)
            arr2 = np.array(embedding2)
            
            dot_product = np.dot(arr1, arr2)
            norm1 = np.linalg.norm(arr1)
            norm2 = np.linalg.norm(arr2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return 0.0
    
    def get_model_info(self) -> dict:
        """Get information about the embedding model"""
        return {
            'model_name': self.model_name,
            'model_loaded': self.model is not None,
            'embedding_dimension': self.model.get_sentence_embedding_dimension() if self.model else 0
        }


# Global embedding service instance
_embedding_service_instance = None

def get_embedding_service(model_name: str = "all-MiniLM-L6-v2") -> EmbeddingService:
    """Get the global embedding service instance"""
    global _embedding_service_instance
    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService(model_name)
    return _embedding_service_instance
