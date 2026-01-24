"""Background refresh scheduler for auto-fetching logs."""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

from ..config import get_env_configs
from ..database import fetch_all, fetch_one
from .log_collector import collect_logs
from .retention import enforce_retention


class RefreshScheduler:
    """
    Background scheduler for auto-refreshing logs.
    Manages refresh intervals per environment/namespace/service.
    """
    
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._subscriptions: dict[str, dict] = {}  # Key: "env:namespace:service"
    
    def _make_key(self, env: str, namespace: str, service: str) -> str:
        return f"{env}:{namespace}:{service}"
    
    def subscribe(self, env: str, namespace: str, service: str, interval_seconds: Optional[int] = None):
        """
        Subscribe a service for auto-refresh.
        
        Args:
            env: Environment name
            namespace: Kubernetes namespace
            service: Service name
            interval_seconds: Override refresh interval (uses env config default if None)
        """
        key = self._make_key(env, namespace, service)
        
        # Get default interval from env config
        if interval_seconds is None:
            configs = get_env_configs()
            if env in configs:
                interval_seconds = configs[env].refreshInterval
            else:
                interval_seconds = 300  # Default 5 minutes
        
        self._subscriptions[key] = {
            "env": env,
            "namespace": namespace,
            "service": service,
            "interval": interval_seconds,
            "last_refresh": None,
            "next_refresh": datetime.now(),
        }
        
        # Subscription logged at INFO level for monitoring
    
    def unsubscribe(self, env: str, namespace: str, service: str):
        """Unsubscribe a service from auto-refresh."""
        key = self._make_key(env, namespace, service)
        if key in self._subscriptions:
            del self._subscriptions[key]
            # Unsubscription logged at INFO level for monitoring
    
    def get_subscriptions(self) -> list[dict]:
        """Get all current subscriptions."""
        return [
            {
                **sub,
                "key": key,
                "last_refresh": sub["last_refresh"].isoformat() if sub["last_refresh"] else None,
                "next_refresh": sub["next_refresh"].isoformat() if sub["next_refresh"] else None,
            }
            for key, sub in self._subscriptions.items()
        ]
    
    async def _refresh_service(self, sub: dict) -> dict:
        """Refresh logs for a single service."""
        try:
            result = await collect_logs(
                env=sub["env"],
                namespace=sub["namespace"],
                service=sub["service"],
            )
            return result
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
            }
    
    async def _run_loop(self):
        """Main scheduler loop."""
        while self._running:
            now = datetime.now()
            
            for key, sub in list(self._subscriptions.items()):
                if sub["next_refresh"] and sub["next_refresh"] <= now:
                    # Time to refresh
                    result = await self._refresh_service(sub)
                    
                    # Update timing
                    sub["last_refresh"] = now
                    sub["next_refresh"] = now + timedelta(seconds=sub["interval"])
                    
                    if not result["success"]:
                        # Only log failures, successes are silent
                        print(f"Auto-refresh failed for {key}: {result.get('error', 'Unknown error')}")
            
            # Periodically enforce retention
            await enforce_retention()
            
            # Sleep for a bit before checking again
            await asyncio.sleep(10)
    
    def start(self):
        """Start the scheduler background task."""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        print("Refresh scheduler started")
    
    async def stop(self):
        """Stop the scheduler background task."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        print("Refresh scheduler stopped")


# Global scheduler instance
_scheduler: Optional[RefreshScheduler] = None


def get_scheduler() -> RefreshScheduler:
    """Get the global scheduler instance."""
    global _scheduler
    if _scheduler is None:
        _scheduler = RefreshScheduler()
    return _scheduler


async def start_scheduler():
    """Start the global scheduler."""
    scheduler = get_scheduler()
    scheduler.start()


async def stop_scheduler():
    """Stop the global scheduler."""
    global _scheduler
    if _scheduler:
        await _scheduler.stop()
        _scheduler = None
