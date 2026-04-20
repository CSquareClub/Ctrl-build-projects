"""Gemini Service for embeddings"""
import json
import os
from typing import List, Optional
from urllib import error, request


class GeminiEmbeddingService:
    """Service for Gemini API embeddings"""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
    
    def is_available(self) -> bool:
        """Check if Gemini embedding service is available"""
        return bool(self.api_key)
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using Gemini"""
        if not self.api_key:
            return None
        
        try:
            endpoint = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent"
                f"?key={self.api_key}"
            )
            
            body = {
                "model": f"models/{self.model}",
                "content": {
                    "parts": [{"text": text}]
                }
            }
            
            payload_bytes = json.dumps(body).encode("utf-8")
            req = request.Request(
                endpoint,
                data=payload_bytes,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            
            with request.urlopen(req, timeout=15) as response:
                response_data = json.loads(response.read().decode("utf-8"))
            
            embedding = response_data.get("embedding", {}).get("values", [])
            return embedding if embedding else None
            
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            return None
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not self.api_key or not texts:
            return []
        
        embeddings = []
        for text in texts:
            emb = self.generate_embedding(text)
            if emb:
                embeddings.append(emb)
        return embeddings


# Global instance
_gemini_embedding_service: Optional[GeminiEmbeddingService] = None


def get_gemini_embedding_service() -> GeminiEmbeddingService:
    """Get the global Gemini embedding service instance"""
    global _gemini_embedding_service
    if _gemini_embedding_service is None:
        _gemini_embedding_service = GeminiEmbeddingService()
    return _gemini_embedding_service
