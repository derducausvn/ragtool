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
    echo=True
)

# --- Session Factory ---
def get_session():
    return Session(engine)

# --- Initializer ---
def init_db():
    from models import ChatSession, ChatMessage, QuestionnaireSession
    SQLModel.metadata.create_all(engine)
