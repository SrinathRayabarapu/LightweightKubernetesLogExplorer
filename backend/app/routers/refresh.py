"""Refresh control API endpoints."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..config import get_env_config
from ..services.refresh_scheduler import get_scheduler

router = APIRouter(prefix="/refresh", tags=["refresh"])


class SubscribeRequest(BaseModel):
    """Request model for subscribing to auto-refresh."""
    env: str
    namespace: str
    service: str
    interval_seconds: Optional[int] = None


@router.post("/subscribe")
async def subscribe_to_refresh(request: SubscribeRequest):
    """
    Subscribe a service for auto-refresh.
    Logs will be fetched automatically at the configured interval.
    """
    # Validate environment
    try:
        config = get_env_config(request.env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    scheduler = get_scheduler()
    scheduler.subscribe(
        env=request.env,
        namespace=request.namespace,
        service=request.service,
        interval_seconds=request.interval_seconds or config.refreshInterval,
    )
    
    return {
        "status": "subscribed",
        "env": request.env,
        "namespace": request.namespace,
        "service": request.service,
        "interval_seconds": request.interval_seconds or config.refreshInterval,
    }


@router.post("/unsubscribe")
async def unsubscribe_from_refresh(request: SubscribeRequest):
    """Unsubscribe a service from auto-refresh."""
    scheduler = get_scheduler()
    scheduler.unsubscribe(
        env=request.env,
        namespace=request.namespace,
        service=request.service,
    )
    
    return {
        "status": "unsubscribed",
        "env": request.env,
        "namespace": request.namespace,
        "service": request.service,
    }


@router.get("/subscriptions")
async def list_subscriptions():
    """List all active auto-refresh subscriptions."""
    scheduler = get_scheduler()
    return {
        "subscriptions": scheduler.get_subscriptions(),
    }


@router.get("/state")
async def get_refresh_state(
    env: str = Query(..., description="Environment name"),
    namespace: str = Query(..., description="Namespace"),
    service: str = Query(..., description="Service name"),
):
    """Get refresh state for a specific service."""
    from ..database import fetch_one
    
    row = await fetch_one(
        """
        SELECT last_refresh, last_log_timestamp 
        FROM refresh_state 
        WHERE env = ? AND namespace = ? AND service = ?
        """,
        (env, namespace, service)
    )
    
    if row:
        return {
            "env": env,
            "namespace": namespace,
            "service": service,
            "last_refresh": row["last_refresh"],
            "last_log_timestamp": row["last_log_timestamp"],
        }
    
    return {
        "env": env,
        "namespace": namespace,
        "service": service,
        "last_refresh": None,
        "last_log_timestamp": None,
    }
