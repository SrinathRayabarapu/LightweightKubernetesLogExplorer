"""SQLite database setup with FTS5 for full-text search."""

import aiosqlite
from pathlib import Path
from typing import Optional

from .config import settings

# Database connection pool (single connection for simplicity)
_db: Optional[aiosqlite.Connection] = None


def get_db_path() -> Path:
    """Get the database file path."""
    return Path(settings.DATABASE_PATH)


async def get_database() -> aiosqlite.Connection:
    """Get the database connection, creating it if necessary."""
    global _db
    if _db is None:
        _db = await aiosqlite.connect(get_db_path())
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA synchronous=NORMAL")
    return _db


async def close_database():
    """Close the database connection."""
    global _db
    if _db is not None:
        await _db.close()
        _db = None


async def init_database():
    """Initialize the database schema."""
    db = await get_database()
    
    # Main logs table
    await db.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            env TEXT NOT NULL,
            namespace TEXT NOT NULL,
            service TEXT NOT NULL,
            pod TEXT NOT NULL,
            container TEXT NOT NULL,
            message TEXT NOT NULL,
            ingested_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Indexes for efficient querying
    await db.execute("CREATE INDEX IF NOT EXISTS idx_logs_env ON logs(env)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_logs_env_service ON logs(env, namespace, service)")
    await db.execute("CREATE INDEX IF NOT EXISTS idx_logs_env_timestamp ON logs(env, timestamp DESC)")
    
    # FTS5 virtual table for full-text search on message
    await db.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
            message,
            content='logs',
            content_rowid='id'
        )
    """)
    
    # Triggers to keep FTS index in sync with logs table
    await db.execute("""
        CREATE TRIGGER IF NOT EXISTS logs_ai AFTER INSERT ON logs BEGIN
            INSERT INTO logs_fts(rowid, message) VALUES (new.id, new.message);
        END
    """)
    
    await db.execute("""
        CREATE TRIGGER IF NOT EXISTS logs_ad AFTER DELETE ON logs BEGIN
            INSERT INTO logs_fts(logs_fts, rowid, message) VALUES('delete', old.id, old.message);
        END
    """)
    
    await db.execute("""
        CREATE TRIGGER IF NOT EXISTS logs_au AFTER UPDATE ON logs BEGIN
            INSERT INTO logs_fts(logs_fts, rowid, message) VALUES('delete', old.id, old.message);
            INSERT INTO logs_fts(rowid, message) VALUES (new.id, new.message);
        END
    """)
    
    # Log hashes table for deduplication
    await db.execute("""
        CREATE TABLE IF NOT EXISTS log_hashes (
            hash TEXT PRIMARY KEY,
            log_id INTEGER NOT NULL,
            FOREIGN KEY (log_id) REFERENCES logs(id) ON DELETE CASCADE
        )
    """)
    
    # Refresh state table for tracking last fetch times
    await db.execute("""
        CREATE TABLE IF NOT EXISTS refresh_state (
            env TEXT NOT NULL,
            namespace TEXT NOT NULL,
            service TEXT NOT NULL,
            last_refresh TEXT,
            last_log_timestamp TEXT,
            PRIMARY KEY (env, namespace, service)
        )
    """)
    
    await db.commit()
    print("Database initialized successfully")


async def execute(query: str, params: tuple = ()) -> aiosqlite.Cursor:
    """Execute a query and return the cursor."""
    db = await get_database()
    return await db.execute(query, params)


async def execute_many(query: str, params_list: list[tuple]) -> None:
    """Execute a query with multiple parameter sets."""
    db = await get_database()
    await db.executemany(query, params_list)


async def fetch_one(query: str, params: tuple = ()) -> Optional[aiosqlite.Row]:
    """Fetch a single row."""
    db = await get_database()
    cursor = await db.execute(query, params)
    return await cursor.fetchone()


async def fetch_all(query: str, params: tuple = ()) -> list[aiosqlite.Row]:
    """Fetch all rows."""
    db = await get_database()
    cursor = await db.execute(query, params)
    return await cursor.fetchall()


async def commit():
    """Commit the current transaction."""
    db = await get_database()
    await db.commit()
