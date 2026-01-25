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
    Search logs using full-text search or LIKE-based search.
    
    Supports:
    - Simple queries: "error" - matches logs containing "error"
    - AND queries: term1 AND term2 - both terms must be present
    - OR queries: term1 OR term2 - either term can be present
    - Phrase queries: "error occurred" - exact phrase match
    
    For AND/OR queries, uses LIKE-based search for 100% reliability.
    For simple queries, uses FTS5 for performance.
    
    Returns:
        Tuple of (list of matching logs, total count)
    """
    print(f"[Search] Received query: {query}")
    
    # For AND/OR/NOT queries, use LIKE-based search for guaranteed reliability
    # FTS5's boolean operators can be unreliable with certain tokenizations
    if ' OR ' in query or ' AND ' in query or ' NOT ' in query:
        print(f"[Search] Detected AND/OR/NOT query, using LIKE-based search")
        return await _search_logs_like(
            env, query, start_time, end_time, namespace, service, pod, limit
        )
    
    # For simple queries, use FTS5 for performance
    return await _search_logs_fts5(
        env, query, start_time, end_time, namespace, service, pod, limit
    )


async def _search_logs_fts5(
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
    Search logs using FTS5 full-text search.
    Used for simple single-term queries.
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
    
    # Escape the query for FTS5
    fts_query = escape_fts5_query(query)
    print(f"[Search FTS5] Query: {fts_query}")
    
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
        print(f"[Search FTS5] Error: {e}, falling back to LIKE search")
        return await _search_logs_like(
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
    
    print(f"[Search FTS5] Found {total} results")
    return logs, total


async def _search_logs_like(
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
    Search logs using SQL LIKE operator.
    Handles AND/OR logic with 100% reliability.
    
    This is used for:
    - AND/OR queries (FTS5 boolean operators can be unreliable)
    - Fallback when FTS5 fails
    """
    # Build base conditions
    conditions = ["env = ?"]
    params: list = [env]
    
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
    
    # Parse the search query for AND/OR/NOT
    # Remove quotes around terms for LIKE search
    clean_query = query.replace('"', '')
    
    # First, extract NOT terms
    not_terms = []
    remaining_query = clean_query
    
    # Extract NOT terms (NOT followed by a word, can be at start or middle)
    import re
    not_pattern = r'(?:^|\s+)NOT\s+(\S+)'
    not_matches = re.findall(not_pattern, remaining_query, re.IGNORECASE)
    not_terms.extend(not_matches)
    remaining_query = re.sub(not_pattern, '', remaining_query, flags=re.IGNORECASE).strip()
    
    # Parse terms, handling both AND and OR
    if ' OR ' in remaining_query:
        # OR logic: any term must match
        # Split by OR first
        or_parts = remaining_query.split(' OR ')
        or_conditions = []
        
        for part in or_parts:
            part = part.strip()
            if not part:
                continue
            
            # Each OR part might have AND within it
            if ' AND ' in part:
                and_terms = [t.strip() for t in part.split(' AND ') if t.strip()]
                and_conditions = ["message LIKE ?" for _ in and_terms]
                or_conditions.append(f"({' AND '.join(and_conditions)})")
                params.extend([f"%{term}%" for term in and_terms])
            else:
                or_conditions.append("message LIKE ?")
                params.append(f"%{part}%")
        
        if or_conditions:
            conditions.append(f"({' OR '.join(or_conditions)})")
        
        print(f"[Search LIKE] OR query with {len(or_conditions)} parts")
        
    elif ' AND ' in remaining_query:
        # AND logic: all terms must match
        terms = [t.strip() for t in remaining_query.split(' AND ') if t.strip()]
        for term in terms:
            conditions.append("message LIKE ?")
            params.append(f"%{term}%")
        
        print(f"[Search LIKE] AND query with {len(terms)} terms: {terms}")
        
    elif remaining_query:
        # Simple query
        conditions.append("message LIKE ?")
        params.append(f"%{remaining_query}%")
        print(f"[Search LIKE] Simple query: {remaining_query}")
    
    # Add NOT conditions (must NOT contain these terms)
    for not_term in not_terms:
        conditions.append("message NOT LIKE ?")
        params.append(f"%{not_term}%")
    
    if not_terms:
        print(f"[Search LIKE] NOT terms: {not_terms}")
    
    where_clause = " AND ".join(conditions)
    
    # Debug: print the full query
    print(f"[Search LIKE] WHERE clause: {where_clause}")
    print(f"[Search LIKE] Params: {params}")
    
    # Get count
    count_query = f"SELECT COUNT(*) as count FROM logs WHERE {where_clause}"
    count_row = await fetch_one(count_query, tuple(params))
    total = count_row["count"] if count_row else 0
    
    # Get logs
    select_query = f"""
        SELECT id, timestamp, env, namespace, service, pod, container, message
        FROM logs
        WHERE {where_clause}
        ORDER BY timestamp DESC, id ASC
        LIMIT ?
    """
    rows = await fetch_all(select_query, tuple([*params, limit]))
    
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
    
    print(f"[Search LIKE] Found {total} results")
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


