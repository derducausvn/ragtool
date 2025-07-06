from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional
from datetime import datetime


class ChatSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    messages: List["ChatMessage"] = Relationship(back_populates="session")


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chatsession.id")
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    session: Optional[ChatSession] = Relationship(back_populates="messages")  # ← THIS LINE FIXES THE ISSUE

class QuestionnaireSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    file_name: str
    results_json: str  # JSON-encoded Q&A results
    created_at: datetime = Field(default_factory=datetime.utcnow)
