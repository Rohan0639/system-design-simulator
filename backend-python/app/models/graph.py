"""
Core domain models for the simulation graph.

Production hardening:
  - SimulationConfig has upper bounds to prevent DoS
  - Node model has cross-field validators
  - Status uses Literal type for compile-time safety
"""

from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class NodeType(str, Enum):
    """System component types supported by the simulation engine."""

    CLIENT = "client"
    LOAD_BALANCER = "load_balancer"
    API_SERVER = "api_server"
    DATABASE = "database"
    CACHE = "cache"
    CDN = "cdn"
    QUEUE = "queue"
    STORAGE = "storage"


NodeStatusValue = Literal["ok", "warning", "overloaded"]


class Node(BaseModel):
    """
    A single component in the architecture graph.

    Attributes:
        id:               Unique identifier.
        type:             One of the NodeType enum values.
        capacity:         Max requests-per-second this node can handle.
        latency:          Base processing latency in milliseconds.
        status:           Runtime health indicator.
        hit_ratio:        Cache/CDN hit probability (0.0–1.0).
        max_connections:  Database/Storage connection-pool ceiling.
        max_queue_depth:  Queue backlog limit before dropping.
    """

    id: str
    type: NodeType
    capacity: int = Field(default=0, ge=0)
    latency: int = Field(default=0, ge=0)
    status: str = "ok"

    # Node-type-specific fields
    hit_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_connections: Optional[int] = Field(default=None, ge=0)
    max_queue_depth: Optional[int] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_type_specific_fields(self) -> Node:
        """Warn if type-specific fields are set on the wrong node type."""
        if self.hit_ratio is not None and self.type not in (NodeType.CACHE, NodeType.CDN):
            # Silently ignore — don't crash, just won't be used
            pass
        return self


class Edge(BaseModel):
    """Directed connection between two nodes."""

    id: str = ""
    source: str
    target: str


class Graph(BaseModel):
    """The full architecture topology sent over WebSocket."""

    nodes: list[Node]
    edges: list[Edge]

    @model_validator(mode="after")
    def validate_edge_references(self) -> Graph:
        """Ensure all edges reference existing node IDs."""
        node_ids = {n.id for n in self.nodes}
        for edge in self.edges:
            if edge.source not in node_ids:
                raise ValueError(f"Edge source '{edge.source}' not found in nodes")
            if edge.target not in node_ids:
                raise ValueError(f"Edge target '{edge.target}' not found in nodes")
        return self


class SimulationConfig(BaseModel):
    """
    Parameters controlling a simulation run.

    Upper bounds prevent denial-of-service via absurd configs:
      - max RPS = 100,000 (prevents billion-event heap)
      - max duration = 300s (prevents runaway simulations)
    """

    rps: int = Field(..., gt=0, le=100_000, description="Requests per second to inject")
    duration: int = Field(..., gt=0, le=300, description="Duration in seconds")


class NodeStatus(BaseModel):
    """
    Per-node metrics at a point in simulated time.

    Optional fields use ``exclude_none`` when serializing so the JSON
    stays lean — same semantics as Go's ``omitempty``.
    """

    id: str
    status: str = "ok"
    current_rps: int = 0
    peak_rps: int = 0
    is_entry_node: bool = False
    avg_latency: int = 0
    queue_depth: Optional[int] = None
    cache_hits: Optional[int] = None
    cache_misses: Optional[int] = None
    connections: Optional[int] = None
    dropped_reqs: Optional[int] = None

    model_config = {"populate_by_name": True}


class SimulationFrame(BaseModel):
    """A single telemetry snapshot streamed back to the client."""

    nodes: list[NodeStatus]
    time: int  # relative time in ms
