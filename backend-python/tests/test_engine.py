"""
Pytest test suite for the simulation engine.

Tests:
  1. Engine runs without crashing
  2. High RPS completes without errors
  3. Engine emits telemetry frames
  4. Database hard-rejects when connections exceeded
  5. Cache hit/miss ratio is within expected bounds
  6. Low RPS keeps all nodes healthy
  7. Engine supports cooperative cancellation
  8. SimulationConfig rejects absurd values (DoS prevention)
"""

from __future__ import annotations

import asyncio
from queue import Queue

import pytest

from app.engine.simulation import SimulationEngine
from app.models.graph import Edge, Graph, Node, NodeType, SimulationConfig, SimulationFrame
from tests.conftest import build_simple_graph, run_engine


# ── TEST 1: Engine runs without crashing ────────────────────────

@pytest.mark.asyncio
async def test_engine_runs_without_crash():
    """Most basic sanity check — does it start and finish?"""
    graph = build_simple_graph()
    config = SimulationConfig(rps=100, duration=2)
    frames = await asyncio.wait_for(run_engine(graph, config), timeout=10.0)
    assert frames is not None


# ── TEST 2: High RPS completes ──────────────────────────────────

@pytest.mark.asyncio
async def test_high_rps_completes():
    """Engine handles 1000 RPS without errors."""
    graph = build_simple_graph()
    config = SimulationConfig(rps=1000, duration=2)
    frames = await asyncio.wait_for(run_engine(graph, config), timeout=15.0)
    assert len(frames) > 0


# ── TEST 3: Engine emits frames ────────────────────────────────

@pytest.mark.asyncio
async def test_engine_emits_frames():
    """Engine should stream at least 1 telemetry frame."""
    graph = build_simple_graph()
    config = SimulationConfig(rps=200, duration=2)
    frames = await asyncio.wait_for(run_engine(graph, config), timeout=10.0)
    assert len(frames) > 0, "Engine ran but emitted zero frames"


# ── TEST 4: Database rejects when connections exceeded ──────────

@pytest.mark.asyncio
async def test_database_rejects_over_capacity():
    """MaxConnections = 5, sending 500 RPS → should see dropped requests."""
    graph = Graph(
        nodes=[
            Node(id="client-1", type=NodeType.CLIENT, capacity=10000, latency=1),
            Node(
                id="db-1",
                type=NodeType.DATABASE,
                capacity=50,
                latency=20,
                max_connections=5,
            ),
        ],
        edges=[Edge(id="e1", source="client-1", target="db-1")],
    )
    config = SimulationConfig(rps=500, duration=2)
    frames = await asyncio.wait_for(run_engine(graph, config), timeout=15.0)

    assert frames, "No frames received"
    last_frame = frames[-1]

    db_dropped = any(
        n.id == "db-1" and (n.dropped_reqs or 0) > 0
        for n in last_frame.nodes
    )
    assert db_dropped, "DB should have dropped requests but DroppedReqs = 0"


# ── TEST 5: Cache hit/miss ratio ───────────────────────────────

@pytest.mark.asyncio
async def test_cache_hit_miss_ratio():
    """Hit ratio stays within 15% of configured 0.8."""
    graph = Graph(
        nodes=[
            Node(id="client-1", type=NodeType.CLIENT, capacity=10000, latency=1),
            Node(id="cache-1", type=NodeType.CACHE, capacity=5000, latency=2, hit_ratio=0.8),
        ],
        edges=[Edge(id="e1", source="client-1", target="cache-1")],
    )
    config = SimulationConfig(rps=300, duration=3)
    frames = await asyncio.wait_for(run_engine(graph, config), timeout=15.0)

    assert frames, "No frames received"
    last_frame = frames[-1]

    for node in last_frame.nodes:
        if node.id == "cache-1":
            hits = node.cache_hits or 0
            misses = node.cache_misses or 0
            total = hits + misses
            assert total > 0, "Cache processed zero requests"
            actual_ratio = hits / total
            assert 0.65 <= actual_ratio <= 0.95, (
                f"Hit ratio {actual_ratio:.2f} outside expected range [0.65, 0.95]"
            )
            break


# ── TEST 6: Low RPS stays healthy ──────────────────────────────

@pytest.mark.asyncio
async def test_low_rps_stays_healthy():
    """All nodes should remain healthy under very low load (10 RPS)."""
    graph = build_simple_graph()
    config = SimulationConfig(rps=10, duration=2)
    frames = await asyncio.wait_for(run_engine(graph, config), timeout=10.0)

    assert frames, "No frames received"
    last_frame = frames[-1]

    for node in last_frame.nodes:
        assert node.status != "overloaded", (
            f"Node {node.id} is overloaded under 10 RPS"
        )


# ── TEST 7: Cooperative cancellation ───────────────────────────

@pytest.mark.asyncio
async def test_engine_cancellation():
    """Engine should stop early when cancel() is called."""
    graph = build_simple_graph()
    config = SimulationConfig(rps=1000, duration=30)  # long simulation

    engine = SimulationEngine(graph, config)
    frame_queue: Queue[SimulationFrame | None] = Queue(maxsize=50)

    async def cancel_after_delay():
        await asyncio.sleep(0.5)
        engine.cancel()

    # Start cancellation timer and engine concurrently
    cancel_task = asyncio.create_task(cancel_after_delay())
    await asyncio.to_thread(engine.run, frame_queue)
    await cancel_task

    # Engine should have stopped — not all 30s of events processed
    assert engine.is_cancelled, "Engine should be cancelled"


# ── TEST 8: SimulationConfig rejects absurd values ──────────────

def test_config_rejects_excessive_rps():
    """RPS over 100,000 should be rejected (DoS prevention)."""
    with pytest.raises(Exception):  # Pydantic ValidationError
        SimulationConfig(rps=999_999, duration=1)


def test_config_rejects_excessive_duration():
    """Duration over 300s should be rejected."""
    with pytest.raises(Exception):
        SimulationConfig(rps=100, duration=999)


def test_config_rejects_zero_rps():
    """RPS must be > 0."""
    with pytest.raises(Exception):
        SimulationConfig(rps=0, duration=1)
