"""Kubectl subprocess wrapper for Kubernetes operations."""

import asyncio
import json
import re
from typing import Optional


class KubectlError(Exception):
    """Exception raised when kubectl command fails."""
    def __init__(self, message: str, stderr: str = ""):
        self.message = message
        self.stderr = stderr
        super().__init__(self.message)


async def run_kubectl(context: str, args: list[str], timeout: int = 30) -> str:
    """
    Execute a kubectl command with the specified context.
    
    Args:
        context: The kubectl context to use
        args: Additional arguments for kubectl
        timeout: Command timeout in seconds
    
    Returns:
        Command stdout as string
    
    Raises:
        KubectlError: If the command fails
    """
    cmd = ["kubectl", "--context", context] + args
    proc = None
    stdout_data = None
    stderr_data = None
    
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        try:
            stdout_data, stderr_data = await asyncio.wait_for(
                proc.communicate(),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            # Timeout occurred - kill the process safely
            if proc:
                try:
                    # Try graceful termination first
                    proc.terminate()
                    try:
                        await asyncio.wait_for(proc.wait(), timeout=2)
                    except asyncio.TimeoutError:
                        # Force kill if terminate didn't work
                        proc.kill()
                        await proc.wait()
                except ProcessLookupError:
                    # Process already terminated
                    pass
                except Exception as e:
                    # Log but don't fail on cleanup errors
                    print(f"Warning: Error cleaning up kubectl process: {e}")
            
            raise KubectlError(f"kubectl command timed out after {timeout}s")
        
        # Check return code after successful communication
        if proc.returncode != 0:
            error_msg = ""
            if stderr_data:
                try:
                    error_msg = stderr_data.decode('utf-8', errors='replace').strip()
                except Exception:
                    error_msg = f"kubectl exited with code {proc.returncode}"
            else:
                error_msg = f"kubectl exited with code {proc.returncode}"
            raise KubectlError(error_msg, error_msg)
        
        # Decode stdout safely
        if stdout_data:
            try:
                return stdout_data.decode('utf-8', errors='replace')
            except Exception as e:
                raise KubectlError(f"Failed to decode kubectl output: {e}")
        return ""
    
    except FileNotFoundError:
        raise KubectlError("kubectl not found. Please install kubectl and ensure it's in PATH.")
    except KubectlError:
        # Re-raise kubectl errors as-is
        raise
    except Exception as e:
        # Clean up process on any unexpected error
        if proc:
            try:
                if proc.returncode is None:
                    proc.kill()
                    await proc.wait()
            except Exception:
                pass
        raise KubectlError(f"Unexpected error executing kubectl: {e}")


async def get_namespaces(context: str) -> list[str]:
    """Get list of namespaces in the cluster."""
    output = await run_kubectl(context, [
        "get", "namespaces",
        "-o", "jsonpath={.items[*].metadata.name}"
    ])
    return output.strip().split() if output.strip() else []


async def get_services(context: str, namespace: str) -> list[str]:
    """Get list of services in a namespace."""
    output = await run_kubectl(context, [
        "get", "services",
        "-n", namespace,
        "-o", "jsonpath={.items[*].metadata.name}"
    ])
    return output.strip().split() if output.strip() else []


async def get_service_selector(context: str, namespace: str, service: str) -> dict:
    """Get the selector for a service."""
    output = await run_kubectl(context, [
        "get", "service", service,
        "-n", namespace,
        "-o", "json"
    ])
    
    service_data = json.loads(output)
    selector = service_data.get("spec", {}).get("selector", {})
    return selector


async def get_pods_by_selector(context: str, namespace: str, selector: dict) -> list[dict]:
    """Get pods matching a label selector."""
    if not selector:
        return []
    
    # Build label selector string: key1=value1,key2=value2
    selector_str = ",".join(f"{k}={v}" for k, v in selector.items())
    
    output = await run_kubectl(context, [
        "get", "pods",
        "-n", namespace,
        "-l", selector_str,
        "-o", "json"
    ])
    
    pods_data = json.loads(output)
    pods = []
    
    for item in pods_data.get("items", []):
        pod_name = item.get("metadata", {}).get("name", "")
        containers = []
        
        # Get container names from spec
        for container in item.get("spec", {}).get("containers", []):
            containers.append(container.get("name", ""))
        
        if pod_name and containers:
            pods.append({
                "name": pod_name,
                "containers": containers,
                "status": item.get("status", {}).get("phase", "Unknown")
            })
    
    return pods


def format_timestamp_for_kubectl(timestamp: str) -> str:
    """
    Format a timestamp for kubectl --since-time flag.
    
    kubectl expects RFC3339 format like: 2024-01-15T10:00:00Z
    Python's isoformat() produces: 2024-01-15T10:00:00.123456+00:00
    
    This function:
    - Removes microseconds (kubectl doesn't support them)
    - Converts +00:00 timezone to Z for UTC
    
    Args:
        timestamp: ISO format timestamp string
        
    Returns:
        RFC3339 formatted timestamp string compatible with kubectl
    """
    # Remove microseconds if present (everything between . and + or Z)
    # Pattern: match .microseconds before timezone
    normalized = re.sub(r'\.\d+', '', timestamp)
    # Replace +00:00 with Z for UTC
    normalized = re.sub(r'\+00:00$', 'Z', normalized)
    return normalized


async def get_pod_logs(
    context: str,
    namespace: str,
    pod: str,
    container: str,
    since_time: Optional[str] = None,
    tail_lines: Optional[int] = None,
    timeout: Optional[int] = None
) -> str:
    """
    Fetch logs from a specific container in a pod.
    
    Args:
        context: kubectl context
        namespace: Kubernetes namespace
        pod: Pod name
        container: Container name
        since_time: ISO timestamp to fetch logs from (e.g., "2024-01-15T10:00:00Z")
        tail_lines: Number of lines to fetch if no since_time (None means no limit)
        timeout: Command timeout in seconds (defaults to 60 if not specified)
    
    Returns:
        Raw log output as string
    """
    args = [
        "logs", pod,
        "-n", namespace,
        "-c", container,
    ]
    
    if since_time:
        # Format timestamp for kubectl compatibility
        formatted_time = format_timestamp_for_kubectl(since_time)
        args.extend(["--since-time", formatted_time])
        # When using --since-time, we can't limit lines, but timeout will protect us
    elif tail_lines is not None:
        args.extend(["--tail", str(tail_lines)])
    # If both are None, fetch all logs (with timeout protection)
    
    # Use provided timeout or default to 60 seconds
    cmd_timeout = timeout if timeout is not None else 60
    
    try:
        return await run_kubectl(context, args, timeout=cmd_timeout)
    except KubectlError as e:
        # Return empty string for common non-fatal errors
        if "is waiting to start" in str(e) or "ContainerCreating" in str(e):
            return ""
        raise
