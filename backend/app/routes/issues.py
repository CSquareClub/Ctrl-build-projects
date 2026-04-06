from flask import Blueprint, request, jsonify
import uuid
import os
from ..models.issue_model import Issue
from ..schemas.issue_schema import IssueSchema
from ..utils.file_handler import FileHandler
from ..services.priority_service import PriorityService

issues_bp = Blueprint('issues', __name__, url_prefix='/api/issues')

# In-memory storage for demo
issues_store = {}

@issues_bp.route('', methods=['GET'])
def get_issues():
    """Get all issues"""
    try:
        issues_list = list(issues_store.values())
        return jsonify({
            'success': True,
            'count': len(issues_list),
            'issues': [IssueSchema.serialize_issue(issue) for issue in issues_list]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@issues_bp.route('/<issue_id>', methods=['GET'])
def get_issue(issue_id):
    """Get a specific issue"""
    try:
        if issue_id not in issues_store:
            return jsonify({
                'success': False,
                'error': 'Issue not found'
            }), 404
        
        issue = issues_store[issue_id]
        return jsonify({
            'success': True,
            'issue': IssueSchema.serialize_issue(issue)
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@issues_bp.route('', methods=['POST'])
def create_issue():
    """Create a new issue"""
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
        
        # Store issue
        issues_store[issue.id] = issue
        
        return jsonify({
            'success': True,
            'message': 'Issue created successfully',
            'issue': IssueSchema.serialize_issue(issue)
        }), 201
        
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

@issues_bp.route('/<issue_id>', methods=['PUT'])
def update_issue(issue_id):
    """Update an issue"""
    try:
        if issue_id not in issues_store:
            return jsonify({
                'success': False,
                'error': 'Issue not found'
            }), 404
        
        data = request.get_json()
        issue = issues_store[issue_id]
        
        # Update fields
        if 'title' in data:
            issue.title = data['title']
        if 'description' in data:
            issue.description = data['description']
        if 'status' in data:
            issue.status = data['status']
        if 'priority' in data:
            issue.priority = data['priority']
        if 'labels' in data:
            issue.labels = data['labels']
        
        return jsonify({
            'success': True,
            'message': 'Issue updated successfully',
            'issue': IssueSchema.serialize_issue(issue)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@issues_bp.route('/<issue_id>', methods=['DELETE'])
def delete_issue(issue_id):
    """Delete an issue"""
    try:
        if issue_id not in issues_store:
            return jsonify({
                'success': False,
                'error': 'Issue not found'
            }), 404
        
        del issues_store[issue_id]
        
        return jsonify({
            'success': True,
            'message': 'Issue deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@issues_bp.route('/priority/<priority>', methods=['GET'])
def get_issues_by_priority(priority):
    """Get issues filtered by priority"""
    try:
        filtered_issues = [
            issue for issue in issues_store.values()
            if issue.priority == priority
        ]
        
        return jsonify({
            'success': True,
            'priority': priority,
            'count': len(filtered_issues),
            'issues': [IssueSchema.serialize_issue(issue) for issue in filtered_issues]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
