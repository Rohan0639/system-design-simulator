"""
Custom middleware for production observability.

Provides:
  - Request ID generation and propagation (X-Request-ID header)
  - Request timing (X-Process-Time header)
  - Structured request/response logging
"""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.middleware")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Injects a unique request ID into every HTTP request.

    - Reads ``X-Request-ID`` from the incoming request (e.g. from a gateway).
    - If absent, generates a new UUID4.
    - Adds it to the response headers so the client can correlate.
    - Logs request start/end with timing.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Re-use upstream request ID or generate a new one
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        request.state.request_id = request_id

        start = time.perf_counter()
        method = request.method
        path = request.url.path

        logger.info(
            "→ %s %s  [req_id=%s]",
            method,
            path,
            request_id,
        )

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{elapsed_ms:.1f}ms"

        logger.info(
            "← %s %s  %d  %.1fms  [req_id=%s]",
            method,
            path,
            response.status_code,
            elapsed_ms,
            request_id,
        )

        return response
