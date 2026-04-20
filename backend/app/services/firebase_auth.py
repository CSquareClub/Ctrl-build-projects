"""Firebase Authentication Service"""
import os
from typing import Optional, Dict, Any

try:
    import firebase_admin
    from firebase_admin import credentials, auth
except ImportError:
    firebase_admin = None
    auth = None

from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


class FirebaseAuth:
    """Firebase Authentication Service"""
    
    _initialized: bool = False
    _app: Optional[Any] = None
    
    @classmethod
    def initialize(cls) -> bool:
        """Initialize Firebase Admin SDK"""
        if cls._initialized:
            return True
        
        if firebase_admin is None:
            print("firebase-admin not installed")
            return False
        
        try:
            # Check for credentials file or environment variable
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
            
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                cls._app = firebase_admin.initialize_app(cred)
            elif os.getenv("FIREBASE_PROJECT_ID"):
                # Use default credentials (for cloud environments)
                cls._app = firebase_admin.initialize_app()
            else:
                print("Firebase credentials not configured")
                return False
            
            cls._initialized = True
            return True
            
        except Exception as e:
            print(f"Firebase initialization error: {e}")
            return False
    
    @classmethod
    def verify_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Verify a Firebase ID token"""
        if not cls._initialized and not cls.initialize():
            return None
        
        if auth is None:
            return None
        
        try:
            decoded_token = auth.verify_id_token(token)
            return {
                "uid": decoded_token.get("uid"),
                "email": decoded_token.get("email"),
                "name": decoded_token.get("name"),
                "picture": decoded_token.get("picture"),
            }
        except Exception as e:
            print(f"Token verification error: {e}")
            return None
    
    @classmethod
    def is_configured(cls) -> bool:
        """Check if Firebase is configured"""
        return bool(
            os.getenv("FIREBASE_CREDENTIALS_PATH") or 
            os.getenv("FIREBASE_PROJECT_ID")
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[Dict[str, Any]]:
    """
    Dependency to get the current authenticated user.
    Returns None if not authenticated (allows optional auth).
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    user = FirebaseAuth.verify_token(token)
    return user


async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Dict[str, Any]:
    """
    Dependency that requires authentication.
    Raises HTTPException if not authenticated.
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    user = FirebaseAuth.verify_token(token)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user


def init_firebase():
    """Initialize Firebase (call on app startup)"""
    if FirebaseAuth.is_configured():
        FirebaseAuth.initialize()
