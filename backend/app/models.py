"""Pydantic models for the Kubernetes Log Explorer."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class EnvConfig(BaseModel):
    """Environment configuration model."""
    envName: str
    kubectlContext: str
    defaultNamespace: str
    allowedNamespaces: Optional[list[str]] = None
    refreshInterval: int = 300  # Default 5 minutes


class EnvResponse(BaseModel):
    """Response model for environment listing."""
    envName: str
    defaultNamespace: str
    allowedNamespaces: Optional[list[str]] = None
    refreshInterval: int


class LogEntry(BaseModel):
    """Single log entry model."""
    id: int
    timestamp: datetime
    env: str
    namespace: str
    service: str
    pod: str
    container: str
    message: str


class LogsResponse(BaseModel):
    """Response model for log queries."""
    logs: list[LogEntry]
    total: int
    hasMore: bool


class SearchRequest(BaseModel):
    """Request model for search queries."""
    env: str
    query: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 100


class FetchLogsRequest(BaseModel):
    """Request model for fetching logs from Kubernetes."""
    env: str
    namespace: str
    service: str
    pod: Optional[str] = None  # Optional: fetch logs for specific pod only


class PodInfo(BaseModel):
    """Pod information model."""
    name: str
    status: str
    containers: list[str]


class TimeWindowRequest(BaseModel):
    """Request model for time-window log queries."""
    env: str
    baseTimestamp: datetime
    windowMinutes: int = 5
    service: Optional[str] = None
    namespace: Optional[str] = None


class RefreshState(BaseModel):
    """Refresh state for a service."""
    env: str
    namespace: str
    service: str
    last_refresh: Optional[datetime] = None
    last_log_timestamp: Optional[datetime] = None


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
