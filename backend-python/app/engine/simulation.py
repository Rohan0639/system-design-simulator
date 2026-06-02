"""
Discrete-event simulation engine — production-grade.

Design decisions:
──────────────────────────────────────────────────────────────────
  Problem                          │  Solution
  ─────────────────────────────────┼──────────────────────────────
  CPU-bound DES loop blocks the    │  Run in asyncio.to_thread()
  asyncio event loop, freezing     │  so the event loop stays
  all other requests.              │  responsive.
                                   │
  No way to cancel a running       │  threading.Event flag checked
  simulation when client sends     │  every N events — cooperative
  a new graph or disconnects.      │  cancellation.
                                   │
  Magic numbers scattered          │  Named constants at module
  throughout the code.             │  level.
                                   │
  _seq=0 always overwritten        │  _create_event() factory
  in _push_event — confusing API.  │  encapsulates sequencing.
──────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import heapq
import logging
import random
import threading
import time
from dataclasses import dataclass, field
from queue import Full, Queue
from typing import Optional

from app.models.graph import (
    Graph,
    Node,
    NodeStatus,
    NodeType,
    SimulationConfig,
    SimulationFrame,
)

logger = logging.getLogger(__name__)

# ── Named constants (Fix #12: no more magic numbers) ────────────
MICROSECONDS_PER_SECOND = 1_000_000
TELEMETRY_INTERVAL_US = 100_000       # emit a frame every 100ms of sim-time
FRAME_SLEEP_SECONDS = 0.01            # real-time pacing between frames
RPS_DECAY_FACTOR = 5                  # keep 1/5 of previous RPS each second
DEFAULT_CACHE_HIT_RATIO = 0.8
CANCEL_CHECK_INTERVAL = 500           # check cancellation every N events


# ── Event types ──────────────────────────────────────────────────

class EventType:
    REQUEST_ARRIVE = "request_arrive"
    REQUEST_DONE = "request_done"


@dataclass(order=True)
class Event:
    """
    A scheduled event in the priority queue.

    Ordering: ``time`` first, then ``_seq`` (FIFO tie-breaker).
    """

    time: int
    _seq: int = field(compare=True, repr=False)
    type: str = field(compare=False, default=EventType.REQUEST_ARRIVE)
    node_id: str = field(compare=False, default="")
    request_id: str = field(compare=False, default="")


# ── Per-node metrics ────────────────────────────────────────────

@dataclass
class NodeMetrics:
    """Mutable counters attached to each graph node."""

    current_rps: int = 0
    peak_rps: int = 0
    avg_latency: int = 0
    queue_depth: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    connections: int = 0
    dropped_reqs: int = 0
    status: str = "ok"


class SimulationCancelled(Exception):
    """Raised when the simulation is cooperatively cancelled."""


# ── Simulation engine ───────────────────────────────────────────

class SimulationEngine:
    """
    Processes a system-design graph through a discrete-event simulation.

    The engine is **thread-safe**: it runs in a worker thread via
    ``asyncio.to_thread()`` and pushes frames into a ``queue.Queue``
    that the async WebSocket handler drains.

    Usage::

        engine = SimulationEngine(graph, config)
        frame_queue = queue.Queue(maxsize=10)

        # In a worker thread:
        engine.run(frame_queue)

        # In the async handler:
        frame = await asyncio.to_thread(frame_queue.get)
    """

    def __init__(self, graph: Graph, config: SimulationConfig) -> None:
        self.graph = graph
        self.config = config
        self._events: list[Event] = []
        self._seq = 0
        self._metrics: dict[str, NodeMetrics] = {}
        self._entry_node_id: str = ""
        self._node_index: dict[str, Node] = {}
        self._edge_index: dict[str, list] = {}
        self._cancel_event = threading.Event()

        # Pre-build O(1) lookup structures
        for node in graph.nodes:
            self._metrics[node.id] = NodeMetrics()
            self._node_index[node.id] = node
            if node.type == NodeType.LOAD_BALANCER:
                self._entry_node_id = node.id

        for edge in graph.edges:
            self._edge_index.setdefault(edge.source, []).append(edge)

    # ── Public API ───────────────────────────────────────────────

    def cancel(self) -> None:
        """Signal the engine to stop at the next check point."""
        self._cancel_event.set()

    @property
    def is_cancelled(self) -> bool:
        return self._cancel_event.is_set()

    def run(self, frame_queue: Queue) -> None:
        """
        Execute the full simulation (blocking, thread-safe).

        Pushes ``SimulationFrame`` objects into *frame_queue*.
        Pushes ``None`` as a sentinel when done.

        Call ``engine.cancel()`` from another thread to stop early.
        """
        try:
            self._seed_traffic()
            self._process_events(frame_queue)
        except SimulationCancelled:
            logger.info("Simulation cancelled after %d events processed", self._seq)
        finally:
            # Sentinel: signals consumer the simulation is done
            try:
                frame_queue.put(None, timeout=1.0)
            except Full:
                pass  # consumer already gone

    # ── Internal ─────────────────────────────────────────────────

    def _create_event(self, time: int, node_id: str, type: str = EventType.REQUEST_ARRIVE) -> None:
        """Create an event with auto-incrementing sequence number and push it."""
        self._seq += 1
        heapq.heappush(
            self._events,
            Event(time=time, _seq=self._seq, type=type, node_id=node_id),
        )

    def _seed_traffic(self) -> None:
        """Generate initial request-arrive events from client nodes."""
        for node in self.graph.nodes:
            if node.type == NodeType.CLIENT:
                interval = MICROSECONDS_PER_SECOND // self.config.rps
                t = 0
                end = self.config.duration * MICROSECONDS_PER_SECOND
                while t < end:
                    self._create_event(time=t, node_id=node.id)
                    t += interval

    def _process_events(self, frame_queue: Queue) -> None:
        """Drain the event heap, emitting telemetry periodically."""
        current_time = 0
        last_update = 0
        last_rps_reset = 0
        events_since_cancel_check = 0

        while self._events:
            event = heapq.heappop(self._events)
            current_time = event.time

            # ── Cooperative cancellation check ───────────────────
            events_since_cancel_check += 1
            if events_since_cancel_check >= CANCEL_CHECK_INTERVAL:
                events_since_cancel_check = 0
                if self.is_cancelled:
                    raise SimulationCancelled()

            # Smooth RPS reset every simulated second (keep 1/N)
            if current_time - last_rps_reset >= MICROSECONDS_PER_SECOND:
                for m in self._metrics.values():
                    m.current_rps = m.current_rps // RPS_DECAY_FACTOR
                last_rps_reset = current_time

            self._handle_event(event, current_time)

            # Emit a telemetry frame at regular intervals
            if current_time - last_update > TELEMETRY_INTERVAL_US:
                frame = SimulationFrame(
                    time=current_time // 1000,
                    nodes=self._get_current_status(),
                )
                try:
                    frame_queue.put(frame, timeout=1.0)
                except Full:
                    logger.warning("Frame queue full — dropping telemetry frame")
                last_update = current_time
                time.sleep(FRAME_SLEEP_SECONDS)  # real-time pacing

        # Final frame
        final = SimulationFrame(
            time=current_time // 1000,
            nodes=self._get_current_status(),
        )
        try:
            frame_queue.put(final, timeout=1.0)
        except Full:
            pass

    # ── Event dispatch ───────────────────────────────────────────

    def _handle_event(self, event: Event, current_time: int) -> None:
        node = self._node_index.get(event.node_id)
        if node is None:
            return
        if event.type == EventType.REQUEST_ARRIVE:
            self._process_arrival(node, event, current_time)

    def _process_arrival(self, node: Node, event: Event, current_time: int) -> None:
        m = self._metrics[node.id]
        m.current_rps += 1
        rps = m.current_rps

        # Track peak (never resets)
        if rps > m.peak_rps:
            m.peak_rps = rps

        node_type = node.type

        # ── Cache / CDN ──────────────────────────────────────────
        if node_type in (NodeType.CACHE, NodeType.CDN):
            hit_ratio = node.hit_ratio or DEFAULT_CACHE_HIT_RATIO
            if random.random() < hit_ratio:
                m.cache_hits += 1
                m.avg_latency = node.latency
                self._update_status(m, rps, node)
                return  # cache hit — do NOT forward
            # cache miss
            m.cache_misses += 1
            m.avg_latency = node.latency * 3
            self._update_status(m, rps, node)
            self._forward_to_next_node(node, event, current_time, node.latency * 3)
            return

        # ── Database / Storage ───────────────────────────────────
        if node_type in (NodeType.DATABASE, NodeType.STORAGE):
            max_conn = node.max_connections or node.capacity
            m.connections += 1
            if rps > max_conn:
                m.dropped_reqs += 1
                m.status = "overloaded"
                m.avg_latency = node.latency * 4
                return

        # ── Queue ────────────────────────────────────────────────
        elif node_type == NodeType.QUEUE:
            max_depth = node.max_queue_depth or node.capacity
            m.queue_depth += 1
            if m.queue_depth > max_depth:
                m.dropped_reqs += 1
                m.queue_depth -= 1
                m.status = "overloaded"
                return
            m.avg_latency = node.latency + (m.queue_depth * 2)

        # ── Load Balancer ────────────────────────────────────────
        elif node_type == NodeType.LOAD_BALANCER:
            m.avg_latency = node.latency

        # ── Client / API Server / default ────────────────────────
        else:
            m.avg_latency = node.latency

        self._update_status(m, rps, node)
        self._forward_to_next_node(node, event, current_time, m.avg_latency)

    # ── Helpers ──────────────────────────────────────────────────

    @staticmethod
    def _update_status(m: NodeMetrics, rps: int, node: Node) -> None:
        """Set ok / warning / overloaded and adjust latency."""
        if rps > node.capacity:
            m.status = "overloaded"
            m.avg_latency = node.latency * 2
        elif rps > node.capacity // 2:
            m.status = "warning"
            m.avg_latency = int(node.latency * 1.2)
        else:
            m.status = "ok"

    def _forward_to_next_node(
        self,
        node: Node,
        event: Event,
        current_time: int,
        latency_ms: int,
    ) -> None:
        """Schedule a request-arrive event on a downstream node."""
        edges = self._edge_index.get(node.id, [])
        if not edges:
            return

        if node.type == NodeType.LOAD_BALANCER:
            rps = self._metrics[node.id].current_rps
            target_edge = edges[rps % len(edges)]
        else:
            target_edge = random.choice(edges)

        self._create_event(
            time=current_time + latency_ms * 1000,
            node_id=target_edge.target,
        )

    def _get_current_status(self) -> list[NodeStatus]:
        """Build a snapshot of all node metrics."""
        return [
            NodeStatus(
                id=node_id,
                status=m.status,
                current_rps=m.current_rps,
                peak_rps=m.peak_rps,
                is_entry_node=(node_id == self._entry_node_id),
                avg_latency=m.avg_latency,
                queue_depth=m.queue_depth or None,
                cache_hits=m.cache_hits or None,
                cache_misses=m.cache_misses or None,
                connections=m.connections or None,
                dropped_reqs=m.dropped_reqs or None,
            )
            for node_id, m in self._metrics.items()
        ]
