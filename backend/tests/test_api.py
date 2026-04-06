import pytest
from app.main import create_app
from app.config.settings import TestingConfig

@pytest.fixture
def app():
    """Create and configure a test app"""
    app = create_app(TestingConfig)
    return app

@pytest.fixture
def client(app):
    """Test client"""
    return app.test_client()

def test_health_check(client):
    """Test health check endpoint"""
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'

def test_root_endpoint(client):
    """Test root endpoint"""
    response = client.get('/')
    assert response.status_code == 200
    data = response.get_json()
    assert 'message' in data

def test_analyze_issue(client):
    """Test issue analysis"""
    payload = {
        'title': 'Critical bug in production',
        'description': 'The application crashes when user clicks logout button'
    }
    response = client.post('/api/analyze', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'issue' in data

def test_analyze_missing_title(client):
    """Test analysis with missing title"""
    payload = {
        'description': 'Test description'
    }
    response = client.post('/api/analyze', json=payload)
    assert response.status_code == 400

def test_get_priority(client):
    """Test priority endpoint"""
    payload = {'text': 'Critical security vulnerability'}
    response = client.post('/api/analyze/priority', json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'priority' in data

def test_create_issue(client):
    """Test creating an issue"""
    payload = {
        'title': 'New Feature Request',
        'description': 'Add dark mode support'
    }
    response = client.post('/api/issues', json=payload)
    assert response.status_code == 201
    data = response.get_json()
    assert data['success'] is True
    assert 'issue' in data

def test_get_issues(client):
    """Test getting all issues"""
    response = client.get('/api/issues')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'issues' in data
