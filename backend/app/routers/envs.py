"""Environment-related API endpoints."""

from fastapi import APIRouter, HTTPException

from ..config import get_env_configs, get_env_config
from ..models import EnvResponse

router = APIRouter(prefix="/envs", tags=["environments"])


@router.get("", response_model=list[EnvResponse])
async def list_environments():
    """List all available environments in order: sit, replica, prod."""
    configs = get_env_configs()
    
    # Define the desired order
    env_order = {"sit": 1, "replica": 2, "prod": 3}
    
    # Sort environments by the defined order
    sorted_configs = sorted(
        configs.values(),
        key=lambda config: env_order.get(config.envName.lower(), 999)
    )
    
    return [
        EnvResponse(
            envName=config.envName,
            defaultNamespace=config.defaultNamespace,
            allowedNamespaces=config.allowedNamespaces,
            refreshInterval=config.refreshInterval,
        )
        for config in sorted_configs
    ]


@router.get("/{env_name}", response_model=EnvResponse)
async def get_environment(env_name: str):
    """Get details for a specific environment."""
    try:
        config = get_env_config(env_name)
        return EnvResponse(
            envName=config.envName,
            defaultNamespace=config.defaultNamespace,
            allowedNamespaces=config.allowedNamespaces,
            refreshInterval=config.refreshInterval,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
