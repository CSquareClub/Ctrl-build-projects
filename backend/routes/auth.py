"""
ChatTutor — Auth Routes
POST /register — Create new user
POST /login   — Get user profile by name
GET  /users/{user_id} — Get profile
GET  /users/{user_id}/history — Get chat history
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Conversation
from schemas import RegisterRequest, UserResponse, HistoryResponse, ConversationItem, LoginRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with their profile"""
    print(f"DEBUG: register payload: {payload.model_dump()}")
    # Check for duplicate email
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"User with email '{payload.email}' already exists. Please login."
        )

    user = User(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        age=payload.age,
        education=payload.education,
        goal=payload.goal,
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=UserResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    """Login user by email and password"""
    print(f"DEBUG: login payload: {payload.model_dump()}")
    email = payload.email.strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found. Please register first.")
        
    if user.password != payload.password:
        raise HTTPException(status_code=401, detail="Incorrect password.")

    return user


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user profile by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/{user_id}/history", response_model=HistoryResponse)
def get_history(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
    """Get conversation history for a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.timestamp.desc())
        .limit(limit)
        .all()
    )
    conversations.reverse()

    return HistoryResponse(
        user_id=user_id,
        conversations=[ConversationItem.model_validate(c) for c in conversations]
    )
