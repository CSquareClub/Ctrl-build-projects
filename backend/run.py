import os
import sys
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app.main import app

if __name__ == '__main__':
    # Get configuration from environment or use defaults
    port = int(os.getenv('API_PORT', os.getenv('FLASK_PORT', 8001)))
    host = os.getenv('API_HOST', os.getenv('FLASK_HOST', '0.0.0.0'))
    
    print(f"Starting OpenIssue Analyzer API on {host}:{port}")
    
    # Run the app with Uvicorn (reload disabled on Windows due to numpy/FAISS crash)
    uvicorn.run("app.main:app", host=host, port=port, reload=False)
