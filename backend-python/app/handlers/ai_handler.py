"""
AI design-generation handler — production-grade.

Improvements:
  - Shared httpx.AsyncClient via DI (connection pooling)
  - Retry with exponential backoff via tenacity (resilience)
  - Settings injected via Depends (testable)
  - Proper exception chaining (traceable)
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import Settings
from app.dependencies import get_current_settings, get_http_client
from app.models.ai_models import AIGeneratedGraph

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI"])

# ── Constants ───────────────────────────────────────────────────

VALID_NODE_TYPES = frozenset(
    ["client", "load_balancer", "api_server", "database", "cache", "cdn", "queue", "storage"]
)

SYSTEM_PROMPT = """\
You are a System Design Architect.
Return ONLY a valid JSON object. No markdown, no explanation outside JSON.

Allowed node types: client, load_balancer, api_server, database, cache, cdn, queue, storage.

Placement Logic (Absolute Coordinates):
- Clients: x=0, y=variable
- Entrance (CDN/LB): x=300, y=variable
- Processing (API): x=600, y=variable
- Storage/State (DB/Cache/Queue): x=900, y=variable

Node-type rules:
- cache and cdn nodes: set hit_ratio between 0.7 and 0.95 (realistic cache hit rate)
- database and storage nodes: set max_connections (typical: 100-500)
- queue nodes: set max_queue_depth (typical: 1000-10000)
- load_balancer nodes: set high capacity (10000+) and low latency (1-5ms)
- database nodes: set lower capacity (100-500) and higher latency (10-50ms)
- cache nodes: set very low latency (1-5ms) and high capacity (5000+)

JSON Schema:
{
  "nodes": [
    {
      "id": "string",
      "type": "string",
      "label": "string",
      "capacity": number,
      "latency": number,
      "position": {"x": number, "y": number},
      "hit_ratio": number,
      "max_connections": number,
      "max_queue_depth": number
    }
  ],
  "edges": [{"source": "string", "target": "string"}],
  "explanation": "string",
  "suggestions": ["string"]
}"""


# ── Request schema ──────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)


# ── Retry-wrapped LLM call ─────────────────────────────────────

class LLMTransientError(Exception):
    """Raised for retryable LLM API errors (429, 500, 502, 503, 504)."""


RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


@retry(
    retry=retry_if_exception_type((LLMTransientError, httpx.RequestError)),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    reraise=True,
)
async def _call_llm(
    client: httpx.AsyncClient,
    endpoint: str,
    api_key: str,
    payload: dict[str, Any],
) -> dict:
    """
    Call the LLM API with automatic retry on transient failures.

    Retries on: network errors, 429 (rate limit), 5xx (server errors).
    Does NOT retry on: 400/401/403 (client errors).
    """
    try:
        resp = await client.post(
            endpoint,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
    except httpx.RequestError as exc:
        logger.warning("LLM request failed (will retry): %s", exc)
        raise

    if resp.status_code in RETRYABLE_STATUS_CODES:
        logger.warning("LLM returned %d (will retry)", resp.status_code)
        raise LLMTransientError(f"LLM returned {resp.status_code}")

    if resp.status_code != 200:
        detail = resp.text
        logger.error("LLM API Error (Status %d): %s", resp.status_code, detail)
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"LLM API error: {detail}",
        )

    return resp.json()


# ── Endpoint ────────────────────────────────────────────────────


@router.post("/generate", response_model=AIGeneratedGraph)
async def generate_design(
    body: GenerateRequest,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    settings: Annotated[Settings, Depends(get_current_settings)],
) -> AIGeneratedGraph:
    """
    Generate a system architecture graph from a natural-language prompt.

    Uses the configured LLM (Grok/Groq) with automatic retry on
    transient failures.
    """
    if not settings.grok_api_key:
        raise HTTPException(status_code=500, detail="GROK_API_KEY is not set in environment")

    logger.info("Calling LLM with prompt: %.100s…", body.prompt)

    payload: dict[str, Any] = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": body.prompt},
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    try:
        data = await _call_llm(http_client, settings.xai_endpoint, settings.grok_api_key, payload)
    except LLMTransientError:
        raise HTTPException(status_code=502, detail="LLM service temporarily unavailable")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to connect to LLM service")

    choices = data.get("choices", [])
    if not choices:
        raise HTTPException(status_code=500, detail="No design generated by AI")

    content = choices[0]["message"]["content"]

    try:
        graph = AIGeneratedGraph.model_validate_json(content)
    except Exception as exc:
        logger.error("AI returned malformed JSON: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="AI returned malformed JSON structure",
        ) from exc

    _validate_architecture(graph)
    _apply_defaults(graph)

    logger.info("Generated graph: %d nodes, %d edges", len(graph.nodes), len(graph.edges))
    return graph


# ── Validation helpers ──────────────────────────────────────────


def _validate_architecture(graph: AIGeneratedGraph) -> None:
    """Raise HTTPException if the AI graph has invalid types or broken edges."""
    node_ids: set[str] = set()

    for node in graph.nodes:
        if node.type not in VALID_NODE_TYPES:
            raise HTTPException(
                status_code=422,
                detail=f"AI generated invalid architecture: invalid node type: {node.type}",
            )
        node_ids.add(node.id)

    for edge in graph.edges:
        if edge.source not in node_ids or edge.target not in node_ids:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"AI generated invalid architecture: broken edge: "
                    f"{edge.source} → {edge.target}"
                ),
            )


def _apply_defaults(graph: AIGeneratedGraph) -> None:
    """Fill in missing node-type-specific fields with sensible defaults."""
    for node in graph.nodes:
        if node.type in ("cache", "cdn") and not node.hit_ratio:
            node.hit_ratio = 0.8
        elif node.type in ("database", "storage") and not node.max_connections:
            node.max_connections = 100
        elif node.type == "queue" and not node.max_queue_depth:
            node.max_queue_depth = 5000
