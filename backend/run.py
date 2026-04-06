import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app.main import create_app
from app.config.settings import config

if __name__ == '__main__':
    # Create Flask app
    app = create_app(config)
    
    # Get configuration from environment or use defaults
    port = int(os.getenv('FLASK_PORT', 5000))
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"Starting OpenIssue Analyzer API on {host}:{port}")
    print(f"Debug mode: {debug}")
    
    # Run the app
    app.run(host=host, port=port, debug=debug)
