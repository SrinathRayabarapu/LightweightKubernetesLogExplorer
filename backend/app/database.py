"""SQLite database setup with FTS5 for full-text search."""

import asyncio
import aiosqlite
from pathlib import Path
from typing import Optional

from .config import settings

# Database connection and lock for thread-safe access
_db: Optional[aiosqlite.Connection] = None
_db_lock = asyncio.Lock()


def get_db_path() -> Path:
    """Get the database file path."""
    return Path(settings.DATABASE_PATH)


async def get_database() -> aiosqlite.Connection:
    """
    Get the database connection, creating it if necessary.
    Uses a lock to prevent concurrent connection initialization.
    """
    global _db
    
    # Fast path: connection already exists
    if _db is not None:
        return _db
    
    # Slow path: need to create connection (with lock)
    async with _db_lock:
        # Double-check after acquiring lock
        if _db is None:
            _db = await aiosqlite.connect(
                get_db_path(),
                isolation_level=None,  # Autocommit mode for better concurrency
            )
            _db.row_factory = aiosqlite.Row
            # WAL mode for better concurrent read/write performance
            await _db.execute("PRAGMA journal_mode=WAL")
            await _db.execute("PRAGMA synchronous=NORMAL")
            # Increase busy timeout to handle concurrent access
            await _db.execute("PRAGMA busy_timeout=5000")
    return _db


async def close_database():
    """Close the database connection safely."""
    global _db
    async with _db_lock:
        if _db is not None:
            try:
                await _db.close()
            except Exception as e:
                print(f"Warning: Error closing database: {e}")
            finally:
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
    try:
        db = await get_database()
        return await db.execute(query, params)
    except aiosqlite.Error as e:
        print(f"Database execute error: {e}")
        raise


async def execute_many(query: str, params_list: list[tuple]) -> None:
    """Execute a query with multiple parameter sets."""
    try:
        db = await get_database()
        await db.executemany(query, params_list)
    except aiosqlite.Error as e:
        print(f"Database execute_many error: {e}")
        raise


async def fetch_one(query: str, params: tuple = ()) -> Optional[aiosqlite.Row]:
    """Fetch a single row."""
    try:
        db = await get_database()
        cursor = await db.execute(query, params)
        return await cursor.fetchone()
    except aiosqlite.Error as e:
        print(f"Database fetch_one error: {e}")
        raise


async def fetch_all(query: str, params: tuple = ()) -> list[aiosqlite.Row]:
    """Fetch all rows."""
    try:
        db = await get_database()
        cursor = await db.execute(query, params)
        return await cursor.fetchall()
    except aiosqlite.Error as e:
        print(f"Database fetch_all error: {e}")
        raise


async def commit():
    """Commit the current transaction."""
    try:
        db = await get_database()
        await db.commit()
    except aiosqlite.Error as e:
        print(f"Database commit error: {e}")
        raise
