"""
ChatTutor — Chat Routes
POST /ask — Send a question, get personalized AI answer with memory
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import AskRequest, AskResponse
from services.gemini import get_chat_answer
from services.memory import get_recent_history, save_conversation

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/ask", response_model=AskResponse)
def ask_question(payload: AskRequest, db: Session = Depends(get_db)):
    """
    Ask a question and receive a personalized AI answer.
    Uses last 5 conversations for context memory.
    """
    # Validate user
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Get context memory (last 5 conversations)
    history = get_recent_history(db, payload.user_id, limit=5)

    # Build user profile dict for AI
    user_profile = {
        "name": user.name,
        "education": user.education,
        "goal": user.goal,
        "role": user.role
    }

    # Generate AI answer
    try:
        answer = get_chat_answer(
            question=payload.question,
            user_profile=user_profile,
            chat_history=history
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )

    # Save to conversation history for future context
    save_conversation(db, payload.user_id, payload.question, answer)

    return AskResponse(answer=answer, user_id=payload.user_id)
