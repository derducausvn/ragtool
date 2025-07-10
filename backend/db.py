"""
db.py (Refactored)
------------------
Database engine + session provider setup.
Uses PostgreSQL via env var. No SQLite fallback.

Supported DATABASE_URL formats:
- PostgreSQL:   postgresql://user:password@host:port/dbname
- Azure SQL:    mssql+pyodbc://user:password@host:1433/dbname?driver=ODBC+Driver+17+for+SQL+Server
"""

import os
from sqlmodel import SQLModel, create_engine, Session

# --- Database Config ---
DATABASE_URL = os.environ["DATABASE_URL"]  # Require this to be set, no fallback

# --- Engine Init ---
engine = create_engine(
    DATABASE_URL,
    echo=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800  # Recycle connections every 30 minutes
)

# --- Session Factory (FastAPI Dependency) ---
def get_session():
    """
    FastAPI dependency that provides a database session.
    Automatically closes the session when the request is complete.
    """
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()

# --- Initializer ---
def init_db():
    from models import ChatSession, ChatMessage, QuestionnaireSession
    SQLModel.metadata.create_all(engine)
