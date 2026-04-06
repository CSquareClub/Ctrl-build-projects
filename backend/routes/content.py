"""
ChatTutor — Content Routes
POST /content/generate-notes — Generate study notes for a topic
POST /content/generate-quiz  — Generate MCQ quiz for a topic
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Content, Tracking
from schemas import (
    NotesRequest, NotesResponse, QuizRequest, QuizResponse,
    RoadmapRequest, RoadmapResponse, InterviewRequest, InterviewResponse,
    TrackingRequest, TrackingResponse, TrackingItem
)
from services.gemini import (
    generate_notes, generate_quiz, generate_roadmap, generate_interview_questions
)

router = APIRouter(prefix="/content", tags=["Content Generation"])


@router.post("/generate-notes", response_model=NotesResponse)
def create_notes(payload: NotesRequest, db: Session = Depends(get_db)):
    """Generate comprehensive study notes for a topic"""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    user_profile = {
        "name": user.name,
        "education": user.education,
        "goal": user.goal,
        "role": user.role
    }

    try:
        notes_text = generate_notes(payload.topic, user_profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    # Save or update content record
    content = (
        db.query(Content)
        .filter(Content.user_id == payload.user_id, Content.topic == payload.topic)
        .first()
    )

    if content:
        content.notes = notes_text
    else:
        content = Content(
            user_id=payload.user_id,
            topic=payload.topic,
            notes=notes_text
        )
        db.add(content)

    db.commit()
    db.refresh(content)

    return NotesResponse(topic=payload.topic, notes=notes_text, content_id=content.id)


@router.post("/generate-quiz", response_model=QuizResponse)
def create_quiz(payload: QuizRequest, db: Session = Depends(get_db)):
    """Generate 10 MCQ questions for a topic"""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not payload.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    user_profile = {
        "name": user.name,
        "education": user.education,
        "goal": user.goal,
        "role": user.role
    }

    difficulty = payload.difficulty or "medium"

    try:
        questions = generate_quiz(payload.topic, user_profile, difficulty)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse quiz from AI. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    # Save quiz to content table
    quiz_json = json.dumps(questions)
    content = (
        db.query(Content)
        .filter(Content.user_id == payload.user_id, Content.topic == payload.topic)
        .first()
    )

    if content:
        content.quiz = quiz_json
    else:
        content = Content(
            user_id=payload.user_id,
            topic=payload.topic,
            quiz=quiz_json
        )
        db.add(content)

    db.commit()
    db.refresh(content)

    return QuizResponse(topic=payload.topic, questions=questions, content_id=content.id)


@router.post("/generate-roadmap", response_model=RoadmapResponse)
def create_roadmap(payload: RoadmapRequest, db: Session = Depends(get_db)):
    """Generate career adaptive roadmap based on user profile"""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_profile = {"name": user.name, "education": user.education, "goal": user.goal, "role": user.role}
    
    try:
        roadmap_data = generate_roadmap(user_profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
        
    return RoadmapResponse(
        user_id=user.id,
        goal=roadmap_data.get("goal", user.goal),
        modules=roadmap_data.get("modules", [])
    )


@router.post("/generate-interview", response_model=InterviewResponse)
def create_interview(payload: InterviewRequest, db: Session = Depends(get_db)):
    """Generate interview questions for the user's selected job role context"""
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_profile = {"name": user.name, "education": user.education, "goal": user.goal, "role": user.role}
    
    try:
        interview_data = generate_interview_questions(user_profile, count=5)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
        
    return InterviewResponse(
        user_id=user.id,
        role_targeted=interview_data.get("role_targeted", user.goal),
        questions=interview_data.get("questions", [])
    )


@router.post("/track-progress")
def track_progress(payload: TrackingRequest, db: Session = Depends(get_db)):
    """Save a user's action to tracking log"""
    tracking = Tracking(
        user_id=payload.user_id,
        activity_type=payload.activity_type,
        topic=payload.topic,
        score=payload.score,
        total_questions=payload.total_questions,
        time_spent=payload.time_spent
    )
    db.add(tracking)
    db.commit()
    db.refresh(tracking)
    return {"status": "success", "tracking_id": tracking.id}


@router.get("/get-progress/{user_id}", response_model=TrackingResponse)
def get_progress(user_id: int, db: Session = Depends(get_db)):
    """Get complete tracked history for a user"""
    history = db.query(Tracking).filter(Tracking.user_id == user_id).order_by(Tracking.created_at.desc()).all()
    return TrackingResponse(
        user_id=user_id,
        history=[TrackingItem.model_validate(h) for h in history]
    )