async def extract_fields(
    env: str,
    namespace: Optional[str] = None,
    service: Optional[str] = None,
    pod: Optional[str] = None,
    limit: int = 5000,
) -> dict:
    """
    Extract fields from log messages for filtering.
    
    Parses log messages to find:
    - key=value pairs (e.g., level=INFO, status=200)
    - Log levels in brackets like [INFO], [ERROR]
    - HTTP methods (GET, POST, PUT, DELETE, PATCH)
    - HTTP status codes (200, 404, 500, etc.)
    - JSON field values for common fields
    
    Args:
        env: Environment name
        namespace: Optional namespace filter
        service: Optional service filter
        pod: Optional pod filter
        limit: Max logs to analyze (default 5000)
        
    Returns:
        Dictionary with field names as keys and dict of {value: count} as values
    """
    import re
    import json
    
    # Build query with filters
    conditions = ["env = ?"]
    params: list = [env]
    
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
    
    # Fetch log messages
    params.append(limit)
    rows = await fetch_all(
        f"""
        SELECT message FROM logs
        WHERE {where_clause}
        ORDER BY timestamp DESC
        LIMIT ?
        """,
        tuple(params)
    )
    
    # Initialize field counters
    fields: dict[str, dict[str, int]] = {}
    
    # ANSI escape code pattern (to strip color codes)
    ansi_pattern = re.compile(r'\x1b\[[0-9;]*m|\[\d+m')
    
    # Patterns for extraction
    # key=value pattern (handles quoted values too)
    kv_pattern = re.compile(r'(\w+)=(?:"([^"]+)"|(\S+))')
    # JSON "key": "value" pattern (for JSON logs)
    json_kv_pattern = re.compile(r'"(\w+)":\s*"([^"]*)"')
    # Log level in brackets: [INFO], [ERROR], [WARN], [DEBUG], [TRACE]
    level_bracket_pattern = re.compile(r'\[(INFO|ERROR|WARN|WARNING|DEBUG|TRACE|FATAL|CRITICAL)\]', re.IGNORECASE)
    # HTTP methods
    http_method_pattern = re.compile(r'\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b')
    # HTTP status codes (3-digit numbers that look like status codes)
    http_status_pattern = re.compile(r'\b(status[=:]?\s*|HTTP[/\s]+\d\.\d\s+)?([1-5]\d{2})\b')
    
    # Fields to extract from JSON logs
    json_fields_to_extract = ['level', 'severity', 'status', 'method', 'path', 'code', 'type', 'action', 'event', 'class', 'application']
    
    def add_field_value(field: str, value: str):
        """Add a field value to the counters."""
        if not value or len(value) > 100:  # Skip empty or very long values
            return
        value = value.strip()
        if not value:
            return
        if field not in fields:
            fields[field] = {}
        fields[field][value] = fields[field].get(value, 0) + 1
    
    for row in rows:
        message = row["message"]
        if not message:
            continue
        
        # Strip ANSI color codes
        clean_message = ansi_pattern.sub('', message)
        
        # Try to find and parse JSON anywhere in the message
        json_found = False
        json_start = clean_message.find('{')
        if json_start != -1:
            # Try to extract JSON from the message
            json_text = clean_message[json_start:]
            # Find matching closing brace
            brace_count = 0
            json_end = -1
            for i, c in enumerate(json_text):
                if c == '{':
                    brace_count += 1
                elif c == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break
            
            if json_end > 0:
                try:
                    json_data = json.loads(json_text[:json_end])
                    if isinstance(json_data, dict):
                        json_found = True
                        # Extract common JSON fields
                        for json_field in json_fields_to_extract:
                            if json_field in json_data:
                                value = str(json_data[json_field])
                                # Shorten class names to just the class (not full package)
                                if json_field == 'class' and '.' in value:
                                    value = value.split('.')[-1]
                                add_field_value(json_field, value)
                except (json.JSONDecodeError, ValueError):
                    pass  # Not valid JSON
        
        # If no valid JSON found, try regex-based JSON key:value extraction
        if not json_found and '"' in clean_message:
            for match in json_kv_pattern.finditer(clean_message):
                key = match.group(1).lower()
                value = match.group(2)
                # Only extract specific fields we care about
                if key in json_fields_to_extract:
                    # Shorten class names
                    if key == 'class' and '.' in value:
                        value = value.split('.')[-1]
                    add_field_value(key, value)
        
        # Extract key=value pairs (for non-JSON logs)
        for match in kv_pattern.finditer(clean_message):
            key = match.group(1).lower()
            value = match.group(2) or match.group(3)  # Quoted or unquoted value
            # Skip very common/noisy fields
            if key in ('t', 'ts', 'time', 'timestamp', 'date', 'msg', 'message', 'id', 'uuid', 'trace_id', 'span_id', 'request_id'):
                continue
            add_field_value(key, value)
        
        # Extract log levels from brackets
        for match in level_bracket_pattern.finditer(message):
            level = match.group(1).upper()
            if level == 'WARNING':
                level = 'WARN'
            add_field_value('level', level)
        
        # Extract HTTP methods
        for match in http_method_pattern.finditer(message):
            add_field_value('http_method', match.group(1))
        
        # Extract HTTP status codes (be careful to avoid false positives)
        for match in http_status_pattern.finditer(message):
            status = match.group(2)
            # Only include if it looks like a real status code context
            if match.group(1) or message.count(status) == 1:
                add_field_value('http_status', status)
    
    # Filter out fields with too many unique values (likely not useful for filtering)
    # and sort values by count
    result = {}
    for field, values in fields.items():
        if len(values) > 50:  # Skip fields with too many unique values
            continue
        if sum(values.values()) < 2:  # Skip fields that appear only once
            continue
        # Sort by count descending, then by value
        sorted_values = dict(sorted(values.items(), key=lambda x: (-x[1], x[0])))
        # Limit to top 20 values per field
        result[field] = dict(list(sorted_values.items())[:20])
    
    # Sort fields by total count (most common first)
    sorted_result = dict(sorted(
        result.items(),
        key=lambda x: (-sum(x[1].values()), x[0])
    ))
    
    return sorted_result
