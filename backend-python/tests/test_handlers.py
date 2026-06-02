"""
Tests for the AI design-generation handler.

Uses:
  - DI override for settings (no monkeypatching)
  - DI override for httpx client (no mock context managers)
  - Proper async test patterns
"""

from __future__ import annotations

from unittest.mock import AsyncMock

import httpx
import pytest

from app.dependencies import get_current_settings, get_http_client
from app.main import app


# ── TEST: Health endpoint ───────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint(test_client):
    """Health check should always return 200."""
    resp = await test_client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ── TEST: Readiness endpoint ───────────────────────────────────

@pytest.mark.asyncio
async def test_readiness_endpoint(test_client):
    """Readiness check should return status and connection count."""
    resp = await test_client.get("/health/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "active_ws_connections" in data


# ── TEST: Generate design (success) ────────────────────────────

@pytest.mark.asyncio
async def test_generate_design_success(test_client, sample_ai_response):
    """Happy path: valid prompt → AI returns valid graph."""
    # Create a mock httpx client that returns our sample response
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(
        return_value=httpx.Response(200, json=sample_ai_response)
    )

    # Override the DI dependency (must accept Request like the real one)
    async def mock_get_http_client(request=None):
        return mock_client

    app.dependency_overrides[get_http_client] = mock_get_http_client

    try:
        resp = await test_client.post(
            "/api/ai/generate",
            json={"prompt": "Design a Twitter clone"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["nodes"]) == 2
        assert len(data["edges"]) == 1
        assert data["explanation"] == "Simple architecture"
    finally:
        del app.dependency_overrides[get_http_client]


# ── TEST: Missing API key ──────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_design_missing_api_key(test_client):
    """Should return 500 when GROK_API_KEY is not set."""
    from app.config import Settings

    def no_key_settings():
        return Settings(grok_api_key="", xai_endpoint="https://fake.api/v1/chat/completions")

    app.dependency_overrides[get_current_settings] = no_key_settings

    try:
        resp = await test_client.post(
            "/api/ai/generate",
            json={"prompt": "anything"},
        )
        assert resp.status_code == 500
        assert "GROK_API_KEY" in resp.json()["detail"]
    finally:
        del app.dependency_overrides[get_current_settings]


# ── TEST: Prompt too short ─────────────────────────────────────

@pytest.mark.asyncio
async def test_generate_design_prompt_too_short(test_client):
    """Prompt must be at least 3 characters."""
    resp = await test_client.post(
        "/api/ai/generate",
        json={"prompt": "ab"},
    )
    assert resp.status_code == 422  # Pydantic validation error


# ── TEST: LLM returns malformed JSON ───────────────────────────

@pytest.mark.asyncio
async def test_generate_design_malformed_ai_response(test_client):
    """Should return 500 when AI returns unparseable JSON."""
    bad_response = {
        "choices": [{"message": {"content": "not valid json {{"}}]
    }

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(
        return_value=httpx.Response(200, json=bad_response)
    )

    async def mock_get_http_client(request=None):
        return mock_client

    app.dependency_overrides[get_http_client] = mock_get_http_client

    try:
        resp = await test_client.post(
            "/api/ai/generate",
            json={"prompt": "Design a chat app"},
        )
        assert resp.status_code == 500
        assert "malformed" in resp.json()["detail"].lower()
    finally:
        del app.dependency_overrides[get_http_client]
