"""Log collection and parsing service."""

import asyncio
import hashlib
import re
from datetime import datetime, timezone
from typing import Optional

from ..config import get_kubectl_context, settings
from ..database import fetch_one, execute, execute_many, commit
from .kubectl import (
    get_service_selector,
    get_pods_by_selector,
    get_pod_logs,
    KubectlError,
)
from .log_store import clear_logs_for_pod


# Common log timestamp patterns
TIMESTAMP_PATTERNS = [
    # ISO 8601 format with milliseconds: 2024-01-15T10:30:45.123Z
    (r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(Z|[+-]\d{2}:\d{2})?', '%Y-%m-%dT%H:%M:%S'),
    # ISO 8601 format without milliseconds: 2024-01-15T10:30:45Z
    (r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(Z|[+-]\d{2}:\d{2})?', '%Y-%m-%dT%H:%M:%S'),
    # Standard format with milliseconds: 2024-01-15 10:30:45.123
    (r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.(\d+)', '%Y-%m-%d %H:%M:%S'),
    # Standard format: 2024-01-15 10:30:45
    (r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', '%Y-%m-%d %H:%M:%S'),
]


def parse_timestamp(line: str) -> tuple[Optional[datetime], str, int]:
    """
    Extract timestamp from a log line, preserving milliseconds.
    
    Supports multiple timestamp formats:
    - ISO 8601 with milliseconds: 2024-01-15T10:30:45.123Z
    - ISO 8601 without milliseconds: 2024-01-15T10:30:45Z
    - Standard format with milliseconds: 2024-01-15 10:30:45.123
    - Standard format: 2024-01-15 10:30:45
    
    Args:
        line: Raw log line to parse
        
    Returns:
        Tuple of (timestamp or None, message without timestamp prefix, match end position)
    """
    for pattern, fmt in TIMESTAMP_PATTERNS:
        match = re.match(pattern, line)
        if match:
            ts_str = match.group(1)
            
            # Extract milliseconds if present (group 2 might be millis or timezone)
            millis = 0
            if len(match.groups()) >= 2 and match.group(2):
                millis_str = match.group(2)
                # Check if it's milliseconds (digits only) or timezone
                if millis_str.isdigit():
                    # Normalize to 6 digits for microseconds
                    millis_str = millis_str[:6].ljust(6, '0')
                    millis = int(millis_str)
            
            try:
                ts = datetime.strptime(ts_str, fmt)
                # Add microseconds
                ts = ts.replace(microsecond=millis, tzinfo=timezone.utc)
                message = line[match.end():].strip()
                return ts, message if message else line, match.end()
            except ValueError:
                continue
    
    return None, line, 0


def is_continuation_line(line: str) -> bool:
    """
    Check if a line is a continuation of a previous log entry (e.g., stack trace).
    
    Continuation lines typically:
    - Start with whitespace (tab or spaces)
    - Start with "at " (Java stack trace)
    - Start with "Caused by:"
    - Start with "..." (suppressed frames)
    - Don't have a timestamp at the beginning
    """
    stripped = line.strip()
    if not stripped:
        return False
    
    # Check for common stack trace patterns
    continuation_patterns = [
        r'^\s+at\s+',           # Java stack trace: "    at com.example..."
        r'^\s*Caused by:',      # Caused by exception
        r'^\s*\.\.\.\s*\d+',    # Suppressed frames: "... 15 more"
        r'^\s+\w+Exception',    # Exception continuation
        r'^\s+\w+Error',        # Error continuation
        r'^\t',                 # Tab-indented lines
    ]
    
    for pattern in continuation_patterns:
        if re.match(pattern, line):
            return True
    
    # If line doesn't start with a timestamp and starts with whitespace, it's likely a continuation
    if line[0] in ' \t':
        return True
    
    return False


def compute_log_hash(env: str, pod: str, container: str, timestamp: str, message: str) -> str:
    """
    Compute a hash for log deduplication.
    
    Uses first 100 characters of message to handle slight variations while
    maintaining uniqueness. Hash includes env, pod, container, and timestamp
    to ensure logs from different sources are not considered duplicates.
    
    Args:
        env: Environment name
        pod: Pod name
        container: Container name
        timestamp: ISO format timestamp string
        message: Log message (only first 100 chars used)
        
    Returns:
        32-character hexadecimal hash string
    """
    content = f"{env}|{pod}|{container}|{timestamp}|{message[:100]}"
    return hashlib.sha256(content.encode()).hexdigest()[:32]


def parse_logs(
    raw_logs: str,
    env: str,
    namespace: str,
    service: str,
    pod: str,
    container: str
) -> list[dict]:
    """
    Parse raw log output into structured log entries.
    
    Handles multi-line logs like Java stack traces by appending continuation lines
    to the previous entry. Lines without timestamps are treated as new entries
    unless they match continuation patterns (indented, stack traces, etc.).
    
    Timestamp parsing supports multiple formats:
    - ISO 8601 (with/without milliseconds)
    - Standard datetime format (with/without milliseconds)
    
    Args:
        raw_logs: Raw log output from kubectl (newline-separated)
        env: Environment name
        namespace: Kubernetes namespace
        service: Service name
        pod: Pod name
        container: Container name
    
    Returns:
        List of parsed log entry dictionaries, each containing:
        - timestamp: ISO format timestamp string
        - env, namespace, service, pod, container: Metadata
        - message: Log message (may contain newlines for multi-line logs)
        - hash: Deduplication hash
    """
    entries = []
    current_time = datetime.now(timezone.utc)
    current_entry = None
    
    for line in raw_logs.split('\n'):
        # Skip completely empty lines
        if not line:
            continue
        
        # Try to parse timestamp from the line first
        timestamp, message, _ = parse_timestamp(line)
        
        # If no timestamp found, check if it could be a continuation
        if timestamp is None:
            # Check if this is a continuation line (stack trace, indented, etc.)
            if current_entry is not None and is_continuation_line(line):
                # Append to the current entry's message
                current_entry["message"] += "\n" + line
                # Update hash with new message content
                current_entry["hash"] = compute_log_hash(
                    env, pod, container, 
                    current_entry["timestamp"], 
                    current_entry["message"]
                )
                continue
            else:
                # No timestamp and not a continuation - treat as new log entry
                # Save previous entry if exists
                if current_entry is not None:
                    entries.append(current_entry)
                
                # Create new entry with current time
                timestamp = current_time
                message = line
                current_entry = None  # Will be created below
        
        # If we have a timestamp (or created one above), save previous entry and create new one
        if current_entry is not None:
            entries.append(current_entry)
        
        # Create new entry
        ts_str = timestamp.isoformat()
        current_entry = {
            "timestamp": ts_str,
            "env": env,
            "namespace": namespace,
            "service": service,
            "pod": pod,
            "container": container,
            "message": message,
            "hash": compute_log_hash(env, pod, container, ts_str, message),
        }
    
    # Don't forget the last entry
    if current_entry is not None:
        entries.append(current_entry)
    
    return entries


async def get_last_log_timestamp(env: str, namespace: str, service: str) -> Optional[str]:
    """Get the last log timestamp for a service from refresh state."""
    row = await fetch_one(
        "SELECT last_log_timestamp FROM refresh_state WHERE env = ? AND namespace = ? AND service = ?",
        (env, namespace, service)
    )
    return row["last_log_timestamp"] if row else None


async def update_refresh_state(env: str, namespace: str, service: str, last_timestamp: str):
    """Update the refresh state after fetching logs."""
    await execute("""
        INSERT INTO refresh_state (env, namespace, service, last_refresh, last_log_timestamp)
        VALUES (?, ?, ?, datetime('now'), ?)
        ON CONFLICT (env, namespace, service) DO UPDATE SET
            last_refresh = datetime('now'),
            last_log_timestamp = excluded.last_log_timestamp
    """, (env, namespace, service, last_timestamp))
    await commit()


async def store_logs(entries: list[dict]) -> int:
    """
    Store log entries in the database, skipping duplicates.
    
    Processes entries in batches to avoid blocking on large datasets.
    Uses bulk operations for better performance and error handling.
    
    Returns:
        Number of new logs stored
    """
    if not entries:
        return 0
    
    stored_count = 0
    batch_size = 100  # Process 100 entries at a time
    
    try:
        # Process in batches to avoid blocking
        for i in range(0, len(entries), batch_size):
            batch = entries[i:i + batch_size]
            
            for entry in batch:
                try:
                    # Check if hash already exists
                    existing = await fetch_one(
                        "SELECT 1 FROM log_hashes WHERE hash = ?",
                        (entry["hash"],)
                    )
                    
                    if existing:
                        continue
                    
                    # Insert log entry
                    cursor = await execute("""
                        INSERT INTO logs (timestamp, env, namespace, service, pod, container, message)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        entry["timestamp"],
                        entry["env"],
                        entry["namespace"],
                        entry["service"],
                        entry["pod"],
                        entry["container"],
                        entry["message"],
                    ))
                    
                    # Store hash for deduplication
                    await execute(
                        "INSERT INTO log_hashes (hash, log_id) VALUES (?, ?)",
                        (entry["hash"], cursor.lastrowid)
                    )
                    
                    stored_count += 1
                except Exception as e:
                    # Log but continue processing other entries
                    print(f"Warning: Failed to store log entry: {e}")
                    continue
            
            # Commit after each batch to avoid long transactions
            try:
                await commit()
            except Exception as e:
                print(f"Warning: Failed to commit batch: {e}")
                # Try to continue with next batch
    
    except Exception as e:
        print(f"Error in store_logs: {e}")
        # Try to commit any partial work
        try:
            await commit()
        except Exception:
            pass
    
    return stored_count


async def collect_logs(env: str, namespace: str, service: str, pod_filter: Optional[str] = None) -> dict:
    """
    Collect logs for a service from its pods and containers.
    
    When pod_filter is specified:
    - Clears existing logs for that pod to ensure fresh view
    - Fetches recent logs using --tail (no incremental fetch)
    
    When pod_filter is None (service-wide fetch):
    - Uses incremental fetch based on last stored timestamp
    - Fetches logs from all pods matching the service selector
    
    Args:
        env: Environment name (maps to kubectl context)
        namespace: Kubernetes namespace
        service: Service name
        pod_filter: Optional pod name to fetch logs from (if None, fetches from all pods)
    
    Returns:
        Dictionary with keys:
        - success: bool - Whether collection succeeded
        - pods_processed: int - Number of pods processed
        - logs_stored: int - Number of new logs stored
        - last_timestamp: str - Latest timestamp from fetched logs
        - error: str - Error message if success is False
    """
    context = get_kubectl_context(env)
    
    try:
        # Get service selector
        selector = await get_service_selector(context, namespace, service)
        if not selector:
            return {
                "success": False,
                "error": f"No selector found for service {service}",
                "pods_processed": 0,
                "logs_stored": 0,
            }
        
        # Get pods matching selector
        pods = await get_pods_by_selector(context, namespace, selector)
        if not pods:
            return {
                "success": False,
                "error": f"No pods found for service {service}",
                "pods_processed": 0,
                "logs_stored": 0,
            }
        
        # Filter by specific pod if specified
        if pod_filter:
            pods = [p for p in pods if p["name"] == pod_filter]
            if not pods:
                return {
                    "success": False,
                    "error": f"Pod {pod_filter} not found for service {service}",
                    "pods_processed": 0,
                    "logs_stored": 0,
                }
            
            # Clear old logs for this pod to ensure fresh view
            # This prevents showing stale cached logs when user explicitly selects a pod
            await clear_logs_for_pod(env, namespace, pod_filter)
        
        # Get last log timestamp for incremental fetch
        # IMPORTANT: When fetching for a specific pod, don't use since_time
        # because the stored timestamp is service-level, not pod-level.
        # This ensures we always get logs when switching between pods.
        if pod_filter:
            # For specific pod selection, always fetch recent logs (tail)
            last_timestamp = None
        else:
            # For service-wide fetch, use incremental approach
            last_timestamp = await get_last_log_timestamp(env, namespace, service)
        
        total_logs_stored = 0
        latest_timestamp = last_timestamp
        pods_processed = 0
        
        # Batch size configuration - limits log fetching to prevent hanging
        batch_size = settings.LOG_FETCH_BATCH_SIZE
        batch_timeout = settings.LOG_FETCH_TIMEOUT
        
        for pod in pods:
            # Fetch logs from all pods regardless of status
            # Some pods might have logs even if not in Running/Succeeded state
            for container in pod["containers"]:
                try:
                    # Use batch_size to limit log fetching and prevent hanging
                    # When pod_filter is specified, use --tail with batch_size to limit recent logs
                    # When doing incremental fetch, use --since-time with timeout protection
                    raw_logs = await get_pod_logs(
                        context=context,
                        namespace=namespace,
                        pod=pod["name"],
                        container=container,
                        since_time=last_timestamp,
                        tail_lines=batch_size if pod_filter else None,  # Limit tail when fetching specific pod
                        timeout=batch_timeout,
                    )
                    
                    if not raw_logs.strip():
                        continue
                    
                    # Parse logs
                    entries = parse_logs(
                        raw_logs=raw_logs,
                        env=env,
                        namespace=namespace,
                        service=service,
                        pod=pod["name"],
                        container=container,
                    )
                    
                    if not entries:
                        continue
                    
                    # Store logs immediately
                    stored = await store_logs(entries)
                    total_logs_stored += stored
                    
                    # Track latest timestamp
                    if entries:
                        entry_ts = entries[-1]["timestamp"]
                        if latest_timestamp is None or entry_ts > latest_timestamp:
                            latest_timestamp = entry_ts
                
                except KubectlError as e:
                    # Silently skip pods/containers that can't be accessed
                    # Common cases: container not started, permission issues, timeout, etc.
                    continue
                except asyncio.TimeoutError:
                    # Timeout on fetch - continue with next container
                    continue
            
            pods_processed += 1
        
        # Update refresh state
        if latest_timestamp:
            await update_refresh_state(env, namespace, service, latest_timestamp)
        
        return {
            "success": True,
            "pods_processed": pods_processed,
            "logs_stored": total_logs_stored,
            "last_timestamp": latest_timestamp,
        }
    
    except KubectlError as e:
        return {
            "success": False,
            "error": str(e),
            "pods_processed": 0,
            "logs_stored": 0,
        }
