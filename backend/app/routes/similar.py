from flask import Blueprint, request, jsonify
from ..services.embedding_service import EmbeddingService
from ..services.vector_service import VectorService
from ..config.settings import config
import os

similar_bp = Blueprint('similar', __name__, url_prefix='/api/similar')
embedding_service = EmbeddingService()
vector_service = VectorService(config.FAISS_INDEX_PATH)

@similar_bp.route('', methods=['POST'])
def find_similar_issues():
    """Find similar issues based on text"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Text field is required'
            }), 400
        
        text = data['text']
        top_k = data.get('top_k', 5)
        
        # Generate embedding for query
        query_embedding = embedding_service.generate_embedding(text)
        
        if not query_embedding:
            return jsonify({
                'success': False,
                'error': 'Failed to generate embedding'
            }), 500
        
        # Search for similar issues
        similar_issues = vector_service.search(query_embedding, k=top_k)
        
        return jsonify({
            'success': True,
            'query': text,
            'similar_count': len(similar_issues),
            'similar_issues': [
                {
                    'issue_id': issue_id,
                    'similarity': similarity
                }
                for issue_id, similarity in similar_issues
            ]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@similar_bp.route('/<issue_id>', methods=['GET'])
def get_similar_by_id(issue_id):
    """Get issues similar to a specific issue ID"""
    try:
        top_k = request.args.get('top_k', default=5, type=int)
        
        # In production, would retrieve issue embedding from database
        # For now, return placeholder
        return jsonify({
            'success': True,
            'issue_id': issue_id,
            'similar_count': 0,
            'similar_issues': []
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@similar_bp.route('/batch', methods=['POST'])
def find_similar_batch():
    """Find similar issues for multiple queries"""
    try:
        data = request.get_json()
        
        if not isinstance(data, list):
            return jsonify({
                'success': False,
                'error': 'Expected array of texts'
            }), 400
        
        results = []
        for item in data:
            if isinstance(item, str):
                query_embedding = embedding_service.generate_embedding(item)
                similar = vector_service.search(query_embedding, k=5)
                results.append({
                    'query': item,
                    'similar_issues': [
                        {'issue_id': iid, 'similarity': sim}
                        for iid, sim in similar
                    ]
                })
        
        return jsonify({
            'success': True,
            'batch_count': len(results),
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@similar_bp.route('/index-info', methods=['GET'])
def get_index_info():
    """Get information about the vector index"""
    try:
        info = vector_service.get_index_info()
        model_info = embedding_service.get_model_info()
        
        return jsonify({
            'success': True,
            'index': info,
            'model': model_info
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
