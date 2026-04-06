"""
ChatTutor — Context Memory Service
Retrieves last N conversations for a user to provide context to the AI
"""

from sqlalchemy.orm import Session
from models import Conversation


def get_recent_history(db: Session, user_id: int, limit: int = 5) -> list:
    """
    Fetch the last `limit` conversation Q&A pairs for a user.
    Returns a list of dicts: [{"question": ..., "answer": ...}, ...]
    """
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.timestamp.desc())
        .limit(limit)
        .all()
    )

    # Return in chronological order (oldest first for context)
    conversations.reverse()

    return [
        {
            "question": conv.question,
            "answer": conv.answer,
            "timestamp": conv.timestamp.isoformat()
        }
        for conv in conversations
    ]


def save_conversation(db: Session, user_id: int, question: str, answer: str) -> Conversation:
    """Persist a Q&A pair to the conversation history"""
    conv = Conversation(user_id=user_id, question=question, answer=answer)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv
