"""
db.py (Refactored)
------------------
Database engine + session provider setup.
Uses SQLite by default, but ready for PostgreSQL or MSSQL via env var.

Supported DATABASE_URL formats:
- SQLite:       sqlite:///chat.db
- PostgreSQL:   postgresql://user:password@host:port/dbname
- Azure SQL:    mssql+pyodbc://user:password@host:1433/dbname?driver=ODBC+Driver+17+for+SQL+Server
"""

import os
from sqlmodel import SQLModel, create_engine, Session

# --- Database Config ---
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///chat.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")

# --- Engine Init ---
engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False} if IS_SQLITE else {}
)

# --- Session Factory ---
def get_session():
    return Session(engine)

# --- Initializer ---
def init_db():
    from models import ChatSession, ChatMessage, QuestionnaireSession
    SQLModel.metadata.create_all(engine)
