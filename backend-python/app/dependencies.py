"""
FastAPI dependency injection container.

Centralizes shared resources (httpx client, settings) so they:
  - Are created once and reused (connection pooling)
  - Can be overridden in tests via app.dependency_overrides
  - Follow the Dependency Inversion Principle
"""

from __future__ import annotations

import httpx
from fastapi import Request

from app.config import Settings, get_settings


async def get_http_client(request: Request) -> httpx.AsyncClient:
    """
    Retrieve the shared httpx.AsyncClient from app state.

    This client is created once during app lifespan and reused for
    all outbound HTTP calls — proper connection pooling instead of
    creating a new client per request.
    """
    return request.app.state.http_client


def get_current_settings() -> Settings:
    """Thin wrapper around get_settings for DI overriding in tests."""
    return get_settings()
