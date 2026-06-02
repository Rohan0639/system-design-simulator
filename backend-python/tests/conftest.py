"""
Shared pytest fixtures for the test suite.

Centralizes:
  - Graph builders (avoid duplication across test files)
  - Engine runner helper
  - FastAPI test client
  - Settings override for tests
"""

from __future__ import annotations

import asyncio
import json
from queue import Queue

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import Settings, get_settings
from app.engine.simulation import SimulationEngine
from app.main import app
from app.models.graph import Edge, Graph, Node, NodeType, SimulationConfig, SimulationFrame


# ── Settings override for tests ─────────────────────────────────

def get_test_settings() -> Settings:
    """Settings with a dummy API key for testing."""
    return Settings(
        grok_api_key="test-key-12345",
        xai_endpoint="https://fake.api/v1/chat/completions",
        environment="dev",
        max_ws_connections=10,
    )


@pytest.fixture(autouse=True)
def override_settings():
    """
    Override settings and initialize app.state resources for all tests.

    The lifespan context manager doesn't fire during test client creation,
    so we manually set up the shared resources that handlers expect.
    """
    from app.dependencies import get_current_settings
    from app.handlers.connection_manager import ConnectionManager

    app.dependency_overrides[get_settings] = get_test_settings
    app.dependency_overrides[get_current_settings] = get_test_settings

    # Initialize app.state resources that lifespan would normally create
    if not hasattr(app.state, "http_client"):
        import httpx
        app.state.http_client = httpx.AsyncClient(timeout=10.0)
    if not hasattr(app.state, "ws_manager"):
        app.state.ws_manager = ConnectionManager(max_connections=10)

    yield
    app.dependency_overrides.clear()


# ── HTTP test client ────────────────────────────────────────────

@pytest.fixture
async def test_client():
    """Async httpx test client for API endpoint tests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ── Graph builders ──────────────────────────────────────────────

@pytest.fixture
def simple_graph() -> Graph:
    """Client → Cache → Database (standard 3-node test graph)."""
    return Graph(
        nodes=[
            Node(id="client-1", type=NodeType.CLIENT, capacity=10000, latency=1),
            Node(
                id="cache-1",
                type=NodeType.CACHE,
                capacity=5000,
                latency=2,
                hit_ratio=0.8,
            ),
            Node(
                id="db-1",
                type=NodeType.DATABASE,
                capacity=500,
                latency=20,
                max_connections=5,
            ),
        ],
        edges=[
            Edge(id="e1", source="client-1", target="cache-1"),
            Edge(id="e2", source="cache-1", target="db-1"),
        ],
    )


def build_simple_graph() -> Graph:
    """Non-fixture version for use in parameterized tests."""
    return Graph(
        nodes=[
            Node(id="client-1", type=NodeType.CLIENT, capacity=10000, latency=1),
            Node(id="cache-1", type=NodeType.CACHE, capacity=5000, latency=2, hit_ratio=0.8),
            Node(id="db-1", type=NodeType.DATABASE, capacity=500, latency=20, max_connections=5),
        ],
        edges=[
            Edge(id="e1", source="client-1", target="cache-1"),
            Edge(id="e2", source="cache-1", target="db-1"),
        ],
    )


# ── Engine runner ───────────────────────────────────────────────

async def run_engine(graph: Graph, config: SimulationConfig) -> list[SimulationFrame]:
    """
    Run the simulation engine (in a thread) and collect all frames.

    This adapts the thread-based engine API for async test usage.
    """
    engine = SimulationEngine(graph, config)
    frame_queue: Queue[SimulationFrame | None] = Queue(maxsize=100)

    # Run engine in a worker thread
    await asyncio.to_thread(engine.run, frame_queue)

    # Drain all frames
    frames: list[SimulationFrame] = []
    while not frame_queue.empty():
        item = frame_queue.get_nowait()
        if item is None:
            break
        frames.append(item)
    return frames


# ── Sample AI response fixture ──────────────────────────────────

@pytest.fixture
def sample_ai_response() -> dict:
    """A valid Grok/LLM response payload."""
    return {
        "choices": [
            {
                "message": {
                    "content": json.dumps(
                        {
                            "nodes": [
                                {
                                    "id": "client-1",
                                    "type": "client",
                                    "label": "User",
                                    "capacity": 10000,
                                    "latency": 1,
                                    "position": {"x": 0, "y": 100},
                                },
                                {
                                    "id": "lb-1",
                                    "type": "load_balancer",
                                    "label": "LB",
                                    "capacity": 10000,
                                    "latency": 2,
                                    "position": {"x": 300, "y": 100},
                                },
                            ],
                            "edges": [{"source": "client-1", "target": "lb-1"}],
                            "explanation": "Simple architecture",
                            "suggestions": ["Add caching"],
                        }
                    )
                }
            }
        ]
    }
