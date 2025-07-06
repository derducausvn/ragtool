from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///chat.db"

# Fix: Enable more concurrency
engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False},
    pool_size=10,
    max_overflow=20
)

def get_session():
    return Session(engine)

def init_db():
    from .models import ChatSession, ChatMessage, QuestionnaireSession
    SQLModel.metadata.create_all(engine)
