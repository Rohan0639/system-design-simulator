"""
WebSocket connection manager.

Tracks active connections for:
  - Connection limiting (DoS prevention)
  - Observability (how many users are simulating?)
  - Broadcast capabilities (future: admin notifications)
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Thread-safe WebSocket connection tracker.

    Usage::

        manager = ConnectionManager(max_connections=50)

        async with manager.connect(ws) as conn:
            # ws is now tracked
            ...
        # ws is automatically removed on exit
    """

    def __init__(self, max_connections: int = 50) -> None:
        self._active: set[WebSocket] = set()
        self._max = max_connections

    @property
    def active_count(self) -> int:
        """Number of currently connected WebSocket clients."""
        return len(self._active)

    @asynccontextmanager
    async def connect(self, ws: WebSocket) -> AsyncGenerator[WebSocket, None]:
        """
        Context manager that accepts the connection, tracks it,
        and cleans up on exit.

        Raises WebSocketDisconnect(4029) if the connection limit is reached.
        """
        if self.active_count >= self._max:
            await ws.close(code=4029, reason="Too many connections")
            raise WebSocketDisconnect(code=4029)

        await ws.accept()
        self._active.add(ws)
        logger.info(
            "WebSocket connected  [active=%d, max=%d]",
            self.active_count,
            self._max,
        )

        try:
            yield ws
        finally:
            self._active.discard(ws)
            logger.info(
                "WebSocket disconnected  [active=%d, max=%d]",
                self.active_count,
                self._max,
            )

    async def broadcast(self, message: str) -> None:
        """Send a message to all connected clients."""
        disconnected: list[WebSocket] = []
        for ws in self._active:
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self._active.discard(ws)
