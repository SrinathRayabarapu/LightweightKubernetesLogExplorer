"""Storage retention and size control service."""

import os
from pathlib import Path

from ..config import settings
from ..database import get_db_path, fetch_one, execute, commit, get_database


async def get_db_size_mb() -> float:
    """Get the current database size in megabytes."""
    db_path = get_db_path()
    if not db_path.exists():
        return 0.0
    return os.path.getsize(db_path) / (1024 * 1024)


async def get_log_count() -> int:
    """Get the total number of logs in the database."""
    row = await fetch_one("SELECT COUNT(*) as count FROM logs")
    return row["count"] if row else 0


async def get_oldest_logs(limit: int) -> list[int]:
    """Get IDs of the oldest logs."""
    db = await get_database()
    cursor = await db.execute(
        "SELECT id FROM logs ORDER BY timestamp ASC LIMIT ?",
        (limit,)
    )
    rows = await cursor.fetchall()
    return [row["id"] for row in rows]


async def delete_logs_by_ids(log_ids: list[int]) -> int:
    """
    Delete logs by their IDs.
    Also removes associated hashes due to CASCADE.
    
    Returns:
        Number of logs deleted
    """
    if not log_ids:
        return 0
    
    placeholders = ",".join("?" * len(log_ids))
    
    # Delete from log_hashes first (cascade should handle this, but be explicit)
    await execute(
        f"DELETE FROM log_hashes WHERE log_id IN ({placeholders})",
        tuple(log_ids)
    )
    
    # Delete from logs (triggers will update FTS)
    cursor = await execute(
        f"DELETE FROM logs WHERE id IN ({placeholders})",
        tuple(log_ids)
    )
    
    await commit()
    return cursor.rowcount


async def vacuum_database():
    """Run VACUUM to reclaim disk space."""
    db = await get_database()
    await db.execute("VACUUM")


async def enforce_retention() -> dict:
    """
    Enforce the storage size limit by deleting oldest logs.
    
    Returns:
        Dictionary with enforcement results
    """
    max_size_mb = settings.MAX_DB_SIZE_MB
    current_size = await get_db_size_mb()
    
    if current_size <= max_size_mb:
        return {
            "action_taken": False,
            "current_size_mb": round(current_size, 2),
            "max_size_mb": max_size_mb,
            "logs_deleted": 0,
        }
    
    # Calculate how much to delete (aim for 90% of max to leave buffer)
    target_size = max_size_mb * 0.9
    
    # Estimate logs to delete based on average log size
    total_logs = await get_log_count()
    if total_logs == 0:
        return {
            "action_taken": False,
            "current_size_mb": round(current_size, 2),
            "max_size_mb": max_size_mb,
            "logs_deleted": 0,
        }
    
    avg_log_size_mb = current_size / total_logs
    excess_mb = current_size - target_size
    logs_to_delete = int(excess_mb / avg_log_size_mb) + 1
    
    # Delete at least 10% of logs to avoid frequent deletions
    min_delete = max(total_logs // 10, 100)
    logs_to_delete = max(logs_to_delete, min_delete)
    
    # Get and delete oldest logs
    oldest_ids = await get_oldest_logs(logs_to_delete)
    deleted = await delete_logs_by_ids(oldest_ids)
    
    # Vacuum to reclaim space
    await vacuum_database()
    
    new_size = await get_db_size_mb()
    
    return {
        "action_taken": True,
        "previous_size_mb": round(current_size, 2),
        "current_size_mb": round(new_size, 2),
        "max_size_mb": max_size_mb,
        "logs_deleted": deleted,
    }


async def get_storage_stats() -> dict:
    """Get current storage statistics."""
    current_size = await get_db_size_mb()
    total_logs = await get_log_count()
    max_size = settings.MAX_DB_SIZE_MB
    
    return {
        "current_size_mb": round(current_size, 2),
        "max_size_mb": max_size,
        "usage_percent": round((current_size / max_size) * 100, 1) if max_size > 0 else 0,
        "total_logs": total_logs,
    }
