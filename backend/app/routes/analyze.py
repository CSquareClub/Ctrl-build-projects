from flask import Blueprint, request, jsonify
from ..models.issue_model import Issue
from ..schemas.issue_schema import IssueSchema
from ..services.embedding_service import EmbeddingService
from ..services.priority_service import PriorityService
from ..utils.text_cleaner import TextCleaner
import uuid

analyze_bp = Blueprint('analyze', __name__, url_prefix='/api/analyze')
embedding_service = EmbeddingService()

@analyze_bp.route('', methods=['POST'])
def analyze_issue():
    """Analyze an issue for classification and priority"""
    try:
        data = request.get_json()
        
        # Validate input
        validated_data = IssueSchema.validate_create(data)
        
        # Create issue
        issue = Issue(
            id=str(uuid.uuid4()),
            title=validated_data['title'],
            description=validated_data['description'],
            repository=validated_data['repository'],
            priority=PriorityService.determine_priority(
                validated_data['title'],
                validated_data['description']
            ),
            status=validated_data['status'],
            labels=validated_data['labels']
        )
        
        # Generate embedding
        combined_text = f"{issue.title} {issue.description}"
        issue.embedding = embedding_service.generate_embedding(combined_text)
        
        # Clean text for analysis
        cleaned_text = TextCleaner.clean_text(combined_text)
        priority_indicators = PriorityService.extract_priority_indicators(combined_text)
        
        return jsonify({
            'success': True,
            'message': 'Issue analyzed successfully',
            'issue': IssueSchema.serialize_issue(issue),
            'analysis': {
                'priority_indicators': priority_indicators,
                'keywords': TextCleaner.extract_keywords(cleaned_text),
                'normalized_title': TextCleaner.normalize_title(issue.title)
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@analyze_bp.route('/batch', methods=['POST'])
def analyze_batch():
    """Analyze multiple issues at once"""
    try:
        data = request.get_json()
        
        if not isinstance(data, list):
            return jsonify({
                'success': False,
                'error': 'Expected array of issues'
            }), 400
        
        analyzed_issues = []
        
        for item in data:
            try:
                validated_data = IssueSchema.validate_create(item)
                issue = Issue(
                    id=str(uuid.uuid4()),
                    title=validated_data['title'],
                    description=validated_data['description'],
                    repository=validated_data['repository'],
                    priority=PriorityService.determine_priority(
                        validated_data['title'],
                        validated_data['description']
                    )
                )
                analyzed_issues.append(IssueSchema.serialize_issue(issue))
            except ValueError:
                continue
        
        return jsonify({
            'success': True,
            'count': len(analyzed_issues),
            'issues': analyzed_issues
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@analyze_bp.route('/priority', methods=['POST'])
def get_priority():
    """Get priority classification for text"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Text field is required'
            }), 400
        
        text = data['text']
        priority = PriorityService.determine_priority(text)
        score = PriorityService.get_priority_score(text)
        indicators = PriorityService.extract_priority_indicators(text)
        
        return jsonify({
            'success': True,
            'priority': priority,
            'score': score,
            'indicators': indicators
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@analyze_bp.route('/embedding', methods=['POST'])
def get_embedding():
    """Get embedding representation for text"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Text field is required'
            }), 400
        
        text = data['text']
        embedding = embedding_service.generate_embedding(text)
        
        return jsonify({
            'success': True,
            'text': text,
            'embedding': embedding,
            'dimension': len(embedding)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500
