import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///chat.db")
is_sqlite = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}
engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args=connect_args
)

def get_session():
    return Session(engine)

def init_db():
    from models import ChatSession, ChatMessage, QuestionnaireSession
    SQLModel.metadata.create_all(engine)
