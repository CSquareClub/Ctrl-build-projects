"""
ChatTutor — Download Routes
GET /download/{user_id}/{topic} — Download notes as PDF
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.orm import Session
from database import get_db
from models import User, Content
from services.pdf import generate_pdf

router = APIRouter(prefix="/download", tags=["Download"])


@router.get("/{user_id}/{topic}")
def download_notes(user_id: int, topic: str, db: Session = Depends(get_db)):
    """
    Download notes for a topic as a PDF.
    If notes don't exist yet, returns 404.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    content = (
        db.query(Content)
        .filter(Content.user_id == user_id, Content.topic == topic)
        .first()
    )

    if not content or not content.notes:
        raise HTTPException(
            status_code=404,
            detail=f"No notes found for topic '{topic}'. Please generate notes first."
        )

    try:
        pdf_bytes = generate_pdf(
            topic=topic,
            notes=content.notes,
            user_name=user.name,
            user_goal=user.goal
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")

    # Sanitize filename
    safe_topic = "".join(c if c.isalnum() or c in " _-" else "_" for c in topic)
    filename = f"ChatTutor_{safe_topic}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
