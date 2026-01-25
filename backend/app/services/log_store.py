"""Log storage and retrieval service."""

from datetime import datetime, timedelta
from typing import Optional

from ..database import fetch_all, fetch_one, execute, commit
from ..models import LogEntry


async def get_logs(
    env: str,
    namespace: Optional[str] = None,
    service: Optional[str] = None,
    pod: Optional[str] = None,
    limit: int = 500,
    offset: int = 0,
) -> tuple[list[LogEntry], int]:
    """
    Get logs with optional filtering.
    
    Returns:
        Tuple of (list of logs, total count)
    """
    # Build query with filters
    conditions = ["env = ?"]
    params = [env]
    
    if namespace:
        conditions.append("namespace = ?")
        params.append(namespace)
    
    if service:
        conditions.append("service = ?")
        params.append(service)
    
    if pod:
        conditions.append("pod = ?")
        params.append(pod)
    
    where_clause = " AND ".join(conditions)
    
    # Get total count
    count_row = await fetch_one(
        f"SELECT COUNT(*) as count FROM logs WHERE {where_clause}",
        tuple(params)
    )
    total = count_row["count"] if count_row else 0
    
    # Get logs (newest first, with id ASC to preserve kubectl order within same timestamp)
    params.extend([limit, offset])
    rows = await fetch_all(
        f"""
        SELECT id, timestamp, env, namespace, service, pod, container, message
        FROM logs
        WHERE {where_clause}
        ORDER BY timestamp DESC, id ASC
        LIMIT ? OFFSET ?
        """,
        tuple(params)
    )
    
    logs = [
        LogEntry(
            id=row["id"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
            env=row["env"],
            namespace=row["namespace"],
            service=row["service"],
            pod=row["pod"],
            container=row["container"],
            message=row["message"],
        )
        for row in rows
    ]
    
    return logs, total


def escape_fts5_query(query: str) -> str:
    """
    Escape a search query for FTS5.
    
    FTS5 has special characters that need to be escaped:
    - Wrap the entire query in double quotes for phrase/literal search
    - Escape any existing double quotes by doubling them
    
    This ensures characters like '.', ':', '*', '+', '-', etc. are treated literally.
    """
    # First, escape any double quotes in the query by doubling them
    escaped = query.replace('"', '""')
    # Wrap in double quotes to treat as a phrase/literal search
    return f'"{escaped}"'


async def search_logs(
    env: str,
    query: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    namespace: Optional[str] = None,
    service: Optional[str] = None,
    pod: Optional[str] = None,
    limit: int = 100,
) -> tuple[list[LogEntry], int]:
    """
    Search logs using full-text search.
    
    Supports:
    - Simple queries: "error" - matches logs containing "error"
    - AND queries: term1 AND term2 - both terms must be present
    - OR queries: term1 OR term2 - either term can be present
    - Phrase queries: "error occurred" - exact phrase match
    
    Returns:
        Tuple of (list of matching logs, total count)
    """
    # Build conditions
    conditions = ["logs.env = ?"]
    params = [env]
    
    if namespace:
        conditions.append("logs.namespace = ?")
        params.append(namespace)
    
    if service:
        conditions.append("logs.service = ?")
        params.append(service)
    
    if pod:
        conditions.append("logs.pod = ?")
        params.append(pod)
    
    if start_time:
        conditions.append("logs.timestamp >= ?")
        params.append(start_time.isoformat())
    
    if end_time:
        conditions.append("logs.timestamp <= ?")
        params.append(end_time.isoformat())
    
    where_clause = " AND ".join(conditions)
    
    # Handle FTS query: if it contains AND/OR operators, use as-is (already formatted)
    # Otherwise, escape it for simple queries
    if ' OR ' in query or ' AND ' in query:
        # Query already contains AND/OR operators - use as-is
        # The frontend has already formatted this correctly
        fts_query = query
        print(f"[Search] Using AND/OR query: {fts_query}")
    else:
        # Simple query - escape it
        fts_query = escape_fts5_query(query)
        print(f"[Search] Simple query escaped to: {fts_query}")
    
    # FTS search with JOIN (newest first, with id ASC to preserve kubectl order within same timestamp)
    search_query = f"""
        SELECT logs.id, logs.timestamp, logs.env, logs.namespace, 
               logs.service, logs.pod, logs.container, logs.message
        FROM logs
        JOIN logs_fts ON logs.id = logs_fts.rowid
        WHERE logs_fts MATCH ? AND {where_clause}
        ORDER BY logs.timestamp DESC, logs.id ASC
        LIMIT ?
    """
    
    try:
        rows = await fetch_all(
            search_query,
            (fts_query, *params, limit)
        )
    except Exception as e:
        print(f"[Search] FTS5 query error: {e}")
        print(f"[Search] Query was: {fts_query}")
        # If FTS5 fails, try a fallback LIKE-based search
        print("[Search] Falling back to LIKE-based search")
        return await _search_logs_fallback(
            env, query, start_time, end_time, namespace, service, pod, limit
        )
    
    logs = [
        LogEntry(
            id=row["id"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
            env=row["env"],
            namespace=row["namespace"],
            service=row["service"],
            pod=row["pod"],
            container=row["container"],
            message=row["message"],
        )
        for row in rows
    ]
    
    # Get count (without limit)
    count_query = f"""
        SELECT COUNT(*) as count
        FROM logs
        JOIN logs_fts ON logs.id = logs_fts.rowid
        WHERE logs_fts MATCH ? AND {where_clause}
    """
    try:
        count_row = await fetch_one(count_query, (fts_query, *params))
        total = count_row["count"] if count_row else 0
    except Exception:
        total = len(logs)
    
    print(f"[Search] Found {total} results")
    return logs, total


async def _search_logs_fallback(
    env: str,
    query: str,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    namespace: Optional[str] = None,
    service: Optional[str] = None,
    pod: Optional[str] = None,
    limit: int = 100,
) -> tuple[list[LogEntry], int]:
    """
    Fallback search using LIKE when FTS5 fails.
    Parses AND/OR logic and applies LIKE conditions.
    """
    # Build base conditions
    conditions = ["env = ?"]
    params = [env]
    
    if namespace:
        conditions.append("namespace = ?")
        params.append(namespace)
    
    if service:
        conditions.append("service = ?")
        params.append(service)
    
    if pod:
        conditions.append("pod = ?")
        params.append(pod)
    
    if start_time:
        conditions.append("timestamp >= ?")
        params.append(start_time.isoformat())
    
    if end_time:
        conditions.append("timestamp <= ?")
        params.append(end_time.isoformat())
    
    # Parse the search query for AND/OR
    # Remove quotes around terms for LIKE search
    clean_query = query.replace('"', '')
    
    if ' OR ' in clean_query:
        # OR logic: any term must match
        terms = [t.strip() for t in clean_query.split(' OR ') if t.strip()]
        like_conditions = [f"message LIKE ?" for _ in terms]
        conditions.append(f"({' OR '.join(like_conditions)})")
        params.extend([f"%{term}%" for term in terms])
    elif ' AND ' in clean_query:
        # AND logic: all terms must match
        terms = [t.strip() for t in clean_query.split(' AND ') if t.strip()]
        for term in terms:
            conditions.append("message LIKE ?")
            params.append(f"%{term}%")
    else:
        # Simple query
        conditions.append("message LIKE ?")
        params.append(f"%{clean_query}%")
    
    where_clause = " AND ".join(conditions)
    
    # Get count
    count_row = await fetch_one(
        f"SELECT COUNT(*) as count FROM logs WHERE {where_clause}",
        tuple(params)
    )
    total = count_row["count"] if count_row else 0
    
    # Get logs
    params.append(limit)
    rows = await fetch_all(
        f"""
        SELECT id, timestamp, env, namespace, service, pod, container, message
        FROM logs
        WHERE {where_clause}
        ORDER BY timestamp DESC, id ASC
        LIMIT ?
        """,
        tuple(params)
    )
    
    logs = [
        LogEntry(
            id=row["id"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
            env=row["env"],
            namespace=row["namespace"],
            service=row["service"],
            pod=row["pod"],
            container=row["container"],
            message=row["message"],
        )
        for row in rows
    ]
    
    print(f"[Search Fallback] Found {total} results using LIKE")
    return logs, total


async def get_logs_by_time_window(
    env: str,
    base_timestamp: datetime,
    window_minutes: int = 5,
    direction: str = "after",
    namespace: Optional[str] = None,
    service: Optional[str] = None,
    limit: int = 100,
) -> tuple[list[LogEntry], int]:
    """
    Get logs within a time window around a base timestamp.
    
    Args:
        env: Environment name
        base_timestamp: Center timestamp for the window
        window_minutes: Size of the window in minutes
        direction: "before", "after", or "around"
        namespace: Optional namespace filter
        service: Optional service filter
        limit: Maximum logs to return
    
    Returns:
        Tuple of (list of logs, total count)
    """
    # Calculate time bounds
    delta = timedelta(minutes=window_minutes)
    
    if direction == "before":
        start_time = base_timestamp - delta
        end_time = base_timestamp
    elif direction == "after":
        start_time = base_timestamp
        end_time = base_timestamp + delta
    else:  # around
        start_time = base_timestamp - delta
        end_time = base_timestamp + delta
    
    # Build conditions
    conditions = [
        "env = ?",
        "timestamp >= ?",
        "timestamp <= ?"
    ]
    params = [env, start_time.isoformat(), end_time.isoformat()]
    
    if namespace:
        conditions.append("namespace = ?")
        params.append(namespace)
    
    if service:
        conditions.append("service = ?")
        params.append(service)
    
    where_clause = " AND ".join(conditions)
    
    # Get count
    count_row = await fetch_one(
        f"SELECT COUNT(*) as count FROM logs WHERE {where_clause}",
        tuple(params)
    )
    total = count_row["count"] if count_row else 0
    
    # Get logs (newest first, with id ASC to preserve kubectl order within same timestamp)
    params.append(limit)
    rows = await fetch_all(
        f"""
        SELECT id, timestamp, env, namespace, service, pod, container, message
        FROM logs
        WHERE {where_clause}
        ORDER BY timestamp DESC, id ASC
        LIMIT ?
        """,
        tuple(params)
    )
    
    logs = [
        LogEntry(
            id=row["id"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
            env=row["env"],
            namespace=row["namespace"],
            service=row["service"],
            pod=row["pod"],
            container=row["container"],
            message=row["message"],
        )
        for row in rows
    ]
    
    return logs, total


async def get_distinct_namespaces(env: str) -> list[str]:
    """Get distinct namespaces that have logs for an environment."""
    rows = await fetch_all(
        "SELECT DISTINCT namespace FROM logs WHERE env = ? ORDER BY namespace",
        (env,)
    )
    return [row["namespace"] for row in rows]


async def get_distinct_services(env: str, namespace: str) -> list[str]:
    """Get distinct services that have logs for a namespace."""
    rows = await fetch_all(
        "SELECT DISTINCT service FROM logs WHERE env = ? AND namespace = ? ORDER BY service",
        (env, namespace)
    )
    return [row["service"] for row in rows]


async def clear_logs_for_pod(env: str, namespace: str, pod: str) -> int:
    """
    Clear all logs for a specific pod.
    
    This is called when a user explicitly selects a pod to ensure they see
    fresh logs rather than stale cached data. Also cleans up associated
    hash entries for deduplication.
    
    Args:
        env: Environment name
        namespace: Kubernetes namespace
        pod: Pod name
        
    Returns:
        Number of logs deleted
    """
    # Get log IDs for this pod
    rows = await fetch_all(
        "SELECT id FROM logs WHERE env = ? AND namespace = ? AND pod = ?",
        (env, namespace, pod)
    )
    
    if not rows:
        return 0
    
    log_ids = [row["id"] for row in rows]
    
    # Delete log hashes first (foreign key constraint)
    placeholders = ",".join("?" * len(log_ids))
    await execute(
        f"DELETE FROM log_hashes WHERE log_id IN ({placeholders})",
        tuple(log_ids)
    )
    
    # Delete logs (trigger will handle FTS cleanup)
    await execute(
        f"DELETE FROM logs WHERE id IN ({placeholders})",
        tuple(log_ids)
    )
    
    await commit()
    
    return len(log_ids)
