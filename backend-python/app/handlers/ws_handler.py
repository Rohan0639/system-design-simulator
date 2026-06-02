"""
WebSocket handler for real-time simulation streaming — production-grade.

Improvements:
  - ConnectionManager for tracking + limiting active connections
  - Engine runs in a worker thread (doesn't block event loop)
  - Cooperative cancellation via engine.cancel()
  - Proper error propagation to client
  - Clean shutdown on disconnect
"""

from __future__ import annotations

import asyncio
import json
import logging
from queue import Empty, Queue

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.engine.simulation import SimulationEngine
from app.handlers.connection_manager import ConnectionManager
from app.models.graph import Graph, SimulationConfig, SimulationFrame

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """
    Accept a WebSocket connection and stream simulation frames.

    Protocol:
      1. Client sends JSON: ``{"graph": {...}, "config": {"rps": N, "duration": S}}``
      2. Server streams ``SimulationFrame`` JSON objects back.
      3. When the simulation finishes, server sends ``{"type": "simulation_complete"}``.
      4. Client may send a new graph at any time — the previous simulation is cancelled.
    """
    manager: ConnectionManager = ws.app.state.ws_manager

    async with manager.connect(ws):
        current_task: asyncio.Task | None = None
        current_engine: SimulationEngine | None = None

        try:
            while True:
                raw = await ws.receive_text()

                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    await ws.send_json({"type": "error", "detail": "Invalid JSON"})
                    continue

                # Parse graph + config
                try:
                    graph = Graph.model_validate(data.get("graph", {}))
                    config = SimulationConfig.model_validate(data.get("config", {}))
                except Exception as exc:
                    await ws.send_json({"type": "error", "detail": f"Validation error: {exc}"})
                    continue

                if not graph.nodes:
                    logger.info("Empty graph received, skipping")
                    continue

                logger.info(
                    "Starting simulation: %d nodes, %d RPS, %ds",
                    len(graph.nodes),
                    config.rps,
                    config.duration,
                )

                # Cancel any previous running simulation
                if current_engine:
                    current_engine.cancel()
                if current_task and not current_task.done():
                    current_task.cancel()
                    try:
                        await current_task
                    except asyncio.CancelledError:
                        pass

                # Launch new simulation
                engine = SimulationEngine(graph, config)
                current_engine = engine
                current_task = asyncio.create_task(
                    _run_simulation(ws, engine)
                )

        except WebSocketDisconnect:
            logger.info("Client disconnected")
        except Exception as exc:
            logger.error("Unexpected WebSocket error: %s", exc)
        finally:
            # Clean shutdown: cancel engine + task
            if current_engine:
                current_engine.cancel()
            if current_task and not current_task.done():
                current_task.cancel()
                try:
                    await current_task
                except asyncio.CancelledError:
                    pass


async def _run_simulation(ws: WebSocket, engine: SimulationEngine) -> None:
    """
    Run the simulation engine in a worker thread and stream frames
    to the WebSocket from the async event loop.

    Architecture:
      - Engine runs in ``asyncio.to_thread()`` (CPU-bound, doesn't block event loop)
      - Frames pushed to a ``queue.Queue`` (thread-safe)
      - This coroutine drains the queue and writes to WebSocket (async)
    """
    frame_queue: Queue[SimulationFrame | None] = Queue(maxsize=10)

    # Run the engine in a worker thread
    engine_task = asyncio.get_event_loop().run_in_executor(
        None, engine.run, frame_queue
    )

    try:
        while True:
            # Non-blocking drain: poll the thread-safe queue from async context
            try:
                frame = await asyncio.to_thread(frame_queue.get, timeout=2.0)
            except Empty:
                # Check if engine thread is still alive
                if engine_task.done():
                    break
                continue

            if frame is None:
                # Simulation complete
                await ws.send_json({"type": "simulation_complete"})
                return

            await ws.send_text(frame.model_dump_json(exclude_none=True))

    except asyncio.CancelledError:
        logger.info("Simulation streaming cancelled")
        engine.cancel()
        raise
    except Exception as exc:
        logger.error("Error streaming to WebSocket: %s", exc)
        engine.cancel()
        # Notify the client about the error
        try:
            await ws.send_json({"type": "error", "detail": "Simulation error occurred"})
        except Exception:
            pass  # client already gone
    finally:
        # Ensure engine thread stops
        engine.cancel()
        try:
            await engine_task
        except Exception:
            pass
