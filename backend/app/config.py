"""Configuration loader for environment configs."""

import os
from pathlib import Path
from typing import Dict

import yaml

from .models import EnvConfig


# Global storage for environment configurations
_env_configs: Dict[str, EnvConfig] = {}


def get_config_dir() -> Path:
    """Get the path to the env-config directory."""
    return Path(__file__).parent / "env-config"


def load_env_configs() -> Dict[str, EnvConfig]:
    """Load all environment configurations from YAML files."""
    global _env_configs
    _env_configs = {}
    
    config_dir = get_config_dir()
    if not config_dir.exists():
        raise RuntimeError(f"Config directory not found: {config_dir}")
    
    for config_file in config_dir.glob("*.yaml"):
        try:
            with open(config_file, "r") as f:
                data = yaml.safe_load(f)
                if data:
                    config = EnvConfig(**data)
                    _env_configs[config.envName] = config
        except Exception as e:
            print(f"Warning: Failed to load config {config_file}: {e}")
    
    if not _env_configs:
        raise RuntimeError("No environment configurations found")
    
    return _env_configs


def get_env_configs() -> Dict[str, EnvConfig]:
    """Get all loaded environment configurations."""
    if not _env_configs:
        load_env_configs()
    return _env_configs


def get_env_config(env_name: str) -> EnvConfig:
    """Get configuration for a specific environment."""
    configs = get_env_configs()
    if env_name not in configs:
        raise ValueError(f"Unknown environment: {env_name}")
    return configs[env_name]


def get_kubectl_context(env_name: str) -> str:
    """Get the kubectl context for an environment."""
    config = get_env_config(env_name)
    return config.kubectlContext


# Application settings
class Settings:
    """Application settings."""
    APP_NAME: str = "K8s Log Explorer"
    VERSION: str = "1.0.0"
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "logs.db")
    MAX_DB_SIZE_MB: int = 100
    DEFAULT_LOG_LIMIT: int = 100
    MAX_LOG_LIMIT: int = 1000
    # Log fetching batch settings
    LOG_FETCH_BATCH_SIZE: int = int(os.getenv("LOG_FETCH_BATCH_SIZE", "500"))  # Number of log lines per batch (for --tail)
    LOG_FETCH_TIMEOUT: int = int(os.getenv("LOG_FETCH_TIMEOUT", "30"))  # Timeout per fetch in seconds


settings = Settings()
