from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Conversation(db.Model):
    __tablename__ = "conversations"
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.String(64), nullable=False, index=True)
    title      = db.Column(db.String(120), nullable=False, default="New Chat")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    messages   = db.relationship("Message", backref="conversation", lazy=True, cascade="all, delete-orphan")

class Message(db.Model):
    __tablename__ = "messages"
    id              = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey("conversations.id"), nullable=False, index=True)
    role            = db.Column(db.String(16), nullable=False)
    content         = db.Column(db.Text, nullable=False)
    mode            = db.Column(db.String(16), default="normal")
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)