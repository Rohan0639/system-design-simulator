"""
FastAPI application with production-grade patterns.

Key improvements over the basic conversion:
  - Lifespan context manager for shared resource lifecycle (httpx client)
  - Request ID middleware for distributed tracing
  - Structured logging with configurable levels
  - API versioning via router prefixes
  - Dependency injection for testability
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.handlers import ai_router
from app.handlers.connection_manager import ConnectionManager
from app.handlers.ws_handler import router as ws_router
from app.middleware import RequestIdMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manages application-scoped resources.

    Creates a shared httpx.AsyncClient on startup (connection pooling)
    and closes it cleanly on shutdown. This replaces the anti-pattern
    of creating a new client per request.
    """
    settings = get_settings()

    # ── Startup ──────────────────────────────────────────────────
    app.state.http_client = httpx.AsyncClient(
        timeout=settings.llm_timeout_seconds,
        limits=httpx.Limits(
            max_connections=20,
            max_keepalive_connections=10,
        ),
    )
    app.state.ws_manager = ConnectionManager(
        max_connections=settings.max_ws_connections,
    )

    logger.info(
        "Application started  [env=%s, port=%d]",
        settings.environment.value,
        settings.port,
    )

    yield

    # ── Shutdown ─────────────────────────────────────────────────
    await app.state.http_client.aclose()
    logger.info("Application shutdown — resources cleaned up")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""

    settings = get_settings()

    # ── Logging ──────────────────────────────────────────────────
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    app = FastAPI(
        title="System Design Simulator",
        description=(
            "Discrete-event simulation engine for system architecture analysis. "
            "Supports real-time WebSocket streaming and AI-powered design generation."
        ),
        version="2.0.0",
        lifespan=lifespan,
    )

    # ── Middleware (order matters: outermost first) ──────────────
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Health checks ───────────────────────────────────────────
    @app.get("/health", tags=["Ops"])
    async def health() -> dict:
        """Shallow health check — is the process alive?"""
        return {"status": "ok"}

    @app.get("/health/ready", tags=["Ops"])
    async def readiness() -> dict:
        """
        Deep health check — are dependencies available?

        Returns WebSocket connection count for observability.
        """
        manager: ConnectionManager = app.state.ws_manager
        return {
            "status": "ok",
            "active_ws_connections": manager.active_count,
            "environment": settings.environment.value,
        }

    # ── Routers ─────────────────────────────────────────────────
    app.include_router(ai_router)
    app.include_router(ws_router)

    return app


logger = logging.getLogger(__name__)
app = create_app()
