from flask import Flask, jsonify
from flask_cors import CORS
from .config.settings import config
from .routes import analyze, issues, similar

def create_app(config_obj=None):
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration
    if config_obj:
        app.config.from_object(config_obj)
    else:
        app.config.from_object(config)
    
    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": config.CORS_ORIGINS,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    })
    
    # Register blueprints
    app.register_blueprint(analyze.analyze_bp)
    app.register_blueprint(issues.issues_bp)
    app.register_blueprint(similar.similar_bp)
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'OpenIssue Analyzer API',
            'version': '1.0.0'
        }), 200
    
    # Root endpoint
    @app.route('/', methods=['GET'])
    def root():
        return jsonify({
            'message': 'OpenIssue Analyzer API',
            'version': '1.0.0',
            'endpoints': {
                'analyze': '/api/analyze',
                'issues': '/api/issues',
                'similar': '/api/similar',
                'health': '/api/health'
            }
        }), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': 'Endpoint not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
