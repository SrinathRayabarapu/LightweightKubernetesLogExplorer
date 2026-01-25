"""Log-related API endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from ..config import get_env_config, settings
from ..models import LogsResponse, FetchLogsRequest
from ..services.log_store import (
    get_logs,
    search_logs,
    get_logs_by_time_window,
    extract_fields,
)
from ..services.log_collector import collect_logs
from ..services.retention import enforce_retention, get_storage_stats

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=LogsResponse)
async def list_logs(
    env: str = Query(..., description="Environment name"),
    namespace: Optional[str] = Query(None, description="Namespace filter"),
    service: Optional[str] = Query(None, description="Service filter"),
    pod: Optional[str] = Query(None, description="Pod filter"),
    limit: int = Query(500, ge=1, le=1000, description="Max logs to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
):
    """
    Get logs with optional filtering.
    Returns logs sorted from newest to oldest.
    """
    # Validate environment
    try:
        get_env_config(env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    logs, total = await get_logs(
        env=env,
        namespace=namespace,
        service=service,
        pod=pod,
        limit=limit,
        offset=offset,
    )
    
    return LogsResponse(
        logs=logs,
        total=total,
        hasMore=(offset + len(logs)) < total,
    )


@router.post("/fetch")
async def fetch_logs(request: FetchLogsRequest):
    """
    Trigger log collection from Kubernetes.
    Fetches logs from all pods/containers of the specified service,
    or from a specific pod if provided.
    """
    # Validate environment
    try:
        get_env_config(request.env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Collect logs (optionally filtered by pod)
    # If fetchAll is True, fetch ALL available logs without tail limit
    result = await collect_logs(
        env=request.env,
        namespace=request.namespace,
        service=request.service,
        pod_filter=request.pod,
        fetch_all=request.fetchAll,
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to fetch logs")
        )
    
    # Enforce retention after collecting new logs
    retention_result = await enforce_retention()
    
    return {
        **result,
        "retention": retention_result,
    }


@router.get("/search", response_model=LogsResponse)
async def search(
    env: str = Query(..., description="Environment name"),
    query: str = Query(..., min_length=1, description="Search query"),
    namespace: Optional[str] = Query(None, description="Namespace filter"),
    service: Optional[str] = Query(None, description="Service filter"),
    pod: Optional[str] = Query(None, description="Pod filter"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    limit: int = Query(500, ge=1, le=1000, description="Max results"),
):
    """
    Full-text search across logs.
    Uses SQLite FTS5 for efficient searching.
    """
    # Validate environment
    try:
        get_env_config(env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    logs, total = await search_logs(
        env=env,
        query=query,
        start_time=start_time,
        end_time=end_time,
        namespace=namespace,
        service=service,
        pod=pod,
        limit=limit,
    )
    
    return LogsResponse(
        logs=logs,
        total=total,
        hasMore=len(logs) < total,
    )


@router.get("/by-time", response_model=LogsResponse)
async def get_logs_by_time(
    env: str = Query(..., description="Environment name"),
    base_timestamp: datetime = Query(..., description="Base timestamp"),
    window_minutes: int = Query(5, ge=1, le=60, description="Time window in minutes"),
    direction: str = Query("after", description="Direction: before, after, or around"),
    namespace: Optional[str] = Query(None, description="Namespace filter"),
    service: Optional[str] = Query(None, description="Service filter"),
    limit: int = Query(500, ge=1, le=1000, description="Max results"),
):
    """
    Get logs within a time window around a specific timestamp.
    Useful for Splunk-style time navigation.
    """
    # Validate environment
    try:
        get_env_config(env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Validate direction
    if direction not in ("before", "after", "around"):
        raise HTTPException(
            status_code=400,
            detail="direction must be 'before', 'after', or 'around'"
        )
    
    logs, total = await get_logs_by_time_window(
        env=env,
        base_timestamp=base_timestamp,
        window_minutes=window_minutes,
        direction=direction,
        namespace=namespace,
        service=service,
        limit=limit,
    )
    
    return LogsResponse(
        logs=logs,
        total=total,
        hasMore=len(logs) < total,
    )


@router.get("/storage")
async def storage_stats():
    """Get current storage statistics."""
    return await get_storage_stats()


@router.post("/retention/enforce")
async def trigger_retention():
    """Manually trigger retention enforcement."""
    return await enforce_retention()


@router.get("/fields")
async def get_extracted_fields(
    env: str = Query(..., description="Environment name"),
    namespace: Optional[str] = Query(None, description="Namespace filter"),
    service: Optional[str] = Query(None, description="Service filter"),
    pod: Optional[str] = Query(None, description="Pod filter"),
    limit: int = Query(5000, ge=100, le=10000, description="Max logs to analyze"),
):
    """
    Extract fields from log messages for filtering.
    
    Parses logs to find key=value pairs, log levels, HTTP methods/status codes,
    and common JSON fields. Returns field names with their values and counts.
    """
    # Validate environment
    try:
        get_env_config(env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    fields = await extract_fields(
        env=env,
        namespace=namespace,
        service=service,
        pod=pod,
        limit=limit,
    )
    
    return {"fields": fields}
