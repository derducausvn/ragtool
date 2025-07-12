"""
models.py (Refactored)
----------------------
Defines database schema for chat and questionnaire sessions.
Uses SQLModel for fast ORM-like access. Ready for expansion (user ID, tags, etc.).
add_mode_column_to_chatme
Models:
- ChatSession: groups messages by conversation
- ChatMessage: stores role/content/timestamp
- QuestionnaireSession: stores uploaded questionnaire responses
"""

from typing import List, Optional
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

# --- Chat Session Entity ---
class ChatSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    messages: List["ChatMessage"] = Relationship(back_populates="session")

# --- Chat Message Entity ---
class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chatsession.id")
    role: str  # "user" or "assistant"
    content: str
    mode: Optional[str] = Field(default=None, description="Chat mode: F24 QA Expert or General Chat")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    session: Optional[ChatSession] = Relationship(back_populates="messages")

# --- Questionnaire Session Entity ---
class QuestionnaireSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    file_name: str
    results_json: str  # JSON-encoded list of Q&A dicts
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- PLACEHOLDER ---
# Future: Add user_id, questionnaire tags, versioning support
