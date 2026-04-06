import uuid
from flask import session
from database1 import db, Conversation, Message

WEAK_TOPIC_KEYWORDS = [
    "recursion", "big-o", "pointers", "dynamic programming",
    "normalization", "joins", "os scheduling", "deadlock",
    "calculus", "integration", "differentiation", "matrices",
]


def current_user_id():
    if "auth_user_id" in session:
        return str(session["auth_user_id"])
    return session.setdefault("user_id", str(uuid.uuid4()))


def detect_weak_topics(text: str) -> list[str]:
    lower = text.lower()
    return [kw for kw in WEAK_TOPIC_KEYWORDS if kw in lower]


def get_or_create_conversation(user_id: str, question: str, conversation_id=None):
    if conversation_id:
        convo = Conversation.query.filter_by(id=conversation_id, user_id=user_id).first()
        if convo:
            return convo

    convo = Conversation(user_id=user_id, title=question[:120] or "New Chat")
    db.session.add(convo)
    db.session.flush()
    return convo


def get_message_history(conversation_id: int, limit: int = 10):
    return Message.query.filter_by(conversation_id=conversation_id)\
        .order_by(Message.created_at.asc()).limit(limit).all()


def list_recent_conversations(user_id: str, limit: int = 10):
    return Conversation.query.filter_by(user_id=user_id)\
        .order_by(Conversation.created_at.desc()).limit(limit).all()


def get_conversation_messages(conversation_id: int):
    return Message.query.filter_by(conversation_id=conversation_id)\
        .order_by(Message.created_at.asc()).all()


def weak_topics_for_user(user_id: str) -> dict:
    convos = Conversation.query.filter_by(user_id=user_id).all()
    convo_ids = [c.id for c in convos]
    if not convo_ids:
        return {"weak": [], "strong": []}

    all_questions = Message.query.filter(
        Message.conversation_id.in_(convo_ids),
        Message.role == "user"
    ).all()

    freq = {}
    for msg in all_questions:
        for kw in detect_weak_topics(msg.content):
            freq[kw] = freq.get(kw, 0) + 1

    sorted_topics = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    weak = [t[0] for t in sorted_topics[:3]]
    strong = [t[0] for t in sorted_topics[3:6]]
    return {"weak": weak, "strong": strong}
