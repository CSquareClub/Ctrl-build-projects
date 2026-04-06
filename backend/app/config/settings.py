import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    CORS_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]
    
    # Data paths
    FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), '../../data/faiss_index.index')
    ISSUES_JSON_PATH = os.path.join(os.path.dirname(__file__), '../../data/issues.json')
    
    # Model settings
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"
    TOP_K_SIMILAR = 5
    SIMILARITY_THRESHOLD = 0.5

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

# Select config based on environment
config_env = os.getenv('FLASK_ENV', 'development')
if config_env == 'production':
    config = ProductionConfig
elif config_env == 'testing':
    config = TestingConfig
else:
    config = DevelopmentConfig
