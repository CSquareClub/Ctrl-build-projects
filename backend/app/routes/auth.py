from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse, JSONResponse
import httpx
import os
import secrets
from typing import Optional

router = APIRouter()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# In-memory session store (use Redis in production)
sessions = {}

@router.get("/login")
async def github_login():
    """Redirect to GitHub OAuth authorization page"""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Store state temporarily (in production, use Redis with expiry)
    sessions[f"state_{state}"] = True
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope=read:user,user:email"
        f"&state={state}"
    )
    
    return RedirectResponse(url=github_auth_url)

@router.get("/callback")
async def github_callback(code: str, state: str, response: Response):
    """Handle GitHub OAuth callback"""
    
    # Verify state to prevent CSRF
    if f"state_{state}" not in sessions:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Clean up state
    del sessions[f"state_{state}"]
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get access token")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")
        
        # Get user info from GitHub
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        user_data = user_response.json()
        
        # Create session
        session_id = secrets.token_urlsafe(32)
        sessions[session_id] = {
            "user": {
                "id": user_data.get("id"),
                "login": user_data.get("login"),
                "name": user_data.get("name"),
                "avatar_url": user_data.get("avatar_url"),
                "email": user_data.get("email"),
            },
            "access_token": access_token
        }
        
        # Redirect to frontend with session token
        redirect_url = f"{FRONTEND_URL}/pages/dashboard.html?session={session_id}"
        return RedirectResponse(url=redirect_url)

@router.get("/user")
async def get_current_user(request: Request):
    """Get current authenticated user"""
    session_id = request.query_params.get("session")
    
    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_data = sessions[session_id]
    return {"user": session_data["user"]}

@router.post("/logout")
async def logout(request: Request):
    """Logout user and clear session"""
    session_id = request.query_params.get("session")
    
    if session_id and session_id in sessions:
        del sessions[session_id]
    
    return {"message": "Logged out successfully"}

@router.get("/check")
async def check_auth(request: Request):
    """Check if user is authenticated"""
    session_id = request.query_params.get("session")
    
    if not session_id or session_id not in sessions:
        return {"authenticated": False}
    
    return {"authenticated": True, "user": sessions[session_id]["user"]}
