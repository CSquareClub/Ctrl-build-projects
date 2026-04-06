"""Similar issues routes for FastAPI"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.embedding_service import get_embedding_service
from app.services.vector_service import get_vector_service
from app.config.settings import config

router = APIRouter()

class SimilarQuery(BaseModel):
    """Model for similar issues query"""
    text: str
    top_k: int = 5

@router.post("/")
async def find_similar_issues(query: SimilarQuery) -> Dict[str, Any]:
    """Find similar issues based on text"""
    try:
        embedding_service = get_embedding_service()
        vector_service = get_vector_service()
        
        # Generate embedding for query
        query_embedding = embedding_service.generate_embedding(query.text)
        
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")
        
        # Search for similar issues
        similar_issues = vector_service.search(query_embedding, k=query.top_k)
        
        return {
            'success': True,
            'query': query.text,
            'similar_count': len(similar_issues),
            'similar_issues': [
                {
                    'issue_id': issue_id,
                    'similarity': float(similarity)
                }
                for issue_id, similarity in similar_issues
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{issue_id}")
async def get_similar_by_id(issue_id: str, top_k: int = Query(5)) -> Dict[str, Any]:
    """Get issues similar to a specific issue ID"""
    try:
        # In production, would retrieve issue embedding from database
        # For now, return placeholder
        return {
            'success': True,
            'issue_id': issue_id,
            'similar_count': 0,
            'similar_issues': []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/batch")
async def find_similar_batch(queries: List[str]) -> Dict[str, Any]:
    """Find similar issues for multiple queries"""
    try:
        if not queries:
            raise HTTPException(status_code=400, detail="Expected array of texts")
        
        embedding_service = get_embedding_service()
        vector_service = get_vector_service()
        
        results = []
        for item in queries:
            if isinstance(item, str):
                query_embedding = embedding_service.generate_embedding(item)
                similar = vector_service.search(query_embedding, k=5)
                results.append({
                    'query': item,
                    'similar_issues': [
                        {'issue_id': iid, 'similarity': float(sim)}
                        for iid, sim in similar
                    ]
                })
        
        return {
            'success': True,
            'batch_count': len(results),
            'results': results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/index-info")
async def get_index_info() -> Dict[str, Any]:
    """Get information about the vector index"""
    try:
        embedding_service = get_embedding_service()
        vector_service = get_vector_service()
        
        info = vector_service.get_index_info()
        model_info = embedding_service.get_model_info()
        
        return {
            'success': True,
            'index': info,
            'model': model_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
