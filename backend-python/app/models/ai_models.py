"""
Models for AI-generated system designs (Grok/LLM responses).

Go → Python mapping:
  - Go nested struct `XPosition` → Pydantic `XPosition` model
  - Go AINode/AIEdge/AIGeneratedGraph → Pydantic models with Optional fields
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class XPosition(BaseModel):
    """2D canvas coordinate for frontend node placement."""

    x: float
    y: float


class AINode(BaseModel):
    """A node as returned by the AI design endpoint."""

    id: str
    type: str
    label: str
    capacity: int = 0
    latency: int = 0
    position: XPosition

    # Node-type-specific fields the AI can set
    hit_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_connections: Optional[int] = Field(default=None, ge=0)
    max_queue_depth: Optional[int] = Field(default=None, ge=0)


class AIEdge(BaseModel):
    """Edge in the AI-generated graph."""

    source: str
    target: str


class AIGeneratedGraph(BaseModel):
    """Complete response from the AI design generation endpoint."""

    nodes: list[AINode]
    edges: list[AIEdge]
    explanation: str = ""
    suggestions: list[str] = Field(default_factory=list)
