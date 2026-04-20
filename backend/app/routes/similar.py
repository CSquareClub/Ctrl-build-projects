from fastapi import APIRouter, HTTPException
from typing import List, Optional
import os

from app.services.embedding_service import get_embedding_service
from app.services.vector_service import VectorService
from app.utils.issue_storage import IssueStorage

router = APIRouter()
embedding_service = get_embedding_service()
issue_storage = IssueStorage()

# Simple FAISS index path - could be moved to config
FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "faiss_index.index")

@router.post("/")
async def find_similar_issues(data: dict):
    """Find similar issues based on text"""
    try:
        if not data or 'text' not in data:
            raise HTTPException(status_code=400, detail="Text field is required")
        
        text = data['text']
        top_k = data.get('top_k', 5)
        
        # Generate embedding for query
        query_embedding = embedding_service.generate_embedding(text)
        
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")
        
        # Get all issues and find similar ones
        import numpy as np
        from app.services.vector_service import find_similar_issues as find_similar
        
        all_issues = issue_storage.get_all_issues()
        similar_issues = find_similar(np.array(query_embedding), all_issues, top_k=top_k)
        
        return {
            'success': True,
            'query': text,
            'similar_count': len(similar_issues),
            'similar_issues': [
                {
                    'id': issue.get('id'),
                    'title': issue.get('title'),
                    'priority': issue.get('priority'),
                    'similarity_score': issue.get('similarity_score', 0)
                }
                for issue in similar_issues
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.get("/{issue_id}")
async def get_similar_by_id(issue_id: str, top_k: int = 5):
    """Get issues similar to a specific issue ID"""
    try:
        # Find the target issue
        target_issue = issue_storage.get_issue(issue_id)
        if not target_issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        
        # Get its embedding
        title = target_issue.get('title', '')
        description = target_issue.get('description', '')
        query_embedding = embedding_service.generate_embedding(f"{title} {description}")
        
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")
        
        # Find similar issues
        import numpy as np
        from app.services.vector_service import find_similar_issues as find_similar
        
        all_issues = [i for i in issue_storage.get_all_issues() if i.get('id') != issue_id]
        similar_issues = find_similar(np.array(query_embedding), all_issues, top_k=top_k)
        
        return {
            'success': True,
            'issue_id': issue_id,
            'similar_count': len(similar_issues),
            'similar_issues': [
                {
                    'id': issue.get('id'),
                    'title': issue.get('title'),
                    'priority': issue.get('priority'),
                    'similarity_score': issue.get('similarity_score', 0)
                }
                for issue in similar_issues
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.post("/batch")
async def find_similar_batch(data: dict):
    """Find similar issues for multiple queries"""
    try:
        if not data or 'texts' not in data:
            raise HTTPException(status_code=400, detail="texts field is required")
        
        texts = data['texts']
        if not isinstance(texts, list):
            raise HTTPException(status_code=400, detail="texts must be a list")
        
        top_k = data.get('top_k', 3)
        
        results = []
        for text in texts:
            query_embedding = embedding_service.generate_embedding(text)
            if not query_embedding:
                results.append({
                    'query': text,
                    'success': False,
                    'error': 'Failed to generate embedding'
                })
                continue
            
            import numpy as np
            from app.services.vector_service import find_similar_issues as find_similar
            
            all_issues = issue_storage.get_all_issues()
            similar_issues = find_similar(np.array(query_embedding), all_issues, top_k=top_k)
            
            results.append({
                'query': text,
                'success': True,
                'similar_count': len(similar_issues),
                'similar_issues': [
                    {
                        'id': issue.get('id'),
                        'title': issue.get('title'),
                        'priority': issue.get('priority'),
                        'similarity_score': issue.get('similarity_score', 0)
                    }
                    for issue in similar_issues
                ]
            })
        
        return {
            'success': True,
            'batch_count': len(results),
            'results': results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Internal server error: {str(e)}')

@router.get("/index-info")
async def get_index_info():
    """Get information about the embedding service"""
    try:
        model_info = embedding_service.get_model_info()
        
        return {
            'success': True,
            'model': model_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
