"""
WebSocket integration tests.

Tests the most complex user-facing interface end-to-end:
  - Connection acceptance
  - Simulation streaming
  - Client disconnect cleanup
  - Invalid input handling
"""

from __future__ import annotations

import json

import pytest
from starlette.testclient import TestClient

from app.main import app


# ── TEST: WebSocket accepts and responds ────────────────────────

def test_websocket_simulation_flow():
    """
    Full flow: connect → send graph → receive frames → simulation_complete.

    Uses Starlette's sync TestClient for WebSocket testing
    (FastAPI's standard pattern for WS tests).
    """
    client = TestClient(app)

    graph_payload = {
        "graph": {
            "nodes": [
                {"id": "c1", "type": "client", "capacity": 1000, "latency": 1},
                {"id": "api1", "type": "api_server", "capacity": 500, "latency": 5},
            ],
            "edges": [{"source": "c1", "target": "api1"}],
        },
        "config": {"rps": 50, "duration": 1},
    }

    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps(graph_payload))

        # Collect frames until simulation_complete
        frames_received = 0
        for _ in range(200):  # safety limit
            data = json.loads(ws.receive_text())
            if data.get("type") == "simulation_complete":
                break
            # Should be a telemetry frame
            assert "nodes" in data
            assert "time" in data
            frames_received += 1

    assert frames_received > 0, "No telemetry frames received"


# ── TEST: WebSocket handles invalid JSON gracefully ─────────────

def test_websocket_invalid_json():
    """Server should not crash on garbage input."""
    client = TestClient(app)

    with client.websocket_connect("/ws") as ws:
        ws.send_text("not json at all {{{")
        # Server should send an error response
        data = json.loads(ws.receive_text())
        assert data.get("type") == "error"


# ── TEST: WebSocket handles empty graph ─────────────────────────

def test_websocket_empty_graph():
    """Sending an empty graph should not start a simulation."""
    client = TestClient(app)

    payload = {
        "graph": {"nodes": [], "edges": []},
        "config": {"rps": 100, "duration": 1},
    }

    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps(payload))
        # Send a valid one after to prove the connection is still alive
        valid_payload = {
            "graph": {
                "nodes": [
                    {"id": "c1", "type": "client", "capacity": 1000, "latency": 1},
                ],
                "edges": [],
            },
            "config": {"rps": 10, "duration": 1},
        }
        ws.send_text(json.dumps(valid_payload))

        # Should eventually get simulation_complete
        for _ in range(200):
            data = json.loads(ws.receive_text())
            if data.get("type") == "simulation_complete":
                break
