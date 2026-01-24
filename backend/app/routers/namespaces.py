"""Namespace and service discovery API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from ..config import get_env_config, get_kubectl_context
from ..services.kubectl import (
    get_namespaces,
    get_services,
    get_service_selector,
    get_pods_by_selector,
    KubectlError,
)
from ..services.log_store import get_distinct_namespaces, get_distinct_services

router = APIRouter(tags=["discovery"])


@router.get("/namespaces")
async def list_namespaces(
    env: str = Query(..., description="Environment name"),
    from_cluster: bool = Query(False, description="Fetch from cluster instead of stored logs"),
):
    """
    List namespaces for an environment.
    
    By default, returns namespaces that have stored logs.
    Set from_cluster=true to fetch directly from Kubernetes.
    """
    # Validate environment
    try:
        config = get_env_config(env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if from_cluster:
        # Fetch from Kubernetes cluster
        try:
            context = get_kubectl_context(env)
            namespaces = await get_namespaces(context)
            
            # Filter by allowed namespaces if configured
            if config.allowedNamespaces:
                namespaces = [ns for ns in namespaces if ns in config.allowedNamespaces]
            
            return {
                "env": env,
                "namespaces": namespaces,
                "source": "cluster",
            }
        except KubectlError as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Return namespaces from stored logs
        namespaces = await get_distinct_namespaces(env)
        return {
            "env": env,
            "namespaces": namespaces,
            "source": "stored_logs",
        }


@router.get("/services")
async def list_services(
    env: str = Query(..., description="Environment name"),
    namespace: str = Query(..., description="Namespace"),
    from_cluster: bool = Query(False, description="Fetch from cluster instead of stored logs"),
):
    """
    List services in a namespace.
    
    By default, returns services that have stored logs.
    Set from_cluster=true to fetch directly from Kubernetes.
    """
    # Validate environment
    try:
        get_env_config(env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if from_cluster:
        # Fetch from Kubernetes cluster
        try:
            context = get_kubectl_context(env)
            services = await get_services(context, namespace)
            return {
                "env": env,
                "namespace": namespace,
                "services": services,
                "source": "cluster",
            }
        except KubectlError as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Return services from stored logs
        services = await get_distinct_services(env, namespace)
        return {
            "env": env,
            "namespace": namespace,
            "services": services,
            "source": "stored_logs",
        }


@router.get("/pods")
async def list_pods(
    env: str = Query(..., description="Environment name"),
    namespace: str = Query(..., description="Namespace"),
    service: str = Query(..., description="Service name"),
):
    """
    List pods for a service in a namespace.
    Fetches directly from Kubernetes cluster.
    """
    # Validate environment
    try:
        get_env_config(env)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    try:
        context = get_kubectl_context(env)
        
        # Get service selector
        selector = await get_service_selector(context, namespace, service)
        if not selector:
            return {
                "env": env,
                "namespace": namespace,
                "service": service,
                "pods": [],
                "error": "No selector found for service",
            }
        
        # Get pods matching selector
        pods = await get_pods_by_selector(context, namespace, selector)
        
        return {
            "env": env,
            "namespace": namespace,
            "service": service,
            "pods": pods,
        }
    except KubectlError as e:
        raise HTTPException(status_code=500, detail=str(e))
