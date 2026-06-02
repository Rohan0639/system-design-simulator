"""
Application configuration with environment-aware settings.

Production patterns:
  - pydantic-settings auto-loads from .env
  - Typed fields fail fast if misconfigured
  - Computed properties for derived config
  - No module-level singleton — use FastAPI Depends() instead
"""

from __future__ import annotations

from enum import Enum
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class Environment(str, Enum):
    DEV = "dev"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """
    All tunables live here. Values come from environment variables
    (uppercased, e.g. ``GROK_API_KEY``) or the ``.env`` file.
    """

    # ── Environment ──────────────────────────────────────────────
    environment: Environment = Environment.DEV
    debug: bool = False
    log_level: str = "INFO"

    # ── Server ───────────────────────────────────────────────────
    port: int = 8080
    allowed_origins: list[str] = Field(default=["*"])

    # ── AI / LLM ─────────────────────────────────────────────────
    grok_api_key: str = ""
    xai_endpoint: str = "https://api.x.ai/v1/chat/completions"
    llm_timeout_seconds: float = 60.0
    llm_max_retries: int = 3

    # ── Simulation limits (DoS prevention) ───────────────────────
    max_rps: int = Field(default=100_000, ge=1)
    max_duration_seconds: int = Field(default=300, ge=1)

    # ── WebSocket ────────────────────────────────────────────────
    max_ws_connections: int = Field(default=50, ge=1)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION


@lru_cache
def get_settings() -> Settings:
    """
    Cached factory for settings. Use as a FastAPI dependency::

        @router.get("/")
        async def endpoint(settings: Settings = Depends(get_settings)):
            ...

    Tests override via ``app.dependency_overrides[get_settings] = ...``
    """
    return Settings()
